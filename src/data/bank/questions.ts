// EXAMFORGE — question bank builder.
// Questions are generated deterministically from the authored five-level content and the
// official syllabus, so every topic gets topic-specific stems, model answers and rubrics.

import type { Difficulty, Marks, Question, QuestionType, RubricPoint, Topic } from '../types';
import { ALL_TOPICS, TOPIC_MAP, unitOf } from '../syllabus';
import { CONTENT } from '../content';

const STOP = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'which', 'when', 'where', 'what', 'into',
  'their', 'there', 'these', 'those', 'have', 'been', 'will', 'they', 'than', 'then', 'each',
  'such', 'must', 'also', 'more', 'most', 'some', 'only', 'over', 'very', 'both', 'does',
  'used', 'using', 'between', 'other', 'because', 'about', 'would', 'could', 'should', 'while',
]);

function keywords(text: string, n: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.toLowerCase().split(/[^a-z0-9+]+/)) {
    const w = raw.trim();
    if (w.length < 4 || STOP.has(w) || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= n) break;
  }
  return out;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function splitMarks(total: Marks, points: string[], kws: string[][]): RubricPoint[] {
  const base = Math.floor(total / points.length);
  let extra = total - base * points.length;
  return points.map((point, i) => {
    const marks = base + (extra > 0 ? (extra--, 1) : 0);
    return { marks, point, keywords: kws[i] ?? keywords(point, 4) };
  });
}

class Builder {
  private out: Question[] = [];

  add(q: Question) {
    this.out.push(q);
  }

  build(): Question[] {
    return this.out;
  }
}

function optionsFor(topic: Topic): { options: string[]; answerIndex: number[] } {
  const subjectTopics = ALL_TOPICS.filter((t) => t.subjectId === topic.subjectId);
  const i = subjectTopics.findIndex((t) => t.id === topic.id);
  const picks: Topic[] = [];
  for (let k = 1; picks.length < 3 && k <= subjectTopics.length; k++) {
    const cand = subjectTopics[(i + k * 7 + 3) % subjectTopics.length];
    if (cand && cand.id !== topic.id && !picks.some((p) => p.id === cand.id)) picks.push(cand);
  }
  const correct = topic.name;
  const distractors = picks.map((p) => p.name);
  const at = hash(topic.id) % 4;
  const options: string[] = [];
  let di = 0;
  for (let slot = 0; slot < 4; slot++) options.push(slot === at ? correct : distractors[di++] ?? topic.unitId);
  return { options, answerIndex: [at] };
}

