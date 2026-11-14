// EXAMFORGE — parser for the uploaded Deep Learning question bank.
// Preserves the document order and numbering: five standalone numerical problems (N1–N5)
// followed by the numbered questions 1–234. Nothing is merged, skipped or renumbered.

import { QUESTION_BANK_SOURCE } from './source';
import { TOPIC_MAP } from '../syllabus';
import type { FormatKind, AMQuestion } from './types';

const NUMBERED_RE = /^(\d{1,3})\.\s+(.*)$/;

function clean(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/_/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .trim();
}

interface Parsed {
  number: string;
  order: number;
  text: string;
}

export function parseQuestionBank(raw = QUESTION_BANK_SOURCE): Parsed[] {
  const lines = raw.split('\n');
  const out: Parsed[] = [];
  const heads: { index: number; number: string; title: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^\*\*Numerical Problem (\d+) — ([^*]+)\*\*$/.exec(lines[i].trim());
    if (m) heads.push({ index: i, number: `N${m[1]}`, title: clean(m[2]) });
  }

  // ---- the five standalone numerical problems at the head of the document
  const numberedStart = lines.findIndex((l) => NUMBERED_RE.test(l.trim()));
  for (let h = 0; h < heads.length; h++) {
    const head = heads[h];
    const end = h + 1 < heads.length ? heads[h + 1].index : numberedStart;
    const body = lines
      .slice(head.index + 1, end)
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' ')
      .trim();
    out.push({ number: head.number, order: out.length, text: clean(`${head.title}. ${body}`) });
  }

  // ---- numbered questions 1..234, keeping wrapped/continuation lines with their question
  let current: { number: string; parts: string[] } | null = null;
  for (const rawLine of lines.slice(numberedStart)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = NUMBERED_RE.exec(line);
    if (m) {
      if (current) out.push({ number: current.number, order: out.length, text: clean(current.parts.join(' ')) });
      current = { number: m[1], parts: [m[2]] };
    } else if (current) {
      current.parts.push(line);
    }
  }
  if (current) out.push({ number: current.number, order: out.length, text: clean(current.parts.join(' ')) });

  return out;
}

export function formatOf(text: string): FormatKind {
  if (/^application problem/i.test(text)) return 'application';
  if (/^long-answer problem/i.test(text)) return 'long';
  if (/^comprehensive problem 5/i.test(text)) return 'analysis';
  if (/^comprehensive problem/i.test(text)) return /given .*=|given .*values|given numerical/i.test(text) ? 'numerical' : 'application';
  if (
    /^numerical problem|^computational graph problem|^optimization numerical problem|^regularization numerical problem|^dropout problem|^parameter-count numerical problem|^backpropagation numerical problem/i.test(
      text,
    )
  )
    return 'numerical';
  if (/^(compare|differentiate|difference between)/i.test(text)) return 'comparison';
  if (/\b(calculate|compute)\b/i.test(text)) return 'numerical';
  if (/^(derive|prove|show that)\b/i.test(text) || /\bderive\b/i.test(text)) return 'derivation';
  if (/^draw\b/i.test(text) || /\bdiagram\b/i.test(text)) return 'diagram';
  return 'theory';
}

export function marksOf(text: string, format: FormatKind): number {
  if (format === 'long' || format === 'application' || format === 'analysis') return 10;
  if (format === 'numerical') return /comprehensive|long-answer/i.test(text) ? 10 : 8;
  if (format === 'derivation' || format === 'diagram') return 8;
  if (format === 'comparison') return 5;
  const words = text.split(/\s+/).length;
  return words <= 14 ? 2 : words <= 30 ? 3 : 5;
}

export function difficultyOf(text: string, format: FormatKind): 1 | 2 | 3 | 4 | 5 {
  if (/comprehensive|long-answer/i.test(text)) return 5;
  if (format === 'numerical' || format === 'application' || format === 'derivation') return 4;
  if (format === 'analysis') return 4;
  if (format === 'comparison' || format === 'diagram') return 3;
  return text.split(/\s+/).length <= 12 ? 1 : 2;
}

export const TYPE_LABEL: Record<FormatKind, string> = {
  numerical: 'Numerical',
  theory: 'Theory',
  comparison: 'Comparison',
  application: 'Application',
  diagram: 'Diagram',
  derivation: 'Derivation',
  analysis: 'Analysis',
  long: 'Long answer',
};

/** Build the full question list; topic + focus come from the curated metadata table. */
export function buildQuestions(meta: Record<string, { topicId: string; focus: string }>): AMQuestion[] {
  return parseQuestionBank().map((q) => {
    const m = meta[q.number];
    if (!m) throw new Error(`Answer Master: missing metadata for question ${q.number}`);
    if (!TOPIC_MAP[m.topicId]) throw new Error(`Answer Master: unknown topic ${m.topicId} for question ${q.number}`);
    // The five head items are numerical problems by definition, even when their title alone
    // would read like theory (e.g. "Multiple Perceptron Updates").
    const format: FormatKind = q.number.startsWith('N') ? 'numerical' : formatOf(q.text);
    return {
      id: `dlq-${q.number}`,
      number: q.number,
      order: q.order,
      text: q.text,
      format,
      marks: marksOf(q.text, format),
      difficulty: difficultyOf(q.text, format),
      topicId: m.topicId,
      unitId: TOPIC_MAP[m.topicId].unitId,
      focus: m.focus,
    };
  });
}
