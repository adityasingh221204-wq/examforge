// Scoring engine — objective grading, rubric-based answer evaluation, mock assembly.
// The answer evaluator is a deterministic local engine (no external AI).

import type { AppState, Difficulty, MockResult, Question, QuestionType, SubjectId } from '../data/types';
import { ALL_QUESTIONS, QUESTIONS_BY_TOPIC } from '../data/bank';

export function questionById(id: string): Question | undefined {
  return ALL_QUESTIONS.find((q) => q.id === id);
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- objective grading

export function gradeObjective(question: Question, selected: number[]): boolean {
  const correct = question.answerIndex ?? [];
  if (correct.length === 0) return false;
  if (selected.length !== correct.length) return false;
  const a = [...selected].sort((x, y) => x - y);
  const b = [...correct].sort((x, y) => x - y);
  return a.every((v, i) => v === b[i]);
}

export function isObjective(type: QuestionType): boolean {
  return type === 'mcq' || type === 'multi' || type === 'fill' || type === 'tf';
}

// ---------------------------------------------------------------- answer evaluator

export interface RubricEvaluation {
  score: number;
  maxScore: number;
  percent: number;
  matched: { point: string; marks: number }[];
  missed: { point: string; marks: number; keywords: string[] }[];
  wordCount: number;
  idealWords: [number, number];
  structureHit: number;
  structureTotal: number;
  feedback: string[];
  fullMarks: boolean;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function idealWordRange(marks: number): [number, number] {
  if (marks <= 3) return [60, 130];
  if (marks === 4) return [110, 180];
  return [170, 280];
}

/**
 * Evaluate a subjective answer against the question's mark-wise rubric.
 * A rubric point is awarded when at least half of its keywords appear
 * (all keywords when the point lists two or fewer).
 * Full marks are impossible unless every rubric point is matched.
 */
export function evaluateAnswer(question: Question, answerText: string): RubricEvaluation {
  const norm = normalize(answerText);
  const words = answerText.trim().split(/\s+/).filter(Boolean);
  const matched: { point: string; marks: number }[] = [];
  const missed: { point: string; marks: number; keywords: string[] }[] = [];
  let score = 0;

  for (const point of question.rubric) {
    const kws = point.keywords.map(normalize).filter(Boolean);
    const needed = kws.length <= 2 ? kws.length : Math.ceil(kws.length / 2);
    const hits = kws.filter((k) => norm.includes(k)).length;
    if (needed > 0 && hits >= needed) {
      matched.push({ point: point.point, marks: point.marks });
      score += point.marks;
    } else {
      missed.push({ point: point.point, marks: point.marks, keywords: point.keywords });
    }
  }

  score = Math.min(score, question.marks);
  const [lo, hi] = idealWordRange(question.marks);
  const structureTotal = question.structure.length;
  // structure steps counted as present when a distinctive chunk of each appears
  const structureHit = question.structure.filter((step) => {
    const key = normalize(step).split(' ').filter((w) => w.length > 4).slice(0, 2).join(' ');
    return key ? norm.includes(key) : true;
  }).length;

  const feedback: string[] = [];
  const fullMarks = score >= question.marks && matched.length === question.rubric.length;

  if (words.length < lo) {
    feedback.push(
      `Answer is short (${words.length} words). A ${question.marks}-mark answer needs roughly ${lo}–${hi} words.`,
    );
  } else if (words.length > hi * 1.8) {
    feedback.push(`Answer is long (${words.length} words). Trim to the ${lo}–${hi} word range and cut repetition.`);
  }
  if (missed.length > 0) {
    feedback.push(`Missing marks: ${missed.map((m) => `“${m.point}” (${m.marks})`).join(', ')}.`);
  }
  if (structureHit < structureTotal) {
    feedback.push(`Follow the expected structure: ${question.structure.join(' → ')}.`);
  }
  if (!fullMarks && score === question.marks) {
    feedback.push('All rubric points matched — but keep every point explicit; examiners award only for written content.');
  }
  if (fullMarks && words.length < lo) {
    feedback.push('Content is correct but too brief for full-length treatment in an exam.');
  }
  if (feedback.length === 0) {
    feedback.push('Strong answer: all rubric points present with correct terminology and structure.');
  }

  return {
    score,
    maxScore: question.marks,
    percent: Math.round((score / question.marks) * 100),
    matched,
    missed,
    wordCount: words.length,
    idealWords: [lo, hi],
    structureHit,
    structureTotal,
    feedback,
    fullMarks: fullMarks && words.length >= lo * 0.7,
  };
}

// ---------------------------------------------------------------- attempt stats

export interface AttemptStats {
  attempted: number;
  correct: number;
  accuracy: number;
}

export function topicAttemptStats(state: AppState, topicId: string): AttemptStats {
  const ids = new Set(QUESTIONS_BY_TOPIC[topicId]?.map((q) => q.id) ?? []);
  const attempts = state.attempts.filter((a) => ids.has(a.questionId));
  let correct = 0;
  for (const a of attempts) {
    if (a.correct !== undefined) {
      if (a.correct) correct += 1;
    } else if (a.score !== undefined && a.maxScore !== undefined && a.maxScore > 0) {
      if (a.score / a.maxScore >= 0.5) correct += 1;
    }
  }
  return { attempted: attempts.length, correct, accuracy: attempts.length ? correct / attempts.length : 0 };
}

export function numericalAccuracy(state: AppState): { attempted: number; correct: number; percent: number } {
  const attempts = state.attempts.filter((a) => {
    const q = questionById(a.questionId);
    return q?.type === 'numerical';
  });
  let correct = 0;
  for (const a of attempts) {
    if (a.correct) correct += 1;
    else if (a.score !== undefined && a.maxScore !== undefined && a.maxScore > 0 && a.score >= a.maxScore * 0.9) correct += 1;
  }
  return {
    attempted: attempts.length,
    correct,
    percent: attempts.length ? Math.round((correct / attempts.length) * 100) : 0,
  };
}

// ---------------------------------------------------------------- mock assembly

export interface MockConfig {
  label: string;
  kind: MockResult['kind'];
  subjectId?: SubjectId;
  unitIds?: string[];
  topicIds?: string[];
  objectiveCount: number;
  subjectiveCount: number;
  durationSec: number;
  seed: number;
  /** advanced papers draw only hard questions */
  minDifficulty?: Difficulty;
}

function pick<T>(arr: T[], n: number, rnd: () => number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    const i = Math.floor(rnd() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

/** Assemble a balanced mock: objective + subjective spread across topics with a difficulty gradient. */
export function assembleMock(config: MockConfig): Question[] {
  const rnd = mulberry32(config.seed);
  let pool = ALL_QUESTIONS.filter((q) => {
    if (config.subjectId && q.subjectId !== config.subjectId) return false;
    if (config.unitIds && config.unitIds.length > 0 && !config.unitIds.includes(q.unitId)) return false;
    if (config.topicIds && config.topicIds.length > 0 && !config.topicIds.includes(q.topicId)) return false;
    if (config.minDifficulty && q.difficulty < config.minDifficulty) return false;
    return true;
  });
  if (pool.length === 0) return [];

  // unique topics first for coverage, then difficulty gradient (harder later)
  const topics = [...new Set(pool.map((q) => q.topicId))];
  const perTopic: Question[] = [];
  for (const t of topics) {
    const tp = pool.filter((q) => q.topicId === t);
    perTopic.push(tp[Math.floor(rnd() * tp.length)]);
  }
  const objectivePool = pool.filter((q) => isObjective(q.type) && q.type !== 'fill' && q.type !== 'tf');
  const subjectivePool = pool.filter((q) => !isObjective(q.type) || q.type === 'fill' || q.type === 'tf');

  const objectives = pick(objectivePool, config.objectiveCount, rnd);
  const subjectives = pick(subjectivePool, config.subjectiveCount, rnd);

  const used = new Set([...objectives, ...subjectives].map((q) => q.id));
  // fill from per-topic picks if pools were small
  for (const q of perTopic) {
    if (used.size >= config.objectiveCount + config.subjectiveCount) break;
    if (!used.has(q.id)) {
      used.add(q.id);
      if (isObjective(q.type) && objectives.length < config.objectiveCount) objectives.push(q);
      else subjectives.push(q);
    }
  }

  const all = [...objectives, ...subjectives].sort((a, b) => {
    if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
    return a.topicId.localeCompare(b.topicId);
  });
  return all;
}

export function totalMarksOf(questions: Question[]): number {
  return questions.reduce((n, q) => n + q.marks, 0);
}
