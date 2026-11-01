// EXAMFORGE — display labels shared across pages.

import type { MockResult, QuestionType, ScheduleMode } from './types';

export const STUDY_LABEL: Record<ScheduleMode, string> = {
  sprint: 'Seven-day syllabus sprint',
  examwise: 'Examination-wise revision',
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
