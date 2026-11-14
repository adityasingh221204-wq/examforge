// EXAMFORGE — Answer Master types.

export type FormatKind =
  | 'numerical'
  | 'theory'
  | 'comparison'
  | 'application'
  | 'diagram'
  | 'derivation'
  | 'analysis'
  | 'long';

export interface AMQuestion {
  id: string;
  /** original number from the document: `1`…`234`, or `N1`…`N5` for the standalone numericals */
  number: string;
  order: number;
  text: string;
  format: FormatKind;
  marks: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  topicId: string;
  unitId: string;
  /** curated direct answer used as the spine of the generated answer */
  focus: string;
}

export type AnswerStatus = 'unanswered' | 'generated' | 'checked' | 'needs_correction';

export interface AnswerProgress {
  status: AnswerStatus;
  important?: boolean;
  revised?: boolean;
  difficult?: boolean;
  favourite?: boolean;
  generatedAt?: number;
  checkedAt?: number;
  revisedAt?: number;
  note?: string;
  views?: number;
}

export interface AnswerSection {
  heading: string;
  body?: string;
  bullets?: string[];
  table?: { columns: string[]; rows: string[][] };
  formula?: string;
  diagram?: string;
  note?: string;
}

export interface VerificationItem {
  check: string;
  pass: boolean;
  detail: string;
}

export interface GeneratedAnswer {
  questionId: string;
  format: FormatKind;
  marks: number;
  depth: string;
  sections: AnswerSection[];
  assumptions: string[];
  sources: string[];
  verification: VerificationItem[];
  /** true when a numeric solver produced the answer */
  computed: boolean;
  /** what the solver would need if the question is under-specified */
  missing?: string[];
  followUps: string[];
}
