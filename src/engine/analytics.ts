// Analytics engine — all dashboard numbers computed from persisted real data.

import type { AppState, MockResult, SubjectId, SubjectStats } from '../data/types';
import { SUBJECTS } from '../data/syllabus';
import { addDays, dateRange, todayKey } from './dates';
import { overallCoverage, subjectStats, weakestTopics, strongestTopics, getProgress } from './progress';
import { questionById, numericalAccuracy, topicAttemptStats } from './scoring';
import { revisionStats } from './revision';

export interface DayPoint {
  date: string;
  minutes: number;
  label: string;
}

export interface DashboardData {
  coverage: ReturnType<typeof overallCoverage>;
  subjects: SubjectStats[];
  attempts: { attempted: number; correct: number; percent: number };
  numerical: ReturnType<typeof numericalAccuracy>;
  avgMockPercent: number;
  mockTrend: { date: string; percent: number; label: string }[];
  studyMinutesTotal: number;
  todayMinutes: number;
  streak: number;
  week: DayPoint[];
  weakest: ReturnType<typeof weakestTopics>;
  strongest: ReturnType<typeof strongestTopics>;
  revisions: ReturnType<typeof revisionStats>;
  accuracySeries: { date: string; percent: number }[];
}

export function studyStreak(state: AppState, today = todayKey()): number {
  const days = new Set(state.studyLog.filter((l) => l.minutes >= 30).map((l) => l.date));
  let streak = 0;
  let cursor = today;
  // today may not be logged yet — allow yesterday as streak base
  if (!days.has(cursor)) {
    cursor = addDays(cursor, -1);
    if (!days.has(cursor)) return 0;
  }
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function last7Days(today = todayKey()): string[] {
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) out.push(addDays(today, -i));
  return out;
}

function minutesOn(state: AppState, date: string): number {
  return state.studyLog.find((l) => l.date === date)?.minutes ?? 0;
}

