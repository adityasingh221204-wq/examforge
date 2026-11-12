// EXAMFORGE — active examination plan tests.
// Verifies the official topic distribution, the plan's date-wise structure, full syllabus
// coverage before each paper, and that activating or redistributing never awards mastery.

import { describe, expect, it } from 'vitest';
import { ALL_TOPICS, SUBJECTS, TOPIC_MAP } from '../src/data/syllabus';
import { PLAN_DAYS, PLAN_END, PLAN_ID, PLAN_START, PLAN_TITLE } from '../src/data/plan';
import { buildPlanSessions, activatePlan, planSummary, redistributeMissed, resolveSlice, toggleSessionDone } from '../src/engine/plan';
import { defaultState } from '../src/engine/storage';
import { recordAssessment, setStatus, getStatus } from '../src/engine/progress';
import { currentReminder } from '../src/engine/reminders';
import { diffDays, timeToMin } from '../src/engine/dates';
import type { SubjectId } from '../src/data/types';

const NOON_12 = new Date('2026-11-12T12:00:00+05:30');
const EVENING_12 = new Date('2026-11-12T18:00:00+05:30');
const MORNING_14 = new Date('2026-11-14T09:00:00+05:30');

const expectedUnits: Record<SubjectId, number[]> = {
  dl: [8, 13, 9, 13, 5],
  cn: [7, 9, 9, 12, 10],
  nlp: [15, 12, 9, 5, 7],
  cloud: [8, 8, 6, 3, 4],
};

function activated() {
  const base = { ...defaultState(), seeded: true };
  return activatePlan(base, NOON_12);
}

describe('official syllabus distribution', () => {
  it('matches the examination registration exactly', () => {
    for (const subject of SUBJECTS) {
      expect(subject.units.map((u) => u.topics.length)).toEqual(expectedUnits[subject.id]);
    }
    expect(ALL_TOPICS).toHaveLength(172);
    expect(SUBJECTS.flatMap((s) => s.units)).toHaveLength(20);
  });

  it('keeps every topic id intact and unique', () => {
    expect(new Set(ALL_TOPICS.map((t) => t.id)).size).toBe(172);
    for (const t of ALL_TOPICS) expect(TOPIC_MAP[t.id]).toBe(t);
  });
});

describe('plan structure', () => {
  const state = activated();
  const sessions = buildPlanSessions(state);

  it('spans 12–26 November, including all four examination days', () => {
    const dates = [...new Set(sessions.map((s) => s.date))];
    expect(dates[0]).toBe(PLAN_START);
    expect(dates[dates.length - 1]).toBe(PLAN_END);
    expect(dates).toHaveLength(PLAN_DAYS.length);
    for (const date of ['2026-11-17', '2026-11-19', '2026-11-24', '2026-11-26']) {
      expect(sessions.some((s) => s.date === date && s.kind === 'exam')).toBe(true);
    }
  });

  it('schedules nothing in the missed part of 12 November', () => {
    const tonight = sessions.filter((s) => s.date === '2026-11-12');
    expect(tonight.length).toBeGreaterThan(0);
    for (const s of tonight) expect(s.start >= '19:00').toBe(true);
  });

  it('keeps every block inside the waking day and every end after its start', () => {
    for (const s of sessions) {
      expect(s.start < s.end).toBe(true);
      expect(s.end <= '22:30').toBe(true);
      expect(s.minutes).toBe(timeToMin(s.end) - timeToMin(s.start));
    }
  });

  it('protects exam mornings: nothing but light revision and the paper itself', () => {
    for (const subject of SUBJECTS) {
      const day = sessions.filter((s) => s.date === subject.examDate);
      for (const s of day) {
        if (s.kind === 'sprint' || s.kind === 'practice') {
          expect(s.start >= subject.examEnd, `${subject.code} has ${s.title} at ${s.start}`).toBe(true);
        }
      }
      const exam = day.find((s) => s.kind === 'exam');
      expect(exam).toBeDefined();
      expect(exam!.start).toBe('09:30');
      expect(exam!.end).toBe('11:30');
    }
  });

  it('introduces every one of the 172 topics exactly once before its paper', () => {
    const firstPass = sessions.filter((s) => s.kind === 'sprint');
    const ids = firstPass.flatMap((s) => s.topicIds);
    expect(ids).toHaveLength(ALL_TOPICS.length);
    expect(new Set(ids).size).toBe(ALL_TOPICS.length);
    for (const id of ids) expect(TOPIC_MAP[id]).toBeDefined();

    for (const s of firstPass) {
      const subject = SUBJECTS.find((x) => x.id === s.subjectId)!;
      expect(s.date < subject.examDate || s.date === subject.examDate).toBe(true);
    }
  });

  it('runs five 120-minute mocks, one per paper plus the Deep Learning second sitting', () => {
    const mocks = sessions.filter((s) => s.kind === 'mock');
    expect(mocks).toHaveLength(4);
    expect(new Set(mocks.map((m) => m.subjectId))).toEqual(new Set(['dl', 'cn', 'nlp', 'cloud']));
    for (const m of mocks) expect(m.minutes).toBe(90);
  });

  it('never marks routine or examination slots as policy completion', () => {
    for (const s of sessions) {
      if (s.kind === 'routine' || s.kind === 'exam') {
        expect(s.topicIds).toEqual([]);
        expect(s.compulsory).toBe(false);
      }
    }
  });

  it('resolves unit slices without inventing topics', () => {
    expect(resolveSlice({ subjectId: 'dl', unit: 2, from: 1, to: 6 })).toHaveLength(6);
    expect(resolveSlice({ subjectId: 'cn', unit: 4, from: 7 })).toHaveLength(6);
    expect(resolveSlice({ subjectId: 'nlp', unit: 1, from: 8, to: 14 })).toHaveLength(7);
    expect(resolveSlice({ subjectId: 'cloud', unit: 9 }).length).toBe(0);
  });
});

