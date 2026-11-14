// EXAMFORGE — Deep Learning Answer Master dataset.
// 234 numbered questions from the uploaded bank plus the 5 standalone numerical problems
// printed at the head of the same document: 239 questions, original numbering preserved.

import { SUBJECTS } from '../syllabus';
import { buildQuestions } from './parse';
import type { AMQuestion, FormatKind } from './types';
import { META_1 } from './meta1';
import { META_2 } from './meta2';
import { META_3 } from './meta3';
import { META_4 } from './meta4';

export const AM_META = { ...META_1, ...META_2, ...META_3, ...META_4 };

export const AM_QUESTIONS: AMQuestion[] = buildQuestions(AM_META);

export const AM_BY_ID: Record<string, AMQuestion> = Object.fromEntries(AM_QUESTIONS.map((q) => [q.id, q]));

export const AM_TOTAL = AM_QUESTIONS.length;
export const AM_NUMBERED_TOTAL = AM_QUESTIONS.filter((q) => !q.number.startsWith('N')).length;

export const DL_UNITS = SUBJECTS.find((s) => s.id === 'dl')!.units.map((u) => ({
  id: u.id,
  order: u.order,
  name: u.name,
}));

export function unitLabel(unitId: string): string {
  const unit = DL_UNITS.find((u) => u.id === unitId);
  return unit ? `Unit ${unit.order} — ${unit.name}` : unitId;
}

/** Questions for one unit, in original document order. */
export function questionsByUnit(): { unitId: string; questions: AMQuestion[] }[] {
  return DL_UNITS.map((u) => ({ unitId: u.id, questions: AM_QUESTIONS.filter((q) => q.unitId === u.id) }));
}

export const FORMAT_ORDER: FormatKind[] = [
  'numerical',
  'theory',
  'comparison',
  'application',
  'diagram',
  'derivation',
  'analysis',
  'long',
];

export const FORMAT_LABELS: Record<FormatKind, string> = {
  numerical: 'Numerical',
  theory: 'Theory',
  comparison: 'Comparison',
  application: 'Application',
  diagram: 'Diagram',
  derivation: 'Derivation',
  analysis: 'Analysis',
  long: 'Long answer',
};
