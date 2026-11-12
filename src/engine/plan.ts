// EXAMFORGE — plan engine.
// Turns the declarative plan in data/plan.ts into real, stable StudySession records,
// activates it, reports completion, and redistributes work that was missed.
// It never writes to `progress`: a finished session is coverage, not mastery.

import type { AppState, StudySession, SubjectId, Topic, TopicStatus } from '../data/types';
import { SUBJECTS, TOPIC_MAP } from '../data/syllabus';
import { CONTENT } from '../data/content';
import { QUESTIONS_BY_TOPIC } from '../data/bank';
import {
  PLAN_DAYS,
  PLAN_ID,
  PLAN_START,
  PLAN_END,
  PLAN_TITLE,
  PLAN_REVISION,
  PLAN_BLOCKS,
  PLAN_DAILY_MINUTES,
  type PlanSlot,
  type TopicSlice,
} from '../data/plan';
import { addDays, diffDays, nowMinutes, timeToMin, todayKey } from './dates';
import { isCovered } from './progress';

export const STATUS_PENDING: TopicStatus[] = ['not_started', 'in_progress', 'needs_revision'];

function subjectOf(subjectId: SubjectId) {
  return SUBJECTS.find((s) => s.id === subjectId)!;
}

function unitTopics(subjectId: SubjectId, unitOrder: number): Topic[] {
  const unit = subjectOf(subjectId).units.find((u) => u.order === unitOrder);
  return unit ? unit.topics : [];
}

/** Resolve one declared slice into syllabus topics. Never invents a topic. */
export function resolveSlice(slice: TopicSlice): Topic[] {
  const topics = unitTopics(slice.subjectId, slice.unit);
  const from = (slice.from ?? 1) - 1;
  const to = slice.to ?? topics.length;
  return topics.slice(Math.max(0, from), Math.max(0, to));
}

function weakTopics(state: AppState, subjectId: SubjectId, limit = 4): Topic[] {
  const subject = subjectOf(subjectId);
  const scored: { topic: Topic; rank: number }[] = [];
  for (const unit of subject.units) {
    for (const t of unit.topics) {
      const p = state.progress[t.id];
      if (!p) continue;
      if (p.status === 'needs_revision') scored.push({ topic: t, rank: 0 });
      else if (p.assessments.length > 0) {
        const last = p.assessments[p.assessments.length - 1];
        const pct = (last.score / Math.max(1, last.total)) * 100;
        if (pct < state.settings.passPercent) scored.push({ topic: t, rank: pct });
      } else if (p.status === 'in_progress') scored.push({ topic: t, rank: 60 });
    }
  }
  scored.sort((a, b) => a.rank - b.rank);
  const picks = scored.slice(0, limit).map((s) => s.topic);
  if (picks.length > 0) return picks;
  // nothing flagged yet: revise the last unit taught for that paper
  const last = subject.units[subject.units.length - 1];
  return last.topics.slice(0, limit);
}

function topicsForSlot(state: AppState, slot: PlanSlot): Topic[] {
  if (slot.weakOf) return weakTopics(state, slot.weakOf);
  if (!slot.topics) return [];
  return slot.topics.flatMap((slice) => resolveSlice(slice));
}

function blockIdFor(start: string): string {
  const block = PLAN_BLOCKS.find((b) => b.start === start);
  return block ? block.id : `plan_${start.replace(':', '')}`;
}

function materialFor(kind: PlanSlot['kind'], subjectId: SubjectId, topics: Topic[], note?: string): string {
  const subject = subjectOf(subjectId);
  const units = [...new Set(topics.map((t) => TOPIC_MAP[t.id]?.unitId).filter(Boolean))];
  const unitLabel = units.length === 1 ? units[0].toUpperCase() : 'selected units';
  switch (kind) {
    case 'sprint':
      return `EXAMFORGE · Learn → ${subject.name} → ${unitLabel} · levels 1–5, then set each topic status (LEARNED, not MASTERED)`;
    case 'practice':
      return `EXAMFORGE · Practice Tests + Numerical Lab → ${subject.name} · ${topics.length} topics${note ? ` · ${note}` : ''}`;
    case 'revision':
      return `EXAMFORGE · Revision Centre → active recall for ${topics.length || 'all'} ${subject.name} topics${note ? ` · ${note}` : ''}`;
    case 'mock':
      return `EXAMFORGE · Mock Examinations → full-length ${subject.name} (${subject.code}) paper`;
    case 'admin':
      return 'EXAMFORGE · open tomorrow’s sessions in the planner and download the study book file';
    case 'exam':
      return `${subject.name} (${subject.code}) · university examination`;
    default:
      return note ?? 'Routine — protected time, no study required';
  }
}