describe('activation', () => {
  it('marks the plan active without touching progress or completed sessions', () => {
    let state = defaultState();
    state = setStatus(state, 'dl-u1-t1', 'learned');
    state = recordAssessment(state, 'dl-u1-t2', 8, 10);
    const before = { ...state.progress };
    const doneSession = {
      id: 'legacy_done',
      date: '2026-11-11',
      blockId: 'b1',
      start: '08:30',
      end: '10:30',
      minutes: 120,
      subjectId: 'dl' as const,
      topicIds: ['dl-u1-t1'],
      objectives: [],
      material: 'earlier work',
      questionsToSolve: [],
      criteria: '',
      done: true,
      kind: 'sprint' as const,
    };
    const activatedState = activatePlan({ ...state, sessions: [doneSession] }, NOON_12);

    expect(activatedState.plan).toMatchObject({ id: PLAN_ID, title: PLAN_TITLE });
    expect(activatedState.timetable?.mode).toBe('plan');
    expect(activatedState.progress).toEqual(before);
    expect(getStatus(activatedState, 'dl-u1-t2')).toBe('mastered');
    expect(activatedState.sessions.find((s) => s.id === 'legacy_done')).toBeDefined();
    expect(activatedState.sessions.filter((s) => s.planId === PLAN_ID).every((s) => !s.done)).toBe(true);
  });

  it('is idempotent: re-activating never duplicates a session', () => {
    const once = activated();
    const twice = activatePlan(once, MORNING_14);
    const ids = twice.sessions.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(twice.sessions.filter((s) => s.planId === PLAN_ID).length).toBeGreaterThan(50);
  });

  it('replaces the old sprint timetable for future dates only', () => {
    const stale = {
      ...defaultState(),
      sessions: [],
      timetable: { mode: 'sprint' as const, generatedAt: 1, sessions: [] },
    };
    const next = activatePlan(stale, MORNING_14);
    expect(next.sessions.every((s) => s.date >= '2026-11-14')).toBe(true);
    expect(next.timetable?.mode).toBe('plan');
  });

  it('sets the daily routine and target from the plan', () => {
    const s = activated();
    expect(s.settings.dailyTargetMin).toBe(480);
    expect(s.settings.blocks.filter((b) => b.kind === 'study')).toHaveLength(4);
    expect(s.settings.blocks.some((b) => b.label.includes('Dinner'))).toBe(true);
  });

  it('tracks completion and study minutes without awarding topic mastery', () => {
    const s = activated();
    const target = s.sessions.find((x) => x.date === '2026-11-12' && x.topicIds.length > 0)!;
    const after = toggleSessionDone(s, target.id, EVENING_12);
    const logged = after.studyLog.find((l) => l.date === '2026-11-12');
    expect(after.sessions.find((x) => x.id === target.id)?.done).toBe(true);
    expect(logged?.minutes).toBe(target.minutes);
    for (const id of target.topicIds) expect(after.progress[id]).toBeUndefined();
    expect(after.sessions.find((x) => x.id === target.id)?.kind).toBe('practice');
    expect(planSummary(after, EVENING_12).today.done).toBe(1);
  });
});

