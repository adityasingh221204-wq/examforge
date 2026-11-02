// Progress engine — status transitions, coverage percentages, mastery rules.
// Rule: a topic becomes MASTERED only after passing its independent assessment.

import type {
  AppState,
  Subject,
  SubjectId,
  SubjectStats,
  Topic,
  TopicProgress,
  TopicStatus,
  WeakTopic,
} from '../data/types';
import { SUBJECTS, TOPIC_MAP } from '../data/syllabus';
import { topicAttemptStats } from './scoring';
import { todayKey } from './dates';

export const STATUS_RANK: Record<TopicStatus, number> = {
  not_started: 0,
  in_progress: 1,
  learned: 2,
  practised: 3,
  mastered: 4,
  needs_revision: 5,
};

/** statuses that count as syllabus "covered" (first-pass completion) */
export const COVERED_STATUSES: TopicStatus[] = ['learned', 'practised', 'mastered'];

export function emptyProgress(): TopicProgress {
  return { status: 'not_started', studyMinutes: 0, assessments: [] };
}

export function getProgress(state: AppState, topicId: string): TopicProgress {
  return state.progress[topicId] ?? emptyProgress();
}

export function getStatus(state: AppState, topicId: string): TopicStatus {
  return getProgress(state, topicId).status;
}

export function isCovered(state: AppState, topicId: string): boolean {
  return COVERED_STATUSES.includes(getStatus(state, topicId));
}

/** merge transition: never silently downgrade; needs_revision can be cleared by practice */
export function nextStatus(current: TopicStatus, desired: TopicStatus): TopicStatus {
  if (desired === 'not_started') return current;
  if (current === 'mastered' && desired !== 'needs_revision') return current;
  if (desired === 'in_progress' && current !== 'not_started') return current;
  if (desired === 'learned' && STATUS_RANK[current] >= STATUS_RANK.learned && current !== 'needs_revision') {
    return current;
  }
  if (desired === 'practised' && STATUS_RANK[current] >= STATUS_RANK.practised && current !== 'needs_revision') {
    return current;
  }
  return desired;
}

export function setStatus(state: AppState, topicId: string, desired: TopicStatus, now = Date.now()): AppState {
  const cur = getProgress(state, topicId);
  const status = nextStatus(cur.status, desired);
  const progress = {
    ...cur,
    status,
    lastStudiedAt: desired === 'not_started' ? cur.lastStudiedAt : now,
  };
  return { ...state, progress: { ...state.progress, [topicId]: progress } };
}

export function logStudy(state: AppState, topicId: string, minutes: number, date = todayKey()): AppState {
  const cur = getProgress(state, topicId);
  const progress: TopicProgress = {
    ...cur,
    studyMinutes: cur.studyMinutes + minutes,
    lastStudiedAt: Date.now(),
    status: cur.status === 'not_started' ? 'in_progress' : cur.status === 'needs_revision' ? 'needs_revision' : cur.status,
  };
  const log = [...state.studyLog];
  const idx = log.findIndex((l) => l.date === date);
  if (idx >= 0) {
    const entry = log[idx];
    const topicIds = entry.topicIds.includes(topicId) ? entry.topicIds : [...entry.topicIds, topicId];
    log[idx] = { ...entry, minutes: entry.minutes + minutes, topicIds };
  } else {
    log.push({ date, minutes, topicIds: [topicId] });
  }
  return { ...state, progress: { ...state.progress, [topicId]: progress }, studyLog: log };
}

/** mark topics as first-pass learned from a completed study session */
export function markLearned(state: AppState, topicIds: string[]): AppState {
  let next = state;
  for (const id of topicIds) next = setStatus(next, id, 'learned');
  return next;
}

/** record an independent assessment result — the only path to MASTERED */
export function recordAssessment(
  state: AppState,
  topicId: string,
  score: number,
  total: number,
  now = Date.now(),
): AppState {
  const cur = getProgress(state, topicId);
  const percent = total > 0 ? (score / total) * 100 : 0;
  const passed = percent >= state.settings.passPercent;
  const assessments = [...cur.assessments, { at: now, score, total }];
  let status: TopicStatus = cur.status;
  if (passed) {
    status = 'mastered';
  } else if (cur.status !== 'mastered') {
    status = 'needs_revision';
  }
  return {
    ...state,
    progress: {
      ...state.progress,
      [topicId]: { ...cur, status, assessments, lastStudiedAt: now },
    },
  };
}

/** a wrong answer during practice/revision flags the topic */
export function flagWeak(state: AppState, topicId: string): AppState {
  const cur = getProgress(state, topicId);
  if (cur.status === 'mastered') return state;
  return { ...state, progress: { ...state.progress, [topicId]: { ...cur, status: 'needs_revision' } } };
}

export function clearWeakFlag(state: AppState, topicId: string): AppState {
  const cur = getProgress(state, topicId);
  if (cur.status !== 'needs_revision') return state;
  const covered = cur.assessments.length > 0;
  return {
    ...state,
    progress: { ...state.progress, [topicId]: { ...cur, status: covered ? 'practised' : 'learned' } },
  };
}

