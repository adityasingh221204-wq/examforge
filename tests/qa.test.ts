// EXAMFORGE — quality assurance suite.
// Verifies syllabus completeness, content coverage, the question bank, numerical solvers,
// scheduling rules, spaced repetition, grading and progress semantics.

import { describe, expect, it } from 'vitest';
import { ALL_TOPICS, SUBJECTS, TOPIC_MAP, TOPIC_COUNT, UNIT_COUNT } from '../src/data/syllabus';
import { CONTENT, MISSING_CONTENT, ORPHAN_CONTENT } from '../src/data/content';
import { ALL_QUESTIONS, QUESTIONS_BY_TOPIC, NUMERICALS } from '../src/data/bank';
import { defaultState } from '../src/engine/storage';
import { applySchedule, generateSchedule, sessionsForDate, isTravelDay, examSubjectOn } from '../src/engine/scheduler';
import { recordAssessment, getStatus, setStatus, overallCoverage } from '../src/engine/progress';
import { gradeRevision, ensureRevision, dueRevisions, pickRevisionQuestion } from '../src/engine/revision';
import { evaluateAnswer, gradeObjective, assembleMock, isObjective } from '../src/engine/scoring';
import { addDays, dateRange } from '../src/engine/dates';

describe('syllabus database', () => {
  it('contains the four official subjects with correct exam dates', () => {
    expect(SUBJECTS).toHaveLength(4);
    const dates = Object.fromEntries(SUBJECTS.map((s) => [s.id, s.examDate]));
    expect(dates.dl).toBe('2026-11-17');
    expect(dates.cn).toBe('2026-11-19');
    expect(dates.nlp).toBe('2026-11-24');
    expect(dates.cloud).toBe('2026-11-26');
  });

  it('has 20 units and 172 unique topics', () => {
    expect(SUBJECTS.flatMap((s) => s.units)).toHaveLength(20);
    expect(UNIT_COUNT).toBe(20);
    expect(ALL_TOPICS).toHaveLength(172);
    expect(TOPIC_COUNT).toBe(172);
    expect(new Set(ALL_TOPICS.map((t) => t.id)).size).toBe(ALL_TOPICS.length);
  });

  it('gives every topic a name and at least one subtopic', () => {
    for (const t of ALL_TOPICS) {
      expect(t.name.trim().length).toBeGreaterThan(2);
      expect(t.subtopics.length).toBeGreaterThan(0);
      expect(t.subtopics.every((s) => s.trim().length > 1)).toBe(true);
    }
  });

  it('keeps unit topic ids consistent with their unit', () => {
    for (const t of ALL_TOPICS) {
      expect(t.id.startsWith(`${t.unitId}-t`)).toBe(true);
      expect(TOPIC_MAP[t.id]).toBe(t);
    }
  });
});

describe('teaching content', () => {
  it('covers every syllabus topic exactly once', () => {
    expect(MISSING_CONTENT).toEqual([]);
    expect(ORPHAN_CONTENT).toEqual([]);
    expect(Object.keys(CONTENT)).toHaveLength(ALL_TOPICS.length);
  });

  it('provides all five levels with substantive text', () => {
    for (const t of ALL_TOPICS) {
      const c = CONTENT[t.id];
      expect(c).toBeDefined();
      expect(c.objectives.length).toBeGreaterThanOrEqual(3);
      for (const key of ['what', 'why', 'problem', 'how'] as const) {
        expect(c.zero[key].length).toBeGreaterThan(25);
      }
      // "where it is used" may be a short application list
      expect(c.zero.where.length).toBeGreaterThan(8);
      expect(c.tech.definition.length).toBeGreaterThan(20);
      expect(c.tech.components.length).toBeGreaterThan(0);
      expect(c.tech.advantages.length).toBeGreaterThan(0);
      expect(c.tech.disadvantages.length).toBeGreaterThan(0);
      expect(c.examples.length).toBeGreaterThan(0);
      expect(c.applications.length).toBeGreaterThan(0);
      expect(c.definitions.length).toBeGreaterThan(0);
      // Level 3 must be genuinely visual: a diagram or a comparison table
      expect(Boolean(c.diagram || c.comparison)).toBe(true);
    }
  });
});