function criteriaFor(kind: PlanSlot['kind'], topics: Topic[]): string {
  const names = topics.slice(0, 2).map((t) => t.name).join(', ');
  switch (kind) {
    case 'sprint':
      return `Explain ${names || 'each topic'} without notes, draw its diagram, and finish the 3-mark check. Mark the topic LEARNED only after that; mastery needs a passed assessment.`;
    case 'practice':
      return 'Answer under time, score yourself against the rubric, and log every wrong step as a repair note.';
    case 'revision':
      return 'Retrieve first, then check. A wrong answer means re-explain the mechanism and retry a fresh question tomorrow.';
    case 'mock':
      return 'Timer on, no notes. After submission read the report, list the weak concepts and let the planner schedule their repair.';
    case 'exam':
      return 'Read the whole paper first, budget minutes per mark, answer the strongest question first, and leave the last ten minutes for diagrams.';
    case 'admin':
      return 'Ten minutes of preparation: material open, numerical set chosen, tomorrow’s first topic skimmed.';
    default:
      return 'Sleep, food and movement are part of the plan, not a break from it.';
  }
}

function objectivesFor(topics: Topic[]): string[] {
  const out: string[] = [];
  for (const t of topics) {
    const c = CONTENT[t.id];
    if (c?.objectives?.length) out.push(...c.objectives.slice(0, 2));
    else if (t.subtopics.length) out.push(...t.subtopics.slice(0, 2));
    if (out.length >= 5) break;
  }
  return [...new Set(out)].slice(0, 5);
}

function questionsFor(topics: Topic[]): string[] {
  const out: string[] = [];
  for (const t of topics) {
    const bank = QUESTIONS_BY_TOPIC[t.id] ?? [];
    const three = bank.find((q) => q.marks === 3);
    const five = bank.find((q) => q.marks === 5);
    if (three) out.push(three.id);
    if (five) out.push(five.id);
    if (out.length >= 4) break;
  }
  return out.slice(0, 4);
}

export function planSessionId(date: string, start: string): string {
  return `plan_${date}_${start.replace(':', '')}`;
}

/** Build every plan session from the declared slots. Pure: no clock, no storage, no progress writes. */
export function buildPlanSessions(state: AppState, from = PLAN_START): StudySession[] {
  const sessions: StudySession[] = [];
  for (const day of PLAN_DAYS) {
    if (day.date < from) continue;
    for (const slot of day.slots) {
      const topics = topicsForSlot(state, slot);
      const subjectId = slot.subjectId ?? topics[0]?.subjectId ?? 'dl';
      sessions.push({
        id: planSessionId(day.date, slot.start),
        date: day.date,
        blockId: blockIdFor(slot.start),
        start: slot.start,
        end: slot.end,
        minutes: timeToMin(slot.end) - timeToMin(slot.start),
        subjectId,
        unitId: topics[0]?.unitId,
        topicIds: topics.map((t) => t.id),
        objectives: objectivesFor(topics),
        material: materialFor(slot.kind, subjectId, topics, slot.note),
        questionsToSolve: slot.kind === 'sprint' || slot.kind === 'practice' || slot.kind === 'mock' ? questionsFor(topics) : [],
        criteria: criteriaFor(slot.kind, topics),
        done: false,
        kind: slot.kind,
        compulsory: slot.kind !== 'routine' && slot.kind !== 'exam' && !slot.optional,
        title: slot.title,
        planId: PLAN_ID,
      });
    }
  }
  return sessions;
}

