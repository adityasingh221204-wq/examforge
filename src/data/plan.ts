// EXAMFORGE — the active examination plan (12–26 November 2026, IST).
// Declarative only: the engine resolves syllabus topics, builds sessions and keeps ids stable.
// Every slot is a real block of the day, exam mornings are never used for new material,
// and nothing here touches topic progress — coverage and mastery stay in the tracker.

import type { SessionKind, SubjectId } from './types';

export const PLAN_ID = 'exams-nov-2026';
/** Bump when the declared slots change, so an open browser rebuilds its future sessions. */
export const PLAN_REVISION = 2;
export const PLAN_TITLE = 'Four-paper examination plan';
export const PLAN_START = '2026-11-12';
export const PLAN_END = '2026-11-26';

/** A slice of one syllabus unit, 1-based and inclusive. Omit `from`/`to` for the whole unit. */
export interface TopicSlice {
  subjectId: SubjectId;
  unit: number;
  from?: number;
  to?: number;
}

export interface PlanSlot {
  start: string;
  end: string;
  title: string;
  kind: SessionKind;
  subjectId?: SubjectId;
  topics?: TopicSlice[];
  /** resolve the weakest topics of this subject from real assessment/progress data */
  weakOf?: SubjectId;
  note?: string;
  optional?: boolean;
}

export interface PlanDay {
  date: string;
  label: string;
  slots: PlanSlot[];
}

const dl = (unit: number, from?: number, to?: number): TopicSlice => ({ subjectId: 'dl', unit, from, to });
const cn = (unit: number, from?: number, to?: number): TopicSlice => ({ subjectId: 'cn', unit, from, to });
const nlp = (unit: number, from?: number, to?: number): TopicSlice => ({ subjectId: 'nlp', unit, from, to });
const cloud = (unit: number, from?: number, to?: number): TopicSlice => ({ subjectId: 'cloud', unit, from, to });

const learn = (start: string, end: string, subjectId: SubjectId, title: string, topics: TopicSlice[], note?: string): PlanSlot => ({
  start,
  end,
  title,
  kind: 'sprint',
  subjectId,
  topics,
  note,
});

const practice = (
  start: string,
  end: string,
  subjectId: SubjectId,
  title: string,
  topics: TopicSlice[] | undefined,
  note: string,
): PlanSlot => ({ start, end, title, kind: 'practice', subjectId, topics, note });

const recall = (start: string, end: string, subjectId: SubjectId, title: string, topics?: TopicSlice[]): PlanSlot => ({
  start,
  end,
  title,
  kind: 'revision',
  subjectId,
  topics,
  note: 'Active recall only: close the notes, answer aloud, then check and repair one gap at a time.',
});

const mock = (start: string, end: string, subjectId: SubjectId, title: string): PlanSlot => ({
  start,
  end,
  title,
  kind: 'mock',
  subjectId,
  note: 'Full paper under 120-minute timer conditions, then read the report and log your mistakes.',
});

const routine = (start: string, end: string, title: string, optional = false): PlanSlot => ({
  start,
  end,
  title,
  kind: 'routine',
  optional,
});

const exam = (start: string, end: string, subjectId: SubjectId, title: string): PlanSlot => ({
  start,
  end,
  title,
  kind: 'exam',
  subjectId,
  note: 'University examination. No study scheduled before it beyond a light revision pass.',
});

/** The same examination-day morning for every paper: wake, light revision, travel, arrive, sit the paper. */
function examMorning(subjectId: SubjectId, code: string, name: string): PlanSlot[] {
  return [
    routine('06:45', '07:30', 'Wake up, breakfast and freshening up'),
    recall('07:30', '08:00', subjectId, 'Light revision — formulas, diagrams and definitions'),
    routine('08:00', '08:30', 'Travel to campus'),
    routine('08:30', '09:30', 'Campus arrival and examination preparation'),
    exam('09:30', '11:30', subjectId, `${name} — ${code} examination (09:30–11:30)`),
  ];
}