describe('question bank', () => {
  it('carries four questions for every topic', () => {
    for (const t of ALL_TOPICS) {
      const qs = QUESTIONS_BY_TOPIC[t.id] ?? [];
      expect(qs.length).toBeGreaterThanOrEqual(4);
      expect(qs.some((q) => q.marks === 3)).toBe(true);
      expect(qs.some((q) => q.marks === 4)).toBe(true);
      expect(qs.some((q) => q.marks === 5)).toBe(true);
      expect(qs.some((q) => q.type === 'mcq')).toBe(true);
    }
    expect(ALL_QUESTIONS).toHaveLength(ALL_TOPICS.length * 4);
  });

  it('gives every question a complete answer, rubric and explanation', () => {
    for (const q of ALL_QUESTIONS) {
      expect(q.stem.length).toBeGreaterThan(10);
      expect(q.answerText?.length ?? 0).toBeGreaterThan(10);
      expect(q.explanation.length).toBeGreaterThan(10);
      expect(q.structure.length).toBeGreaterThan(1);
      expect(q.mistakes.length).toBeGreaterThan(0);
      expect(q.rubric.reduce((n, r) => n + r.marks, 0)).toBe(q.marks);
      if (q.type === 'mcq') {
        expect(q.options).toHaveLength(4);
        expect(q.answerIndex).toHaveLength(1);
        expect(new Set(q.options).size).toBe(4);
      }
    }
  });

  it('builds an advanced paper only from difficulty 4–5 questions', () => {
    const qs = assembleMock({
      label: 'adv',
      kind: 'advanced',
      subjectId: 'dl',
      objectiveCount: 5,
      subjectiveCount: 3,
      durationSec: 7200,
      seed: 42,
      minDifficulty: 4,
    });
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) expect(q.difficulty).toBeGreaterThanOrEqual(4);
  });

  it('assembles a balanced mock within the requested bounds', () => {
    const qs = assembleMock({
      label: 'test',
      kind: 'full',
      subjectId: 'cn',
      objectiveCount: 4,
      subjectiveCount: 3,
      durationSec: 7200,
      seed: 42,
    });
    expect(qs.length).toBeGreaterThan(0);
    expect(qs.every((q) => q.subjectId === 'cn')).toBe(true);
    expect(qs.filter((q) => isObjective(q.type)).length).toBeGreaterThanOrEqual(4);
    expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
  });
});

describe('numerical lab', () => {
  it('exposes worked numericals for all four subjects', () => {
    const bySubject = new Set(NUMERICALS.map((n) => n.subjectId));
    expect(bySubject.size).toBe(4);
    expect(NUMERICALS.length).toBeGreaterThanOrEqual(24);
  });

  it('solves every numerical deterministically with steps and an answer', () => {
    for (const spec of NUMERICALS) {
      const params = Object.fromEntries(spec.params.map((p) => [p.name, p.value]));
      const a = spec.solve(params);
      const b = spec.solve(params);
      expect(a.steps.length).toBeGreaterThanOrEqual(2);
      expect(a.answer.length).toBeGreaterThan(0);
      expect(a.answer).toBe(b.answer);
      expect(spec.formula.length).toBeGreaterThan(0);
      expect(spec.mistakes.length).toBeGreaterThan(0);
    }
  });

  it('computes transmission delay correctly (1500 bits at 10 Mbps = 0.15 ms)', () => {
    const spec = NUMERICALS.find((n) => n.id === 'cn-trans-delay')!;
    const out = spec.solve({ L: 1500, R: 10 });
    expect(out.answer).toContain('0.15');
  });

  it('computes subnetting correctly for /24 split into 4', () => {
    const spec = NUMERICALS.find((n) => n.id === 'cn-subnet')!;
    const out = spec.solve({ X: 10, prefix: 24, S: 4 });
    expect(out.answer).toContain('/26');
    expect(out.answer).toContain('62');
  });
});

describe('planner', () => {
  const base = { ...defaultState(), seeded: true };

  it('never schedules compulsory study inside the travel window', () => {
    const tt = generateSchedule(base, 'sprint', '2026-11-04');
    for (const s of tt.sessions) {
      if (isTravelDay(s.date, base)) expect(s.compulsory).toBe(false);
    }
  });

  it('never schedules sessions on an examination morning', () => {
    const tt = generateSchedule(base, 'sprint', '2026-11-12');
    for (const s of tt.sessions) {
      if (examSubjectOn(s.date)) expect(s.start >= '11:30').toBe(true);
    }
  });

  it('starts coverage before the first exam and produces usable sessions', () => {
    const tt = generateSchedule(base, 'sprint', '2026-11-12');
    expect(tt.sessions.length).toBeGreaterThan(0);
    const first = [...tt.sessions].sort((a, b) => a.date.localeCompare(b.date))[0];
    expect(first.date < '2026-11-17').toBe(true);
    for (const s of tt.sessions) {
      expect(s.minutes).toBeGreaterThan(0);
      expect(s.start < s.end).toBe(true);
    }
  });

  it('produces sessions for a given date and respects the daily blocks', () => {
    const state = applySchedule(base, 'examwise', '2026-11-12');
    const day = state.sessions[0]?.date ?? '2026-11-12';
    const sessions = sessionsForDate(state, day);
    expect(sessions.length).toBeGreaterThan(0);
    const studyBlocks = base.settings.blocks.filter((b) => b.kind === 'study').map((b) => b.id);
    for (const s of sessions) expect(studyBlocks).toContain(s.blockId);
  });

  it('keeps sleep untouched: no session starts before wake or ends after sleep', () => {
    const tt = generateSchedule(base, 'sprint', '2026-11-12');
    for (const s of tt.sessions) {
      expect(s.start >= base.settings.wake).toBe(true);
      expect(s.end <= base.settings.sleep).toBe(true);
    }
  });
});