/** Make the plan the active timetable, preserving completed work and past history. */
export function activatePlan(state: AppState, now = new Date()): AppState {
  const today = todayKey(now);
  const from = today > PLAN_START ? today : PLAN_START;
  const planSessions = buildPlanSessions(state, from);
  const keep = state.sessions.filter((s) => s.done || (s.date < today && s.planId !== PLAN_ID));
  const merged = new Map<string, StudySession>();
  for (const s of keep) merged.set(s.id, s);
  for (const s of planSessions) if (!merged.has(s.id)) merged.set(s.id, s);
  const sessions = [...merged.values()].sort((a, b) =>
    a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date),
  );

  return {
    ...state,
    plan: { id: PLAN_ID, version: PLAN_REVISION, title: PLAN_TITLE, activatedAt: Date.now(), start: PLAN_START, end: PLAN_END },
    sessions,
    timetable: { mode: 'plan', generatedAt: Date.now(), sessions, planId: PLAN_ID },
    settings: {
      ...state.settings,
      blocks: PLAN_BLOCKS.map((b) => ({ ...b })),
      dailyTargetMin: PLAN_DAILY_MINUTES,
    },
  };
}

export interface PlanDayView {
  date: string;
  label: string;
  total: number;
  done: number;
  minutes: number;
  doneMinutes: number;
  sessions: StudySession[];
}

const STUDY_KINDS = new Set<StudySession['kind']>(['sprint', 'practice', 'revision', 'mock', 'admin']);

export function planDayViews(state: AppState): PlanDayView[] {
  const planSessions = state.sessions.filter((s) => s.planId === PLAN_ID);
  return PLAN_DAYS.map((day) => {
    const sessions = planSessions.filter((s) => s.date === day.date).sort((a, b) => a.start.localeCompare(b.start));
    const study = sessions.filter((s) => STUDY_KINDS.has(s.kind));
    return {
      date: day.date,
      label: day.label,
      total: study.length,
      done: study.filter((s) => s.done).length,
      minutes: study.reduce((n, s) => n + s.minutes, 0),
      doneMinutes: study.filter((s) => s.done).reduce((n, s) => n + s.minutes, 0),
      sessions,
    };
  }).filter((d) => d.sessions.length > 0);
}

export interface PlanSummary {
  active: boolean;
  today: { date: string; total: number; done: number; percent: number; minutes: number; doneMinutes: number };
  pending: StudySession[];
  overdue: StudySession[];
  nextExam: { subjectId: SubjectId; code: string; name: string; date: string; days: number } | null;
  mocksPlanned: number;
  mocksTaken: number;
  coverage: { sprints: number; topics: number; done: number };
  days: PlanDayView[];
}

export function planSummary(state: AppState, now = new Date()): PlanSummary {
  const today = todayKey(now);
  const days = planDayViews(state);
  const planSessions = state.sessions.filter((s) => s.planId === PLAN_ID);
  const upcomingExam = [...SUBJECTS]
    .filter((s) => diffDays(today, s.examDate) >= 0)
    .sort((a, b) => a.examDate.localeCompare(b.examDate))[0];

  // study time planned for today, excluding routine and the examination itself
  const todaysStudy = planSessions.filter((s) => s.date === today && STUDY_KINDS.has(s.kind));
  const doneStudy = todaysStudy.filter((s) => s.done);
  const pending = planSessions
    .filter((s) => !s.done && s.date < today && STUDY_KINDS.has(s.kind))
    .sort((a, b) => a.date.localeCompare(b.date));
  const overdue = planSessions.filter((s) => s.missed && !s.done && STUDY_KINDS.has(s.kind));
  const sprints = planSessions.filter((s) => s.kind === 'sprint' || s.kind === 'practice');
  const mocksPlanned = planSessions.filter((s) => s.kind === 'mock').length;

  return {
    active: state.plan?.id === PLAN_ID,
    today: {
      date: today,
      total: todaysStudy.length,
      done: doneStudy.length,
      percent: todaysStudy.length ? Math.round((doneStudy.length / todaysStudy.length) * 100) : 0,
      minutes: todaysStudy.reduce((n, s) => n + s.minutes, 0),
      doneMinutes: doneStudy.reduce((n, s) => n + s.minutes, 0),
    },
    pending,
    overdue,
    nextExam: upcomingExam
      ? {
          subjectId: upcomingExam.id,
          code: upcomingExam.code,
          name: upcomingExam.name,
          date: upcomingExam.examDate,
          days: diffDays(today, upcomingExam.examDate),
        }
      : null,
    mocksPlanned,
    mocksTaken: state.mocks.length,
    coverage: {
      sprints: sprints.length,
      topics: planSessions.filter((s) => s.kind === 'sprint').reduce((n, s) => n + s.topicIds.length, 0),
      done: planSessions.filter((s) => s.kind === 'sprint' && s.done).reduce((n, s) => n + s.topicIds.length, 0),
    },
    days,
  };
}

