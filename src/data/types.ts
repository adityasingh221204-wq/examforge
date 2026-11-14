// EXAMFORGE — core type system
// All data shapes for syllabus, teaching content, questions, progress, scheduling.

import type { AnswerProgress } from './answerMaster/types';

export type SubjectId = 'dl' | 'cn' | 'nlp' | 'cloud';

export type TopicStatus =
  | 'not_started'
  | 'in_progress'
  | 'learned'
  | 'practised'
  | 'mastered'
  | 'needs_revision';

export const STATUS_LABELS: Record<TopicStatus, string> = {
  not_started: 'NOT STARTED',
  in_progress: 'IN PROGRESS',
  learned: 'LEARNED',
  practised: 'PRACTISED',
  mastered: 'MASTERED',
  needs_revision: 'NEEDS REVISION',
};

export const STATUS_ORDER: TopicStatus[] = [
  'not_started',
  'in_progress',
  'learned',
  'practised',
  'mastered',
  'needs_revision',
];

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: 'Beginner',
  2: 'Basic',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Examination-level challenge',
};

export type Marks = 3 | 4 | 5;

// ---------------------------------------------------------------- syllabus

export interface Topic {
  id: string;
  subjectId: SubjectId;
  unitId: string;
  /** Official syllabus terminology — never rewritten. */
  name: string;
  subtopics: string[];
  /** true when the topic carries prescribed numerical problems. */
  numerical: boolean;
  /** extra knowledge beyond official syllabus (always labelled supplementary in UI). */
  supplementary?: boolean;
}

export interface Unit {
  id: string;
  subjectId: SubjectId;
  order: number;
  name: string;
  hours: number;
  topics: Topic[];
}

export interface Book {
  title: string;
  author: string;
  publisher: string;
}

export interface Subject {
  id: SubjectId;
  name: string;
  code: string;
  credits: number;
  level: number;
  objectives: string[];
  books: Book[];
  hours: number;
  examDate: string; // ISO date
  examStart: string; // "09:30"
  examEnd: string; // "11:30"
  units: Unit[];
}

// ---------------------------------------------------------------- diagrams

export type DiagramSpec =
  | { kind: 'flow'; title: string; steps: string[] }
  | { kind: 'arch'; title: string; layers: { label: string; items: string[] }[] }
  | { kind: 'sequence'; title: string; messages: { from: string; to: string; label: string }[] }
  | { kind: 'compare'; title: string; columns: string[]; rows: { label: string; cells: string[] }[] };

// ---------------------------------------------------------------- teaching content (5 levels)

export interface Formula {
  name: string;
  expr: string;
  when: string;
}

export interface TopicContent {
  topicId: string;
  objectives: string[];
  /** Level 1 — zero-level explanation */
  zero: {
    what: string;
    why: string;
    problem: string;
    how: string;
    where: string;
  };
  /** Level 2 — technical understanding */
  tech: {
    definition: string;
    architecture: string;
    components: string[];
    math?: string;
    advantages: string[];
    disadvantages: string[];
    limitations?: string[];
  };
  /** Level 3 — visual learning */
  diagram?: DiagramSpec;
  comparison?: { title: string; columns: string[]; rows: { label: string; cells: string[] }[] };
  formulas?: Formula[];
  /** Level 4 — practical application */
  examples: string[];
  applications: string[];
  code?: { language: string; title: string; snippet: string };
  /** Level 5 — examination readiness building blocks */
  definitions: { term: string; def: string }[];
}

// ---------------------------------------------------------------- questions

export type QuestionType =
  | 'mcq'
  | 'multi'
  | 'fill'
  | 'tf'
  | 'short'
  | 'long'
  | 'numerical'
  | 'coding'
  | 'diagram'
  | 'case'
  | 'application'
  | 'assertion'
  | 'compare';

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'MCQ',
  multi: 'Multiple-select',
  fill: 'Fill in the blank',
  tf: 'True / False with justification',
  short: 'Short answer',
  long: 'Structured long answer',
  numerical: 'Numerical',
  coding: 'Coding',
  diagram: 'Diagram',
  case: 'Case study',
  application: 'Application scenario',
  assertion: 'Assertion & reasoning',
  compare: 'Compare & contrast',
};