export const PLAN_DAYS: PlanDay[] = [
  {
    date: '2026-11-12',
    label: 'Tonight — Deep Learning fundamentals',
    slots: [
      {
        start: '19:00',
        end: '20:15',
        title: 'Deep Learning fundamentals — orientation',
        kind: 'practice',
        subjectId: 'dl',
        topics: [dl(1, 1, 3)],
        note: 'Orientation only: what a network is, why depth helps, and the vocabulary you will meet tomorrow. Unit 1 gets its full first pass tomorrow morning.',
      },
      routine('20:15', '20:45', 'Dinner'),
      {
        start: '20:45',
        end: '21:30',
        title: 'Forward propagation and backpropagation fundamentals',
        kind: 'practice',
        subjectId: 'dl',
        topics: [dl(2, 5, 5), dl(2, 8, 8)],
        note: 'Concept primer for tomorrow: one forward pass, one backward pass, then explain the chain rule aloud. Unit 2 gets its full first pass tomorrow.',
      },
      {
        start: '21:30',
        end: '21:45',
        title: "Prepare tomorrow's study material",
        kind: 'admin',
        subjectId: 'dl',
        note: 'Open Learn → the three sessions planned for tomorrow, download the book file and set out the numerical set.',
      },
    ],
  },
  {
    date: '2026-11-13',
    label: 'Deep Learning Units 1–2 · Computer Networks Unit 1',
    slots: [
      learn('08:30', '10:30', 'dl', 'Deep Learning Unit 1 — first pass', [dl(1)]),
      learn('11:00', '13:00', 'dl', 'Deep Learning Unit 2 — first 6 topics', [dl(2, 1, 6)]),
      learn('14:00', '15:30', 'cn', 'Computer Networks Unit 1', [cn(1)]),
      practice('16:00', '17:30', 'dl', 'Deep Learning practice — Units 1 and 2', [dl(1), dl(2, 1, 6)], 'Objective set first, then two 5-mark answers written in full.'),
      recall('19:30', '20:30', 'cn', 'Computer Networks recall — Unit 1', [cn(1)]),
    ],
  },
  {
    date: '2026-11-14',
    label: 'Deep Learning Units 2–3 · Computer Networks Unit 2',
    slots: [
      learn('08:30', '10:30', 'dl', 'Deep Learning Unit 2 — remaining topics', [dl(2, 7)]),
      learn('11:00', '13:00', 'dl', 'Deep Learning Unit 3 — first 5 topics', [dl(3, 1, 5)]),
      learn('14:00', '15:30', 'cn', 'Computer Networks Unit 2', [cn(2)]),
      practice('16:00', '17:30', 'dl', 'Deep Learning numericals and practice', [dl(2, 7), dl(3, 1, 5)], 'Numerical Lab: one backpropagation-by-hand and one gradient-update problem, then the algorithmic questions.'),
      recall('19:30', '20:30', 'cn', 'Computer Networks recall — Units 1 and 2', [cn(1), cn(2)]),
    ],
  },
  {
    date: '2026-11-15',
    label: 'Deep Learning Units 3–4 · Computer Networks Unit 3',
    slots: [
      learn('08:30', '10:30', 'dl', 'Deep Learning Unit 3 — remaining topics', [dl(3, 6)]),
      learn('11:00', '13:00', 'dl', 'Deep Learning Unit 4 — first 8 topics', [dl(4, 1, 8)]),
      learn('14:00', '15:30', 'cn', 'Computer Networks Unit 3', [cn(3)]),
      practice('16:00', '17:30', 'dl', 'Deep Learning practice — Units 3 and 4', [dl(3, 6), dl(4, 1, 8)], 'Optimiser comparison table from memory, then the SGD/Adam numerical set.'),
      recall('19:30', '20:30', 'cn', 'Computer Networks recall — Unit 3', [cn(3)]),
    ],
  },
  {
    date: '2026-11-16',
    label: 'Deep Learning Units 4–5 · final mock · Computer Networks Unit 4',
    slots: [
      learn('08:30', '10:30', 'dl', 'Deep Learning Unit 4 — remaining topics', [dl(4, 9)]),
      learn('11:00', '13:00', 'dl', 'Deep Learning Unit 5', [dl(5)]),
      learn('14:00', '15:30', 'cn', 'Computer Networks Unit 4 — first 6 topics', [cn(4, 1, 6)]),
      mock('16:00', '17:30', 'dl', 'Deep Learning full-length mock examination and analysis'),
      recall('19:30', '20:30', 'dl', 'Deep Learning final revision', [dl(4, 9), dl(5)]),
    ],
  },
  {
    date: '2026-11-17',
    label: 'Deep Learning examination · Computer Networks Unit 4 finish',
    slots: [
      ...examMorning('dl', 'TE7753', 'Deep Learning'),
      routine('12:00', '16:00', 'Rest and recovery after the paper', true),
      learn('16:00', '17:30', 'cn', 'Computer Networks Unit 4 — remaining 6 topics', [cn(4, 7, 12)]),
      learn('19:30', '20:30', 'cn', 'Computer Networks Unit 5 — first 3 topics', [cn(5, 1, 3)]),
    ],
  },
  {
    date: '2026-11-18',
    label: 'Computer Networks Unit 5 · full revision · mock',
    slots: [
      learn('08:30', '10:30', 'cn', 'Computer Networks Unit 5 — remaining topics', [cn(5, 4)]),
      recall('11:00', '13:00', 'cn', 'Computer Networks Units 1 and 2 revision', [cn(1), cn(2)]),
      recall('14:00', '15:30', 'cn', 'Computer Networks Units 3 and 4 revision', [cn(3), cn(4)]),
      mock('16:00', '17:30', 'cn', 'Computer Networks full-length mock examination'),
      recall('19:30', '20:30', 'cn', 'Formulas, numericals and mistake revision', [cn(1), cn(2), cn(3), cn(4), cn(5)]),
    ],
  },
  {
    date: '2026-11-19',
    label: 'Computer Networks examination',
    slots: [
      ...examMorning('cn', 'T7908', 'Computer Networks'),
      routine('12:00', '18:00', 'Rest and recovery after the paper', true),
    ],
  },
  {
    date: '2026-11-20',
    label: 'NLP Units 1–2 · preprocessing',
    slots: [
      learn('08:30', '10:30', 'nlp', 'NLP Unit 1', [nlp(1)]),
      learn('11:00', '13:00', 'nlp', 'NLP Unit 2 — first 4 topics', [nlp(2, 1, 4)]),
      practice('14:00', '15:30', 'nlp', 'NLP examples and preprocessing', [nlp(1, 8, 14)], 'Work the preprocessing pipeline end to end: tokenise, normalise, stem, tag, embed.'),
      practice('16:00', '17:30', 'nlp', 'NLP questions — Units 1 and 2', [nlp(1), nlp(2, 1, 4)], 'Question bank set for the day, short answers written to rubric length.'),
      recall('19:30', '20:30', 'nlp', 'Recall — Unit 1', [nlp(1)]),
    ],
  },
  {
    date: '2026-11-21',
    label: 'NLP Units 2–3',
    slots: [
      learn('08:30', '10:30', 'nlp', 'NLP Unit 2 — remaining topics', [nlp(2, 5)]),
      learn('11:00', '13:00', 'nlp', 'NLP Unit 3 — first 4 topics', [nlp(3, 1, 4)]),
      practice('14:00', '15:30', 'nlp', 'NLP Unit 2 practice', [nlp(2)], 'TF-IDF and n-gram probability numericals, then one long answer on language modelling.'),
      practice('16:00', '17:30', 'nlp', 'NLP Unit 3 examples', [nlp(3, 1, 4)], 'Word2Vec/GloVe comparison from memory, then the embedding examples.'),
      recall('19:30', '20:30', 'nlp', 'Recall — Unit 2', [nlp(2)]),
    ],
  },
  {
    date: '2026-11-22',
    label: 'NLP Units 3–4 · weak topics',
    slots: [
      learn('08:30', '10:30', 'nlp', 'NLP Unit 3 — remaining topics', [nlp(3, 5)]),
      learn('11:00', '13:00', 'nlp', 'NLP Unit 4', [nlp(4)]),
      practice('14:00', '15:30', 'nlp', 'NLP practice questions', [nlp(3, 5), nlp(4)], 'RNN/LSTM/GRU and vanishing-gradient numericals and derivations.'),
      { start: '16:00', end: '17:30', title: 'Weak-topic revision', kind: 'revision', subjectId: 'nlp', weakOf: 'nlp', note: 'Auto-selected from your own practice and assessment scores; if nothing is flagged, revise Units 3 and 4.' },
      recall('19:30', '20:30', 'nlp', 'Recall — Units 3 and 4', [nlp(3), nlp(4)]),
    ],
  },
  {
    date: '2026-11-23',
    label: 'NLP Unit 5 · full revision · mock',
    slots: [
      learn('08:30', '10:30', 'nlp', 'NLP Unit 5', [nlp(5)]),
      recall('11:00', '13:00', 'nlp', 'Full syllabus revision', undefined),
      recall('14:00', '15:30', 'nlp', 'Important algorithms, diagrams and comparisons', [nlp(2), nlp(3), nlp(5)]),
      mock('16:00', '17:30', 'nlp', 'NLP full-length mock examination'),
      { start: '19:30', end: '20:30', title: 'Mock analysis and final revision', kind: 'revision', subjectId: 'nlp', weakOf: 'nlp', note: 'Every lost mark becomes a one-line repair note; nothing new is introduced tonight.' },
    ],
  },
  {
    date: '2026-11-24',
    label: 'NLP examination · Cloud Computing Units 1–2',
    slots: [
      ...examMorning('nlp', 'TEE7101', 'Natural Language Processing'),
      routine('12:00', '16:00', 'Rest after the paper', true),
      learn('16:00', '17:30', 'cloud', 'Cloud Computing Unit 1', [cloud(1)]),
      learn('19:30', '20:30', 'cloud', 'Cloud Computing Unit 2 — first 4 topics', [cloud(2, 1, 4)]),
    ],
  },
  {
    date: '2026-11-25',
    label: 'Cloud Computing Units 2–5 · full revision · mock',
    slots: [
      learn('08:30', '10:30', 'cloud', 'Cloud Computing Unit 2 — remaining topics', [cloud(2, 5)]),
      learn('11:00', '13:00', 'cloud', 'Cloud Computing Unit 3', [cloud(3)]),
      learn('14:00', '15:30', 'cloud', 'Cloud Computing Units 4 and 5', [cloud(4), cloud(5)]),
      mock('16:00', '17:30', 'cloud', 'Cloud Computing full-length mock examination'),
      { start: '19:30', end: '20:30', title: 'Final revision and mistake correction', kind: 'revision', subjectId: 'cloud', weakOf: 'cloud', note: 'Service-model and virtualisation comparisons, then the architecture diagrams. Nothing new after this block.' },
    ],
  },
  {
    date: '2026-11-26',
    label: 'Cloud Computing examination — final paper',
    slots: [...examMorning('cloud', 'TE7948', 'Introduction to Cloud Computing')],
  },
];