export function accuracySeries(state: AppState, days = 30): { date: string; percent: number }[] {
  const today = todayKey();
  const from = addDays(today, -(days - 1));
  const dates = dateRange(from, today);
  return dates.map((date) => {
    const dayAttempts = state.attempts.filter((a) => {
      const d = new Date(a.at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return key === date;
    });
    if (dayAttempts.length === 0) return { date, percent: 0 };
    let correct = 0;
    for (const a of dayAttempts) {
      if (a.correct !== undefined) {
        if (a.correct) correct += 1;
      } else if (a.score !== undefined && a.maxScore && a.score / a.maxScore >= 0.5) correct += 1;
    }
    return { date, percent: Math.round((correct / dayAttempts.length) * 100) };
  });
}

export function buildDashboard(state: AppState, now = new Date()): DashboardData {
  const today = todayKey(now);
  const coverage = overallCoverage(state);
  const subjects = SUBJECTS.map((s) => subjectStats(state, s));

  let attempted = 0;
  let correct = 0;
  for (const a of state.attempts) {
    attempted += 1;
    if (a.correct !== undefined) {
      if (a.correct) correct += 1;
    } else if (a.score !== undefined && a.maxScore !== undefined && a.maxScore > 0 && a.score / a.maxScore >= 0.5) {
      correct += 1;
    }
  }

  const sortedMocks = [...state.mocks].sort((a, b) => a.startedAt - b.startedAt);
  const avgMockPercent = sortedMocks.length
    ? Math.round(sortedMocks.reduce((n, m) => n + (m.totalMarks ? (m.score / m.totalMarks) * 100 : 0), 0) / sortedMocks.length)
    : 0;
  const mockTrend = sortedMocks.map((m) => ({
    date: new Date(m.startedAt).toISOString().slice(0, 10),
    percent: m.totalMarks ? Math.round((m.score / m.totalMarks) * 100) : 0,
    label: m.label,
  }));

  const week = last7Days(today).map((date) => ({
    date,
    minutes: minutesOn(state, date),
    label: date.slice(8),
  }));

  const studyMinutesTotal = state.studyLog.reduce((n, l) => n + l.minutes, 0);

  return {
    coverage,
    subjects,
    attempts: {
      attempted,
      correct,
      percent: attempted ? Math.round((correct / attempted) * 100) : 0,
    },
    numerical: numericalAccuracy(state),
    avgMockPercent,
    mockTrend,
    studyMinutesTotal,
    todayMinutes: minutesOn(state, today),
    streak: studyStreak(state, today),
    week,
    weakest: weakestTopics(state, 8),
    strongest: strongestTopics(state, 6),
    revisions: revisionStats(state, today),
    accuracySeries: accuracySeries(state, 30),
  };
}

export interface MockReport {
  mock: MockResult;
  percent: number;
  perSubject: { subjectId: SubjectId; total: number; scored: number; percent: number }[];
  perUnit: { unitId: string; total: number; scored: number; percent: number }[];
  perTopic: { topicId: string; total: number; scored: number; percent: number }[];
  incorrect: { questionId: string; awarded: number; max: number }[];
}

export function mockReport(mock: MockResult): MockReport {
  const bySubject = new Map<SubjectId, { total: number; scored: number }>();
  const byUnit = new Map<string, { total: number; scored: number }>();
  const byTopic = new Map<string, { total: number; scored: number }>();
  const incorrect: { questionId: string; awarded: number; max: number }[] = [];

  for (const r of mock.perQuestion) {
    const q = questionById(r.questionId);
    if (!q) continue;
    const s = bySubject.get(q.subjectId) ?? { total: 0, scored: 0 };
    s.total += r.max;
    s.scored += r.awarded;
    bySubject.set(q.subjectId, s);

    const u = byUnit.get(q.unitId) ?? { total: 0, scored: 0 };
    u.total += r.max;
    u.scored += r.awarded;
    byUnit.set(q.unitId, u);

    const t = byTopic.get(q.topicId) ?? { total: 0, scored: 0 };
    t.total += r.max;
    t.scored += r.awarded;
    byTopic.set(q.topicId, t);

    if (r.awarded < r.max) incorrect.push({ questionId: r.questionId, awarded: r.awarded, max: r.max });
  }

  return {
    mock,
    percent: mock.totalMarks ? Math.round((mock.score / mock.totalMarks) * 100) : 0,
    perSubject: [...bySubject.entries()].map(([subjectId, v]) => ({
      subjectId,
      ...v,
      percent: v.total ? Math.round((v.scored / v.total) * 100) : 0,
    })),
    perUnit: [...byUnit.entries()].map(([unitId, v]) => ({
      unitId,
      ...v,
      percent: v.total ? Math.round((v.scored / v.total) * 100) : 0,
    })),
    perTopic: [...byTopic.entries()]
      .map(([topicId, v]) => ({ topicId, ...v, percent: v.total ? Math.round((v.scored / v.total) * 100) : 0 }))
      .sort((a, b) => a.percent - b.percent),
    incorrect,
  };
}

/** unit-wise mastery heatmap rows: subject → unit → percent mastered */
export function masteryHeatmap(state: AppState): { subjectId: SubjectId; subject: string; units: { unitId: string; name: string; percent: number }[] }[] {
  return SUBJECTS.map((s) => ({
    subjectId: s.id,
    subject: s.name,
    units: s.units.map((u) => {
      const total = u.topics.length;
      const mastered = u.topics.filter((t) => getProgress(state, t.id).status === 'mastered').length;
      return {
        unitId: u.id,
        name: `U${u.order}`,
        percent: total ? Math.round((mastered / total) * 100) : 0,
      };
    }),
  }));
}

export function questionsAttemptedBySubject(state: AppState): { subjectId: SubjectId; attempted: number; correct: number }[] {
  return SUBJECTS.map((s) => {
    const ids = new Set(s.units.flatMap((u) => u.topics).map((t) => t.id));
    let attempted = 0;
    let correct = 0;
    for (const a of state.attempts) {
      const q = questionById(a.questionId);
      if (!q || !ids.has(q.topicId)) continue;
      attempted += 1;
      if (a.correct !== undefined) {
        if (a.correct) correct += 1;
      } else if (a.score !== undefined && a.maxScore && a.score / a.maxScore >= 0.5) correct += 1;
    }
    return { subjectId: s.id, attempted, correct };
  });
}

export function topicMasteryForSubject(state: AppState, subjectId: SubjectId): { learned: number; practised: number; mastered: number; total: number } {
  const s = SUBJECTS.find((x) => x.id === subjectId)!;
  const topics = s.units.flatMap((u) => u.topics);
  let learned = 0;
  let practised = 0;
  let mastered = 0;
  for (const t of topics) {
    const st = getProgress(state, t.id).status;
    if (st === 'learned' || st === 'practised' || st === 'mastered') learned += 1;
    if (st === 'practised' || st === 'mastered') practised += 1;
    if (st === 'mastered') mastered += 1;
  }
  return { learned, practised, mastered, total: topics.length };
}

export function attemptStatsFor(state: AppState, questionIds: string[]): { attempted: number; correct: number } {
  const set = new Set(questionIds);
  let attempted = 0;
  let correct = 0;
  for (const a of state.attempts) {
    if (!set.has(a.questionId)) continue;
    attempted += 1;
    if (a.correct !== undefined) {
      if (a.correct) correct += 1;
    } else if (a.score !== undefined && a.maxScore && a.score / a.maxScore >= 0.5) correct += 1;
  }
  return { attempted, correct };
}

export function perTopicAttemptQuality(state: AppState): { topicId: string; accuracy: number }[] {
  const ids = new Set<string>();
  for (const a of state.attempts) {
    const q = questionById(a.questionId);
    if (q) ids.add(q.topicId);
  }
  return [...ids].map((topicId) => {
    const stats = topicAttemptStats(state, topicId);
    return { topicId, accuracy: stats.accuracy };
  });
}