function makeQuestions(topic: Topic, b: Builder) {
  const c = CONTENT[topic.id];
  if (!c) return;
  const unit = unitOf(topic.unitId);
  const unitName = unit?.name ?? topic.unitId;
  const mistakes = [
    ...c.tech.disadvantages.slice(0, 2),
    ...(c.tech.limitations ?? []).slice(0, 1),
    'Listing keywords without explaining how they connect to the question asked.',
  ];
  const diagramNote = c.diagram ? ` Include a labelled diagram: ${c.diagram.title}.` : '';
  const formulaNote = c.formulas?.length ? ` State the formula ${c.formulas[0].expr} and define its symbols.` : '';

  // ---------------------------------------------------------- 3 marks: definition + core idea
  {
    const { options, answerIndex } = optionsFor(topic);
    b.add({
      id: `${topic.id}-mcq`,
      subjectId: topic.subjectId,
      unitId: topic.unitId,
      topicId: topic.id,
      type: 'mcq',
      marks: 3,
      difficulty: 2,
      stem: `Which of the following correctly identifies the syllabus topic "${topic.name}"?`,
      options,
      answerIndex,
      answerText: `${topic.name} — ${c.zero.what}`,
      structure: ['Read all options', 'Eliminate mismatched definitions', 'Select the exact syllabus term'],
      explanation: `"${topic.name}" (${unitName}) is defined as: ${c.tech.definition}`,
      mistakes: [
        'Confusing this topic with a neighbouring topic in the same unit.',
        'Choosing an option that describes a tool or application rather than the concept itself.',
      ],
      rubric: [{ marks: 3, point: 'Correct option selected', keywords: [topic.name.toLowerCase()] }],
    });
  }

  // ---------------------------------------------------------- 3 marks: short answer
  b.add({
    id: `${topic.id}-q3`,
    subjectId: topic.subjectId,
    unitId: topic.unitId,
    topicId: topic.id,
    type: 'short',
    marks: 3,
    difficulty: 2,
    stem: `Define ${topic.name} and state the problem it solves. (3 marks)`,
    answerText: [
      `Definition: ${c.tech.definition}`,
      `Purpose: ${c.zero.why} ${c.zero.problem}`,
      `Key components: ${c.tech.components.slice(0, 3).join(', ')}.`,
      c.examples[0] ? `Example: ${c.examples[0]}` : '',
    ].filter(Boolean).join(' '),
    structure: ['Definition in one sentence', 'Why it exists / problem solved', 'One concrete example'],
    explanation: `A full-mark answer names the concept precisely, explains the problem it addresses and anchors it with one example. ${c.zero.how}`,
    mistakes,
    rubric: splitMarks(3, [
      'Precise definition using correct terminology',
      'States the problem or purpose it addresses',
      'Gives a concrete example or component list',
    ], [
      keywords(c.tech.definition, 6),
      keywords(`${c.zero.why} ${c.zero.problem}`, 6),
      keywords(`${c.examples[0] ?? ''} ${c.tech.components.join(' ')}`, 6),
    ]),
  });

  // ---------------------------------------------------------- 4 marks: mechanism or comparison
  if (c.comparison) {
    const rows = c.comparison.rows.slice(0, 4);
    b.add({
      id: `${topic.id}-q4`,
      subjectId: topic.subjectId,
      unitId: topic.unitId,
      topicId: topic.id,
      type: 'compare',
      marks: 4,
      difficulty: 3,
      stem: `Compare the alternatives in "${c.comparison.title}" and justify which one applies to ${topic.name}. (4 marks)`,
      answerText: [
        ...rows.map((r) => `${r.label}: ${r.cells.join(' vs ')}.`),
        `Justification: ${c.zero.problem}`,
      ].join(' '),
      structure: ['State the comparison basis', 'One line per alternative', 'Justify the choice for the asked scenario'],
      explanation: `Full marks require one point per row plus an explicit judgement — a table alone without a conclusion loses the final mark.`,
      mistakes: [
        ...(c.comparison.rows.length < 3 ? ['Comparing fewer than three dimensions.'] : []),
        'Writing two separate descriptions instead of paired criteria.',
        'No concluding judgement against the question asked.',
      ],
      rubric: splitMarks(4, [
        ...rows.slice(0, 3).map((r) => `Correct comparison on ${r.label}`),
        'Justified conclusion tied to the scenario',
      ], [
        ...rows.slice(0, 3).map((r) => keywords(`${r.label} ${r.cells.join(' ')}`, 6)),
        keywords(`${c.zero.why} ${c.zero.where}`, 6),
      ]),
    });
  } else {
    b.add({
      id: `${topic.id}-q4`,
      subjectId: topic.subjectId,
      unitId: topic.unitId,
      topicId: topic.id,
      type: 'long',
      marks: 4,
      difficulty: 3,
      stem: `Explain how ${topic.name} works, naming its components and their roles.${diagramNote} (4 marks)`,
      answerText: [
        `Working: ${c.tech.architecture}`,
        `Components: ${c.tech.components.join('; ')}.`,
        c.formulas?.length ? `Maths: ${c.formulas[0].name} — ${c.formulas[0].expr} (${c.formulas[0].when}).` : '',
        c.diagram ? `Diagram: ${c.diagram.title}.` : '',
      ].filter(Boolean).join(' '),
      structure: ['Name the mechanism', 'Describe the components in order', 'Show the mathematical/logical relation', 'Conclude with the effect produced'],
      explanation: `The examiner looks for the mechanism in sequence plus named components; unsupported generalities score at most half. ${c.tech.architecture}`,
      mistakes,
      diagramRequired: Boolean(c.diagram),
      rubric: splitMarks(4, [
        'Correct identification of the mechanism',
        'Components named and their roles explained',
        'Process or mathematical relation described correctly',
        'Effect/outcome stated' + (c.diagram ? ' with an appropriate diagram' : ''),
      ], [
        keywords(c.tech.architecture, 8),
        keywords(c.tech.components.join(' '), 8),
        keywords(`${c.formulas?.[0]?.expr ?? ''} ${c.zero.how}`, 8),
        keywords(`${c.tech.advantages.join(' ')} ${c.zero.where}`, 8),
      ]),
    });
  }

  // ---------------------------------------------------------- 5 marks: application / analysis
  b.add({
    id: `${topic.id}-q5`,
    subjectId: topic.subjectId,
    unitId: topic.unitId,
    topicId: topic.id,
    type: 'application',
    marks: 5,
    difficulty: 5,
    stem: `A scenario requires ${topic.name} to be applied under realistic constraints. Describe the approach, justify the design choices, and state the limitations and how you would mitigate them.${formulaNote} (5 marks)`,
    answerText: [
      `Definition: ${c.tech.definition}`,
      `Approach: ${c.zero.how}`,
      `Applied where: ${c.zero.where} — ${c.applications.slice(0, 2).join(', ')}.`,
      `Justification: ${c.tech.advantages.slice(0, 2).join('; ')}.`,
      `Limitations: ${[...c.tech.disadvantages, ...(c.tech.limitations ?? [])].slice(0, 3).join('; ')}.`,
      `Mitigation / best practice: ${c.examples[0] ?? ''}`,
      c.diagram ? `Diagram: ${c.diagram.title}.` : '',
    ].filter(Boolean).join(' '),
    structure: [
      'Definition / introduction',
      'Main concept applied to the scenario',
      'Working or architecture with a diagram',
      'Justification of choices with an example',
      'Limitations and conclusion',
    ],
    explanation: `Five-mark answers need all five structural blocks. Marks are awarded for correct application to the stated scenario, not for generic description; the limitation block is where most candidates lose marks.`,
    mistakes: [
      ...mistakes.slice(0, 2),
      'Describing the technique only in general terms without applying it to the given constraints.',
      'Omitting limitations, which the question explicitly asks for.',
    ],
    diagramRequired: Boolean(c.diagram),
    rubric: splitMarks(5, [
      'Accurate definition with correct terminology',
      'Concept correctly applied to the scenario',
      'Working/architecture explained in sequence',
      'Justification supported by advantage or example',
      'Limitations stated with a mitigation',
    ], [
      keywords(c.tech.definition, 6),
      keywords(`${c.zero.where} ${c.applications.join(' ')}`, 6),
      keywords(`${c.tech.architecture} ${c.tech.components.join(' ')}`, 8),
      keywords(`${c.tech.advantages.join(' ')} ${c.examples[0] ?? ''}`, 8),
      keywords([...c.tech.disadvantages, ...(c.tech.limitations ?? [])].join(' '), 8),
    ]),
  });
}