describe('progress and mastery', () => {
  it('grants MASTERED only when the assessment passes', () => {
    let state = defaultState();
    state = recordAssessment(state, 'dl-u1-t1', 4, 10); // 40%
    expect(getStatus(state, 'dl-u1-t1')).toBe('needs_revision');
    state = recordAssessment(state, 'dl-u1-t1', 9, 10); // 90%
    expect(getStatus(state, 'dl-u1-t1')).toBe('mastered');
  });

  it('counts coverage from learned, practised and mastered statuses', () => {
    let state = defaultState();
    expect(overallCoverage(state).covered).toBe(0);
    state = setStatus(state, 'dl-u1-t1', 'learned');
    state = setStatus(state, 'dl-u1-t2', 'practised');
    const cov = overallCoverage(state);
    expect(cov.covered).toBe(2);
    expect(cov.mastered).toBe(0);
  });
});

describe('spaced repetition', () => {
  it('schedules the immediate review on creation', () => {
    const state = ensureRevision(defaultState(), 'cn-u1-t1');
    expect(state.revisions).toHaveLength(1);
    expect(state.revisions[0].stage).toBe(0);
    expect(dueRevisions(state)).toHaveLength(1);
  });

  it('advances the stage on a correct answer and resets on a wrong one', () => {
    let state = ensureRevision(defaultState(), 'cn-u1-t1');
    const item = state.revisions[0];
    state = gradeRevision(state, item.id, item.topicId, true);
    expect(state.revisions[0].stage).toBe(1);
    expect(state.revisions[0].correctStreak).toBe(1);
    const after = state.revisions[0];
    state = gradeRevision(state, after.id, after.topicId, false);
    expect(state.revisions[0].stage).toBe(0);
    expect(state.revisions[0].wrongStreak).toBe(1);
  });

  it('offers a real bank question for a revision item', () => {
    const state = ensureRevision(defaultState(), 'nlp-u2-t5');
    const q = pickRevisionQuestion(state.revisions[0]);
    expect(q).toBeDefined();
    expect(QUESTIONS_BY_TOPIC['nlp-u2-t5'].some((x) => x.id === q!.id)).toBe(true);
  });
});

describe('answer evaluation', () => {
  const q = ALL_QUESTIONS.find((x) => x.topicId === 'dl-u2-t5' && x.marks === 5)!;

  it('grades objective questions exactly', () => {
    const mcq = ALL_QUESTIONS.find((x) => x.type === 'mcq')!;
    expect(gradeObjective(mcq, mcq.answerIndex!)).toBe(true);
    expect(gradeObjective(mcq, [(mcq.answerIndex![0] + 1) % 4])).toBe(false);
  });

  it('never awards full marks to an empty or vague answer', () => {
    const empty = evaluateAnswer(q, '');
    expect(empty.score).toBe(0);
    expect(empty.fullMarks).toBe(false);
    const vague = evaluateAnswer(q, 'It is good and used in many places for things.');
    expect(vague.score).toBeLessThan(q.marks);
    expect(vague.fullMarks).toBe(false);
    expect(vague.missed.length).toBeGreaterThan(0);
  });

  it('rewards a complete answer with keywords and structure', () => {
    const good = evaluateAnswer(q, q.answerText ?? '');
    const poor = evaluateAnswer(q, 'Backpropagation is a thing.');
    expect(good.score).toBeGreaterThan(poor.score);
  });
});

describe('date helpers', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(dateRange('2026-11-16', '2026-11-18')).toEqual(['2026-11-16', '2026-11-17', '2026-11-18']);
  });
});
