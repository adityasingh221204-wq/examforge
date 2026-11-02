// Spaced repetition engine — Leitner-style stages tuned to the exam calendar.
// Stages: 0 immediate → 1 next day → 2 three days → 3 seven days → 4 fourteen days → 5 thirty days.

import type { AppState, Question, RevisionItem } from '../data/types';
import { QUESTIONS_BY_TOPIC } from '../data/bank';
import { addDays, todayKey } from './dates';

export const STAGE_INTERVALS = [0, 1, 3, 7, 14, 30];

export function stageLabel(stage: number): string {
  return ['Immediate recall', 'Next-day revision', '3-day revision', '7-day revision', '14-day revision', '30-day revision'][
    Math.min(stage, 5)
  ];
}

export function ensureRevision(state: AppState, topicId: string, today = todayKey()): AppState {
  const existing = state.revisions.find((r) => r.topicId === topicId);
  if (existing) {
    if (existing.status === 'graduated') return state;
    return state;
  }
  const subjectId = subjectOfTopic(topicId);
  const item: RevisionItem = {
    id: `rev_${topicId}`,
    topicId,
    subjectId,
    stage: 0,
    dueDate: today,
    intervalDays: 0,
    correctStreak: 0,
    wrongStreak: 0,
    history: [],
    status: 'due',
  };
  return { ...state, revisions: [...state.revisions, item] };
}

function subjectOfTopic(topicId: string): AppState['revisions'][number]['subjectId'] {
  // topic ids are prefixed by subject: dl-u1-t1 / cn-u2-t3 / nlp-u1-t1 / cloud-u3-t2
  const prefix = topicId.split('-')[0];
  if (prefix === 'dl' || prefix === 'cn' || prefix === 'nlp') return prefix;
  return 'cloud';
}

export function dueRevisions(state: AppState, today = todayKey()): RevisionItem[] {
  return state.revisions
    .filter((r) => r.status !== 'graduated' && r.dueDate <= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.stage - b.stage);
}

export function upcomingRevisions(state: AppState, today = todayKey(), days = 7): RevisionItem[] {
  const until = addDays(today, days);
  return state.revisions.filter((r) => r.status !== 'graduated' && r.dueDate > today && r.dueDate <= until);
}

/**
 * Grade one revision answer.
 * Correct → stage advances (longer interval, harder questions, fewer repetitions).
 * Wrong   → re-explanation is required by the UI, stage drops, retry scheduled tomorrow with an easier question.
 */
export function gradeRevision(
  state: AppState,
  revisionId: string,
  questionId: string,
  correct: boolean,
  today = todayKey(),
): AppState {
  const item = state.revisions.find((r) => r.id === revisionId);
  if (!item || item.status === 'graduated') return state;

  const history = [...item.history, { at: Date.now(), questionId, correct }];
  let stage = item.stage;
  let correctStreak = item.correctStreak;
  let wrongStreak = item.wrongStreak;
  let status: RevisionItem['status'] = 'scheduled';

  if (correct) {
    correctStreak += 1;
    wrongStreak = 0;
    stage = Math.min(stage + 1, 5);
    if (stage >= 5 && correctStreak >= 2) {
      status = 'graduated';
    }
  } else {
    wrongStreak += 1;
    correctStreak = 0;
    stage = Math.max(stage - 1, 0);
    status = 'due';
  }

  const interval = correct ? STAGE_INTERVALS[stage] : 1;
  const dueDate = addDays(today, Math.max(interval, correct ? interval : 1));

  const updated: RevisionItem = {
    ...item,
    stage,
    dueDate,
    intervalDays: interval,
    correctStreak,
    wrongStreak,
    history,
    status,
  };
  return { ...state, revisions: state.revisions.map((r) => (r.id === revisionId ? updated : r)) };
}

/** Pick the revision question for a topic at a stage — easier early, harder later. */
export function pickRevisionQuestion(item: RevisionItem, excludeIds: string[] = []): Question | undefined {
  const bank = QUESTIONS_BY_TOPIC[item.topicId] ?? [];
  if (bank.length === 0) return undefined;
  const maxDifficulty = item.stage <= 1 ? 2 : item.stage <= 3 ? 3 : 5;
  const minDifficulty = item.stage >= 4 ? 3 : 1;
  let candidates = bank.filter(
    (q) => q.difficulty >= minDifficulty && q.difficulty <= maxDifficulty && !excludeIds.includes(q.id),
  );
  if (candidates.length === 0) candidates = bank.filter((q) => !excludeIds.includes(q.id));
  if (candidates.length === 0) candidates = bank;

  // prefer objective early, subjective at higher stages
  const preferObjective = item.stage <= 2;
  const preferred = candidates.filter((q) =>
    preferObjective ? q.type === 'mcq' || q.type === 'multi' || q.type === 'tf' || q.type === 'fill' : true,
  );
  const list = preferred.length > 0 ? preferred : candidates;

  // deterministic pick from history length so retries rotate
  const idx = (item.history.length + item.wrongStreak) % list.length;
  return list[idx];
}

export function revisionStats(state: AppState, today = todayKey()): {
  due: number;
  scheduled: number;
  graduated: number;
  backlog: number;
} {
  const active = state.revisions.filter((r) => r.status !== 'graduated');
  return {
    due: active.filter((r) => r.dueDate <= today).length,
    scheduled: active.filter((r) => r.dueDate > today).length,
    graduated: state.revisions.filter((r) => r.status === 'graduated').length,
    backlog: active.filter((r) => r.dueDate < today).length,
  };
}