export function subjectStats(state: AppState, subject: Subject): SubjectStats {
  const topics = subject.units.flatMap((u) => u.topics);
  let covered = 0;
  let practised = 0;
  let mastered = 0;
  let needsRevision = 0;
  for (const t of topics) {
    const s = getStatus(state, t.id);
    if (COVERED_STATUSES.includes(s)) covered += 1;
    if (s === 'practised' || s === 'mastered') practised += 1;
    if (s === 'mastered') mastered += 1;
    if (s === 'needs_revision') needsRevision += 1;
  }
  const total = topics.length;
  return {
    subjectId: subject.id,
    totalTopics: total,
    covered,
    practised,
    mastered,
    needsRevision,
    percent: total ? Math.round((covered / total) * 100) : 0,
    masteryPercent: total ? Math.round((mastered / total) * 100) : 0,
  };
}

export function overallCoverage(state: AppState): {
  covered: number;
  total: number;
  percent: number;
  mastered: number;
  practised: number;
  needsRevision: number;
} {
  const topics = SUBJECTS.flatMap((s) => s.units.flatMap((u) => u.topics));
  let covered = 0;
  let mastered = 0;
  let practised = 0;
  let needsRevision = 0;
  for (const t of topics) {
    const s = getStatus(state, t.id);
    if (COVERED_STATUSES.includes(s)) covered += 1;
    if (s === 'mastered') mastered += 1;
    if (s === 'practised') practised += 1;
    if (s === 'needs_revision') needsRevision += 1;
  }
  return {
    covered,
    total: topics.length,
    percent: topics.length ? Math.round((covered / topics.length) * 100) : 0,
    mastered,
    practised,
    needsRevision,
  };
}

export function unitCoverage(state: AppState, unitId: string): { covered: number; total: number; percent: number } {
  const topics = Object.values(TOPIC_MAP).filter((t) => t.unitId === unitId);
  const covered = topics.filter((t) => isCovered(state, t.id)).length;
  return { covered, total: topics.length, percent: topics.length ? Math.round((covered / topics.length) * 100) : 0 };
}

/**
 * Weakest topics: combines assessment results, attempt accuracy and revision failures.
 * Lower score = weaker. Only topics that have been touched appear; untouched topics
 * near an exam surface via `urgent` flagging from the scheduler instead.
 */
export function weakestTopics(state: AppState, limit = 8): WeakTopic[] {
  const out: WeakTopic[] = [];
  for (const subject of SUBJECTS) {
    for (const unit of subject.units) {
      for (const topic of unit.topics) {
        const p = getProgress(state, topic.id);
        const attempts = topicAttemptStats(state, topic.id);
        if (p.assessments.length === 0 && attempts.attempted === 0 && p.status === 'not_started') continue;
        let score = 70;
        if (p.status === 'needs_revision') score -= 30;
        if (p.status === 'not_started') score -= 20;
        if (p.status === 'learned') score -= 8;
        if (p.status === 'practised') score += 6;
        if (p.status === 'mastered') score += 25;
        if (p.assessments.length > 0) {
          const last = p.assessments[p.assessments.length - 1];
          const pct = (last.score / Math.max(1, last.total)) * 100;
          score += (pct - state.settings.passPercent) / 3;
        }
        if (attempts.attempted > 0) {
          score += (attempts.accuracy - 0.6) * 30;
        }
        const wrongRevs = state.revisions
          .filter((r) => r.topicId === topic.id)
          .reduce((n, r) => n + r.wrongStreak, 0);
        score -= wrongRevs * 6;
        const reason =
          p.status === 'needs_revision'
            ? 'Flagged for revision'
            : attempts.attempted > 0 && attempts.accuracy < 0.6
              ? `Low accuracy (${Math.round(attempts.accuracy * 100)}%)`
              : p.assessments.length > 0 &&
                  (p.assessments[p.assessments.length - 1].score /
                    Math.max(1, p.assessments[p.assessments.length - 1].total)) *
                    100 <
                    state.settings.passPercent
                ? 'Failed independent assessment'
                : wrongRevs > 0
                  ? 'Repeated revision errors'
                  : 'Needs practice';
        out.push({
          topicId: topic.id,
          subjectId: subject.id,
          name: topic.name,
          unitName: unit.name,
          reason,
          score: Math.round(score),
        });
      }
    }
  }
  out.sort((a, b) => a.score - b.score);
  return out.slice(0, limit);
}

export function strongestTopics(state: AppState, limit = 8): WeakTopic[] {
  const out: WeakTopic[] = [];
  for (const subject of SUBJECTS) {
    for (const unit of subject.units) {
      for (const topic of unit.topics) {
        const p = getProgress(state, topic.id);
        if (p.status !== 'mastered' && p.status !== 'practised') continue;
        const attempts = topicAttemptStats(state, topic.id);
        let score = p.status === 'mastered' ? 75 : 55;
        if (p.assessments.length > 0) {
          const last = p.assessments[p.assessments.length - 1];
          score += (last.score / Math.max(1, last.total)) * 25;
        }
        if (attempts.attempted > 0) score += attempts.accuracy * 20;
        out.push({
          topicId: topic.id,
          subjectId: subject.id,
          name: topic.name,
          unitName: unit.name,
          reason: p.status === 'mastered' ? 'Passed independent assessment' : 'Practised successfully',
          score: Math.round(score),
        });
      }
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}

export function topicsBySubject(subjectId: SubjectId): Topic[] {
  const subject = SUBJECTS.find((s) => s.id === subjectId)!;
  return subject.units.flatMap((u) => u.topics);
}