// ---------------------------------------------------------------- adaptive redistribution

/** Mark finished/past sessions and move unfinished learning topics into later capacity. */
export function redistributeMissed(
  state: AppState,
  now = new Date(),
): { state: AppState; moved: string[]; unplaced: string[] } {
  const today = todayKey(now);
  const nowMin = nowMinutes(now);

  const sessions = state.sessions.map((s) => {
    if (s.done || s.planId !== PLAN_ID) return s;
    if (s.date < today) return s.missed ? s : { ...s, missed: true };
    if (s.date === today && timeToMin(s.end) < nowMin) return s.missed ? s : { ...s, missed: true };
    return s;
  });

  // unfinished first-pass material only; revision and mocks are repeated, not "carried"
  const carry = new Map<SubjectId, string[]>();
  for (const s of sessions) {
    if (!s.missed || s.done || s.kind !== 'sprint') continue;
    const open = s.topicIds.filter((id) => TOPIC_MAP[id] && !isCovered(state, id));
    if (open.length === 0) continue;
    carry.set(s.subjectId, [...(carry.get(s.subjectId) ?? []), ...open]);
  }

  const moved: string[] = [];
  const unplaced: string[] = [];

  for (const [subjectId, topicIds] of carry) {
    const subject = subjectOf(subjectId);
    const examDate = subject.examDate;
    const ordered = [...new Set(topicIds)].sort();
    const candidates = sessions
      .filter(
        (s) =>
          s.date > today &&
          s.date < examDate &&
          s.subjectId === subjectId &&
          (s.kind === 'sprint' || s.kind === 'practice') &&
          s.topicIds.length < 10,
      )
      .sort((a, b) => (a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)));

    for (const topicId of ordered) {
      const eve = addDays(examDate, -1);
      const target = candidates.find(
        (s) => !s.topicIds.includes(topicId) && !(s.kind === 'sprint' && s.date === eve) && s.topicIds.length < 10,
      );
      if (!target) {
        unplaced.push(topicId);
        continue;
      }
      target.topicIds = [...target.topicIds, topicId];
      target.carryOver = [...(target.carryOver ?? []), topicId];
      target.material = `${target.material} · carry-over: ${TOPIC_MAP[topicId]?.name ?? topicId}`;
      moved.push(topicId);
    }
  }

  const sorted = [...sessions].sort((a, b) =>
    a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date),
  );
  return {
    state: { ...state, sessions: sorted, timetable: state.timetable ? { ...state.timetable, sessions: sorted } : null },
    moved,
    unplaced,
  };
}

/** Toggle a plan session's completion without ever promoting a topic to mastered. */
export function toggleSessionDone(state: AppState, id: string, now = new Date()): AppState {
  const today = todayKey(now);
  const sessions = state.sessions.map((s) =>
    s.id === id ? { ...s, done: !s.done, missed: s.done ? s.missed : false } : s,
  );
  const log = new Map(state.studyLog.map((l) => [l.date, { ...l }]));
  const session = sessions.find((s) => s.id === id);
  if (session && session.date === today) {
    const entry = log.get(today) ?? { date: today, minutes: 0, topicIds: [] };
    const delta = session.done ? session.minutes : -session.minutes;
    entry.minutes = Math.max(0, entry.minutes + delta);
    if (session.done) entry.topicIds = [...new Set([...entry.topicIds, ...session.topicIds])];
    log.set(today, entry);
  }
  return {
    ...state,
    sessions,
    timetable: state.timetable ? { ...state.timetable, sessions } : null,
    studyLog: [...log.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}