export interface RubricPoint {
  marks: number;
  point: string;
  keywords: string[];
}

export interface Question {
  id: string;
  subjectId: SubjectId;
  unitId: string;
  topicId: string;
  type: QuestionType;
  marks: Marks;
  difficulty: Difficulty;
  stem: string;
  options?: string[];
  /** indexes of correct options (mcq / multi) */
  answerIndex?: number[];
  /** model answer for subjective / objective-text questions */
  answerText?: string;
  /** expected answer structure (how to organise the answer) */
  structure: string[];
  explanation: string;
  mistakes: string[];
  /** mark-wise evaluation rubric */
  rubric: RubricPoint[];
  diagramRequired?: boolean;
}

// ---------------------------------------------------------------- numerical lab

export interface NumericalParam {
  name: string;
  label: string;
  value: number;
  unit?: string;
  /** randomised range for practice mode */
  range: [number, number];
  decimals?: number;
}

export interface SolvedStep {
  title: string;
  expr: string;
  note?: string;
}

export interface NumericalSpec {
  id: string;
  subjectId: SubjectId;
  unitId: string;
  topicId: string;
  category: string;
  problemTemplate: string;
  params: NumericalParam[];
  required: string[];
  formula: string;
  why: string;
  solve: (p: Record<string, number>) => { steps: SolvedStep[]; answer: string };
  mistakes: string[];
}

export interface NumericalInstance {
  spec: NumericalSpec;
  params: Record<string, number>;
  problem: string;
}

// ---------------------------------------------------------------- progress & attempts

export interface AssessmentRecord {
  at: number;
  score: number;
  total: number;
}

export interface TopicProgress {
  status: TopicStatus;
  lastStudiedAt?: number;
  studyMinutes: number;
  assessments: AssessmentRecord[];
}

export interface Attempt {
  id: string;
  questionId: string;
  at: number;
  source: 'bank' | 'mock' | 'practice' | 'revision';
  mockId?: string;
  /** for objective */
  correct?: boolean;
  /** for subjective */
  score?: number;
  maxScore?: number;
  timeSec?: number;
  answerGiven?: string;
}

export interface MockQuestionResult {
  questionId: string;
  awarded: number;
  max: number;
  correct?: boolean;
  timeSec: number;
}

export interface MockResult {
  id: string;
  label: string;
  kind: 'unit' | 'topic' | 'mixed' | 'full' | 'advanced';
  subjectId?: SubjectId;
  scope: string;
  startedAt: number;
  submittedAt: number;
  durationSec: number;
  totalMarks: number;
  score: number;
  objectiveScore: number;
  subjectiveScore: number;
  perQuestion: MockQuestionResult[];
  weakTopics: string[];
  strongTopics: string[];
  autoSubmitted: boolean;
}

// ---------------------------------------------------------------- planner

export type BlockKind = 'study' | 'break' | 'routine' | 'personal';

export interface DayBlock {
  id: string;
  start: string; // "08:30"
  end: string; // "10:30"
  label: string;
  kind: BlockKind;
}

/** "sprint" is the legacy name for a first-pass learning session. */
export type SessionKind = 'sprint' | 'revision' | 'mock' | 'practice' | 'routine' | 'exam' | 'admin';

export interface StudySession {
  id: string;
  date: string; // yyyy-mm-dd
  blockId: string;
  start: string;
  end: string;
  minutes: number;
  subjectId: SubjectId;
  unitId?: string;
  topicIds: string[];
  objectives: string[];
  material: string;
  questionsToSolve: string[];
  criteria: string;
  done: boolean;
  missed?: boolean;
  kind: SessionKind;
  compulsory?: boolean;
  /** short human title for the session, e.g. `Deep Learning Unit 2 — first 6 topics` */
  title?: string;
  /** set when the session belongs to a named plan */
  planId?: string;
  /** topics moved into this session after an earlier session was missed */
  carryOver?: string[];
}

export type ScheduleMode = 'sprint' | 'examwise' | 'plan';

export interface Timetable {
  mode: ScheduleMode;
  generatedAt: number;
  sessions: StudySession[];
  /** id of the plan this timetable was built from, when mode === 'plan' */
  planId?: string;
}