/** The daily routine the plan assumes. Sleep and meal windows are never scheduled over. */
export const PLAN_BLOCKS = [
  { id: 'b1', start: '08:30', end: '10:30', label: 'Study Block 1', kind: 'study' as const },
  { id: 'b2', start: '11:00', end: '13:00', label: 'Study Block 2', kind: 'study' as const },
  { id: 'b3', start: '14:00', end: '15:30', label: 'Study Block 3', kind: 'study' as const },
  { id: 'b4', start: '16:00', end: '17:30', label: 'Study Block 4', kind: 'study' as const },
  { id: 'b5', start: '19:30', end: '20:30', label: 'Daily revision and active recall', kind: 'personal' as const },
  { id: 'r1', start: '07:30', end: '08:30', label: 'Wake up, breakfast and freshening up', kind: 'routine' as const },
  { id: 'r2', start: '13:00', end: '14:00', label: 'Lunch and cooking', kind: 'routine' as const },
  { id: 'r3', start: '17:30', end: '18:30', label: 'Exercise and personal time', kind: 'routine' as const },
  { id: 'r4', start: '18:30', end: '19:30', label: 'Dinner', kind: 'routine' as const },
];

/** Daily goal in minutes: four focused blocks (7 h) plus the one-hour recall block. */
export const PLAN_DAILY_MINUTES = 480;