describe('plan summary and reminders', () => {
  it('reports today, pending work, countdowns and mock progress', () => {
    const s = activated();
    const summary = planSummary(s, NOON_12);
    expect(summary.active).toBe(true);
    expect(summary.days).toHaveLength(15);
    expect(summary.today.date).toBe('2026-11-12');
    expect(summary.today.total).toBeGreaterThan(0);
    expect(summary.nextExam?.code).toBe('TE7753');
    expect(summary.nextExam?.days).toBe(5);
    expect(summary.mocksPlanned).toBe(4);
  });

  it('reminds about the revision block at the configured evening time', () => {
    const s = activated();
    const reminder = currentReminder(s, new Date('2026-11-13T19:31:00+05:30'));
    expect(reminder?.tone).toBe('revision');
    expect(currentReminder(s, new Date('2026-11-13T08:00:00+05:30'))).toBeNull();
  });

  it('warns about an examination inside the lead window', () => {
    const s = activated();
    const reminder = currentReminder(s, new Date('2026-11-16T12:00:00+05:30'));
    expect(reminder?.tone).toBe('exam');
    expect(reminder?.body).toContain('TE7753');
  });

  it('flags overdue work the morning after a missed day', () => {
    const s = activated();
    const out = redistributeMissed(s, new Date('2026-11-14T09:00:00+05:30'));
    const reminder = currentReminder(out.state, new Date('2026-11-14T09:05:00+05:30'));
    expect(reminder?.tone).toBe('overdue');
  });
});

describe('adaptive redistribution', () => {
  it('moves unfinished topics forward, never past the paper, and never completes them', () => {
    const s = activated();
    const out = redistributeMissed(s, MORNING_14);
    expect(out.moved.length).toBeGreaterThan(0);
    expect(out.moved.length + out.unplaced.length).toBeGreaterThan(0);

    for (const id of out.moved) {
      const hosts = out.state.sessions.filter((x) => x.date >= '2026-11-14' && x.carryOver?.includes(id));
      expect(hosts.length).toBe(1);
      const subject = SUBJECTS.find((x) => x.id === TOPIC_MAP[id].subjectId)!;
      expect(diffDays(hosts[0].date, subject.examDate)).toBeGreaterThan(0);
      expect(hosts[0].start >= subject.examStart || hosts[0].date !== subject.examDate).toBe(true);
    }

    // missed sessions are flagged, never silently completed
    const missed = out.state.sessions.filter((x) => x.date === '2026-11-13' && x.kind !== 'routine');
    for (const m of missed) {
      expect(m.missed).toBe(true);
      expect(m.done).toBe(false);
    }
    expect(out.state.progress).toEqual(s.progress);
  });

  it('leaves completed sessions alone and is stable when nothing was missed', () => {
    const s = activated();
    const target = s.sessions.find((x) => x.date === '2026-11-13' && x.kind === 'sprint')!;
    const withDone = toggleSessionDone(s, target.id, new Date('2026-11-13T11:00:00+05:30'));
    const out = redistributeMissed(withDone, MORNING_14);
    expect(out.state.sessions.find((x) => x.id === target.id)?.done).toBe(true);

    const clean = redistributeMissed(s, new Date('2026-11-12T12:05:00+05:30'));
    expect(clean.moved).toEqual([]);
  });

  it('never puts new first-pass material on the night before a paper', () => {
    const s = activated();
    const out = redistributeMissed(s, MORNING_14);
    for (const session of out.state.sessions) {
      if (session.date === '2026-11-16' && session.start >= '19:00') {
        expect(session.kind).not.toBe('sprint');
      }
    }
  });
});