/** A named, date-wise examination plan that is currently driving the timetable. */
export interface ActivePlan {
  id: string;
  version?: number;
  title: string;
  activatedAt: number;
  start: string;
  end: string;
}

/** Local reminder preferences. A web app can only notify while it is open. */
export interface ReminderPrefs {
  desktopEnabled: boolean;
  /** daily revision reminder, hh:mm local */
  dailyTime: string;
  /** hours before an examination to remind */
  examLeadHours: number[];
  /** `${kind}:${date}` keys already delivered, so a reminder fires once */
  lastFired: Record<string, string>;
}

// ---------------------------------------------------------------- revision (spaced repetition)

export interface RevisionEvent {
  at: number;
  questionId: string;
  correct: boolean;
}

export interface RevisionItem {
  id: string;
  topicId: string;
  subjectId: SubjectId;
  /** 0 = immediate, 1 = next day, 2 = 3 days, 3 = 7 days, 4 = 14 days, 5 = 30 days */
  stage: number;
  dueDate: string; // yyyy-mm-dd
  intervalDays: number;
  correctStreak: number;
  wrongStreak: number;
  history: RevisionEvent[];
  status: 'scheduled' | 'due' | 'graduated';
}

// ---------------------------------------------------------------- study material (ingest)

/** Shape of a single imported block, inferred from its wording. */
export type MaterialSectionKind =
  | 'definition'
  | 'formula'
  | 'example'
  | 'procedure'
  | 'comparison'
  | 'notes';

export const MATERIAL_KIND_LABELS: Record<MaterialSectionKind, string> = {
  definition: 'Definition',
  formula: 'Formula',
  example: 'Worked example',
  procedure: 'Procedure',
  comparison: 'Comparison',
  notes: 'Notes',
};

/** One analysed block of an imported document, filed under a syllabus topic. */
export interface MaterialAttachment {
  id: string;
  sourceId: string;
  sourceName: string;
  subjectId: SubjectId;
  unitId: string;
  topicId: string;
  title: string;
  kind: MaterialSectionKind;
  body: string;
  summary: string;
  keyTerms: string[];
  /** 0–100 confidence that this block belongs to `topicId`. */
  confidence: number;
  /** human-readable reasons for the match, e.g. `phrase "backpropagation"` */
  signals: string[];
  addedAt: number;
  words: number;
}

/** Provenance record for one imported file or pasted document. */
export interface MaterialSource {
  id: string;
  name: string;
  mime: string;
  bytes: number;
  addedAt: number;
  /** the subject the user picked, or 'auto' when detection was used */
  subjectId: SubjectId | 'auto';
  sections: number;
  attached: number;
  words: number;
}

// ---------------------------------------------------------------- settings & root state

export interface Settings {
  wake: string;
  sleep: string;
  blocks: DayBlock[];
  dailyTargetMin: number;
  travelStart: string;
  travelEnd: string;
  passPercent: number;
}

export interface DailyStudyLog {
  date: string;
  minutes: number;
  topicIds: string[];
}

export interface AppState {
  version: number;
  progress: Record<string, TopicProgress>;
  plan: ActivePlan | null;
  reminders: ReminderPrefs;
  sessions: StudySession[];
  timetable: Timetable | null;
  attempts: Attempt[];
  mocks: MockResult[];
  revisions: RevisionItem[];
  studyLog: DailyStudyLog[];
  /** Answer Master progress, keyed by imported question id (never the answer text) */
  answers: Record<string, AnswerProgress>;
  /** imported study material, already filed under syllabus topics */
  materials: MaterialAttachment[];
  materialSources: MaterialSource[];
  settings: Settings;
  seeded: boolean;
}

// ---------------------------------------------------------------- analytics view models

export interface SubjectStats {
  subjectId: SubjectId;
  totalTopics: number;
  covered: number; // learned or beyond
  practised: number;
  mastered: number;
  needsRevision: number;
  percent: number; // coverage %
  masteryPercent: number;
}

export interface WeakTopic {
  topicId: string;
  subjectId: SubjectId;
  name: string;
  unitName: string;
  reason: string;
  score: number; // lower = weaker
}