const builder = new Builder();
for (const topic of ALL_TOPICS) makeQuestions(topic, builder);

export const ALL_QUESTIONS: Question[] = builder.build();

export const QUESTIONS_BY_TOPIC: Record<string, Question[]> = ALL_QUESTIONS.reduce(
  (acc, q) => {
    (acc[q.topicId] ??= []).push(q);
    return acc;
  },
  {} as Record<string, Question[]>,
);

export const QUESTIONS_BY_SUBJECT = ALL_QUESTIONS.reduce(
  (acc, q) => {
    (acc[q.subjectId] ??= []).push(q);
    return acc;
  },
  {} as Record<string, Question[]>,
);

export function questionsForUnit(unitId: string): Question[] {
  return ALL_QUESTIONS.filter((q) => q.unitId === unitId);
}

export function questionCountByType(): Record<QuestionType, number> {
  const out = {} as Record<QuestionType, number>;
  for (const q of ALL_QUESTIONS) out[q.type] = (out[q.type] ?? 0) + 1;
  return out;
}

export function marksOf(questionIds: string[]): number {
  return questionIds.reduce((s, id) => s + (ALL_QUESTIONS.find((q) => q.id === id)?.marks ?? 0), 0);
}

export const BANK_STATS = {
  questions: ALL_QUESTIONS.length,
  topics: Object.keys(QUESTIONS_BY_TOPIC).length,
  perTopic: ALL_TOPICS.length ? ALL_QUESTIONS.length / ALL_TOPICS.length : 0,
  marksByDiff: ALL_QUESTIONS.reduce<Record<Difficulty, number>>(
    (acc, q) => ((acc[q.difficulty] = (acc[q.difficulty] ?? 0) + 1), acc),
    {} as Record<Difficulty, number>,
  ),
};

export function topicName(topicId: string): string {
  return TOPIC_MAP[topicId]?.name ?? topicId;
}
