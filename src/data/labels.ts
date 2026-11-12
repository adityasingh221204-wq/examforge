// EXAMFORGE — display labels shared across pages.

import type { MockResult, QuestionType, ScheduleMode, SessionKind } from './types';

export const STUDY_LABEL: Record<ScheduleMode, string> = {
  plan: 'Active examination plan · 12–26 Nov',
  sprint: 'Seven-day syllabus sprint',
  examwise: 'Examination-wise revision',
};

export const SESSION_KIND_LABEL: Record<SessionKind, string> = {
  sprint: 'First pass',
  practice: 'Practice',
  revision: 'Revision',
  mock: 'Mock exam',
  routine: 'Routine',
  exam: 'Examination',
  admin: 'Preparation',
};

export const SESSION_KIND_TONE: Record<SessionKind, string> = {
  sprint: 'lav',
  practice: 'practised',
  revision: 'learned',
  mock: 'in_progress',
  routine: 'not_started',
  exam: 'needs_revision',
  admin: 'not_started',
};

export const MOCK_KIND_LABEL: Record<MockResult['kind'], string> = {
  unit: 'Unit test',
  topic: 'Topic test',
  mixed: 'Mixed-unit test',
  full: 'Full-length mock',
  advanced: 'Advanced application mock',
};

export const TYPE_HINT: Partial<Record<QuestionType, string>> = {
  mcq: 'Choose the single best option.',
  compare: 'Answer as paired criteria, one line per dimension.',
  long: 'Mechanism + components + relation + outcome.',
  application: 'Definition → application → working → justification → limitations.',
  short: 'Definition + purpose + one example.',
};

export const SUBJECT_SHORT: Record<string, string> = {
  dl: 'DL',
  cn: 'CN',
  nlp: 'NLP',
  cloud: 'Cloud',
};
