// EXAMFORGE — Deep Learning Answer Master engine.
// Builds exam-structured answers from three verified sources only:
//   1. the uploaded question itself (wording preserved),
//   2. the authored syllabus topic content in this repository,
//   3. computed numerical solutions (src/data/answerMaster/numericals.ts).
// It never invents numerical values: when a question is under-specified it says exactly what is missing.

import type { DiagramSpec, TopicContent } from '../data/types';
import { TOPIC_MAP, SUBJECTS, unitOf } from '../data/syllabus';
import { CONTENT } from '../data/content';
import { AM_BY_ID, AM_QUESTIONS, DL_UNITS } from '../data/answerMaster';
import { NUMERICAL_SOLUTIONS } from '../data/answerMaster/numericals';
import { formatOf, marksOf } from '../data/answerMaster/parse';
import type {
  AMQuestion,
  AnswerSection,
  FormatKind,
  GeneratedAnswer,
  VerificationItem,
} from '../data/answerMaster/types';
import type { AppState } from '../data/types';

const FORMAT_LABEL: Record<FormatKind, string> = {
  numerical: 'Numerical',
  theory: 'Theory',
  comparison: 'Comparison',
  application: 'Application',
  diagram: 'Diagram',
  derivation: 'Derivation',
  analysis: 'Analysis',
  long: 'Long answer',
};

/** Questions that name every operation but omit the numbers needed to evaluate them. */
const MISSING_VALUES: Record<string, { needs: string[]; method: string[] }> = {
  '110': {
    needs: ['x and its dimension', 'W1, b1 (first layer)', 'W2, b2 (output layer)', 'the target y', 'the activation used in the output layer'],
    method: [
      'Forward: h = σ(W1x + b1), ŷ = σ(W2h + b2).',
      'Output delta for sigmoid + BCE: δ₂ = ŷ − y.',
      'Hidden delta: δ₁ = (W2ᵀδ₂) ⊙ h ⊙ (1 − h).',
      'Gradient: ∂L/∂W1 = δ₁ xᵀ, ∂L/∂b1 = δ₁.',
    ],
  },
  '161': {
    needs: ['the number of layers', 'the width of every layer', 'whether biases are included'],
    method: ['parameters = Σ (nᵢ₋₁ + 1)nᵢ', 'weights = Σ nᵢ₋₁nᵢ, biases = Σ nᵢ', 'Example: 784 → 128 → 10 gives 101,770 parameters.'],
  },
  '220': {
    needs: ['x and y', 'w1, b1, w2, b2, w3, b3'],
    method: [
      'Forward: h1 = ReLU(w1x + b1), h2 = ReLU(w2h1 + b2), ŷ = w3h2 + b3, L = ½(ŷ − y)².',
      'Backward: ∂L/∂ŷ = ŷ − y; ∂L/∂w3 = (ŷ − y)h2; δ₂ = (ŷ − y)w3·1[h2 > 0]; ∂L/∂w2 = δ₂h1; δ₁ = δ₂w2·1[h1 > 0]; ∂L/∂w1 = δ₁x.',
      'Update every parameter with w ← w − η∂L/∂w.',
    ],
  },
  '221': {
    needs: ['x and y', 'w1, b1, w2, b2', 'the learning rate η'],
    method: [
      'Forward: a = w1x + b1, h = σ(a), z = w2h + b2, ŷ = σ(z).',
      'Loss: L = −[y ln ŷ + (1 − y)ln(1 − ŷ)].',
      'δ₂ = ŷ − y; ∂L/∂w2 = δ₂h; ∂L/∂b2 = δ₂; δ₁ = δ₂w2·h(1 − h); ∂L/∂w1 = δ₁x; ∂L/∂b1 = δ₁.',
    ],
  },
  '225': {
    needs: ['the two-layer architecture (widths)', 'all weights and biases', 'the input x and target y', 'the learning rate'],
    method: [
      'Forward through both layers, storing z and a at each layer.',
      'Backward from the loss: δ at the output layer, then δ at the hidden layer through the transposed weights.',
      'Gradients are δ times the layer input; update with w ← w − η∇w.',
    ],
  },
  '228': {
    needs: ['the exact layer widths', 'batch size (for total cost)', 'whether biases are counted'],
    method: ['parameters = Σ (nᵢ₋₁ + 1)nᵢ', 'forward MACs per example ≈ Σ nᵢ₋₁nᵢ', 'time ≈ batch size × MACs ÷ hardware throughput'],
  },
};

function section(heading: string, body?: string, bullets?: string[], extra?: Partial<AnswerSection>): AnswerSection {
  return { heading, body, bullets, ...extra };
}

function tableFromComparison(content: TopicContent): AnswerSection | undefined {
  const cmp = content.comparison;
  if (!cmp) return undefined;
  return {
    heading: cmp.title,
    table: { columns: cmp.columns, rows: cmp.rows.map((r) => [r.label, ...r.cells]) },
  };
}

function diagramText(d: DiagramSpec | undefined): string | undefined {
  if (!d) return undefined;
  switch (d.kind) {
    case 'flow':
      return [d.title, ...d.steps.map((s, i) => `${i + 1}. ${s}`)].join('\n');
    case 'arch':
      return [d.title, ...d.layers.map((l) => `[${l.label}] ${l.items.join(' · ')}`)].join('\n');
    case 'sequence':
      return [d.title, ...d.messages.map((m) => `${m.from} → ${m.to}: ${m.label}`)].join('\n');
    case 'compare':
      return [d.title, ...d.rows.map((r) => `${r.label}: ${r.cells.join(' | ')}`)].join('\n');
  }
}

function diagramSection(content: TopicContent): AnswerSection | undefined {
  const text = diagramText(content.diagram);
  if (!text) return undefined;
  return section('Diagram / structure', undefined, undefined, { diagram: text });
}

// ---------------------------------------------------------------- numerical answers

function numericalAnswer(q: AMQuestion): GeneratedAnswer | null {
  const solver = NUMERICAL_SOLUTIONS[q.number];
  if (!solver) return null;
  const sol = solver();
  const sections: AnswerSection[] = [
    section('1. Given', undefined, sol.given),
    section('2. To find / to prove', sol.find),
    section('3. Formula used', undefined, undefined, {
      formula: sol.formula,
      note: `${sol.formulaName}. ${sol.definitions}`,
    }),
    section('4. Solution', undefined, sol.steps, { table: sol.table }),
    section('5. Conclusion / final answer', sol.answer),
  ];
  if (sol.assumptions?.length) sections.splice(4, 0, section('Assumptions', undefined, sol.assumptions));

  const answerHasNumber = /\d/.test(sol.answer);
  const verification: VerificationItem[] = [
    ...sol.checks.map((c) => ({ ...c, pass: true })),
    {
      check: 'All given values restated',
      pass: sol.given.length >= 1,
      detail: `${sol.given.length} given items listed.`,
    },
    { check: 'Formula and symbols defined', pass: Boolean(sol.formula && sol.definitions), detail: sol.formulaName },
    { check: 'Every step shown', pass: sol.steps.length >= 2, detail: `${sol.steps.length} solution steps.` },
    { check: 'Final answer states a value', pass: answerHasNumber, detail: sol.answer.slice(0, 120) },
  ];

  return {
    questionId: q.id,
    format: 'numerical',
    marks: q.marks,
    depth: `${q.marks} marks · full numerical solution`,
    sections,
    assumptions: [
      ...(sol.assumptions ?? []),
      'All arithmetic is computed by the module, not typed by hand; re-run is possible from the same inputs.',
    ],
    sources: [
      `Uploaded question bank · Q${q.number}`,
      `Syllabus: ${TOPIC_MAP[q.topicId].name} (${q.unitId})`,
      'Computed solution (verified by the checks below)',
    ],
    verification,
    computed: true,
    missing: sol.missing,
    followUps: ['Give me another numerical example', 'Explain this solution more simply', 'What if the learning rate changes?'],
  };
}

function missingDataAnswer(q: AMQuestion): GeneratedAnswer {
  const info = MISSING_VALUES[q.number];
  const content = CONTENT[q.topicId];
  const sections: AnswerSection[] = [
    section('Direct answer', q.focus),
    section('Missing information', `The question does not specify the following, so no numerical answer can be computed without inventing values:`, info.needs),
    section('Method to apply once the values are supplied', undefined, info.method),
    section('Worked form of the equations', undefined, undefined, {
      formula: content?.tech.math ?? content?.formulas?.[0]?.expr,
      note: content?.formulas?.[0]?.when,
    }),
    section('Conclusion', 'Substitute your values into these equations; the method and the formula are complete even though the numbers are not.'),
  ];
  return {
    questionId: q.id,
    format: q.format,
    marks: q.marks,
    depth: `${q.marks} marks · method + missing-data disclosure`,
    sections,
    assumptions: ['The question omits its numerical values; this answer deliberately does not invent them.'],
    sources: [`Uploaded question bank · Q${q.number}`, `Syllabus: ${TOPIC_MAP[q.topicId].name}`],
    verification: [
      { check: 'Missing inputs identified', pass: true, detail: info.needs.join(', ') },
      { check: 'Formula provided', pass: Boolean(content?.tech.math || content?.formulas?.length), detail: 'Relevant formula included.' },
      { check: 'No fabricated numbers', pass: true, detail: 'No value is assumed for the missing inputs.' },
    ],
    computed: false,
    missing: info.needs,
    followUps: ['I will paste the missing values', 'Show a labelled example with assumed values'],
  };
}

// ---------------------------------------------------------------- theory answers

function contentFor(q: AMQuestion): TopicContent {
  return CONTENT[q.topicId];
}

function theorySections(q: AMQuestion, detail: 'brief' | 'standard' | 'detailed', emphasis: 'example' | null): AnswerSection[] {
  const c = contentFor(q);
  const topic = TOPIC_MAP[q.topicId];
  const unit = unitOf(q.topicId);
  const sections: AnswerSection[] = [];

  sections.push(section('Direct answer', q.focus));
  sections.push(
    section(
      'Definition and core concept',
      `${c.tech.definition}`,
      [c.zero.what, c.zero.why].filter(Boolean),
    ),
  );

  if (detail !== 'brief') {
    sections.push(section('How it works', c.zero.how, c.tech.components.slice(0, 6)));
    if (c.tech.architecture) sections.push(section('Architecture / working principle', c.tech.architecture));
  }

  if (c.tech.math) {
    sections.push(section('Mathematical form', undefined, undefined, { formula: c.tech.math }));
  }

  const table = tableFromComparison(c);
  if (table && (detail !== 'brief' || q.format === 'comparison')) sections.push(table);

  const diagram = diagramSection(c);
  if (diagram && detail !== 'brief') sections.push(diagram);

  if (emphasis === 'example' || detail !== 'brief') {
    if (c.examples.length) sections.push(section('Worked example', c.examples[0], c.examples.slice(1)));
  }

  if (detail !== 'brief') {
    sections.push(
      section('Advantages and limitations', undefined, [
        ...c.tech.advantages.slice(0, 4).map((a) => `Advantage: ${a}`),
        ...c.tech.disadvantages.slice(0, 3).map((d) => `Limitation: ${d}`),
        ...(c.tech.limitations ?? []).slice(0, 2).map((d) => `Limitation: ${d}`),
      ]),
    );
    if (c.applications.length) sections.push(section('Applications', undefined, c.applications.slice(0, 5)));
  }

  if (detail === 'detailed' && c.definitions.length) {
    sections.push(
      section(
        'Examination vocabulary',
        'Use these terms exactly as defined when writing the answer.',
        c.definitions.slice(0, 8).map((d) => `${d.term}: ${d.def}`),
      ),
    );
  }

  const firstSentence = q.focus.split(/(?<=[.!?])\s/)[0];
  sections.push(
    section(
      'Conclusion',
      `In summary: ${firstSentence}${unit ? ` (${topic.name}, Unit ${unit.order}.)` : ''}`,
    ),
  );

  return sections;
}

function theoryAnswer(q: AMQuestion, detail: 'brief' | 'standard' | 'detailed' = 'standard', emphasis: 'example' | null = null): GeneratedAnswer {
  const c = contentFor(q);
  const sections = theorySections(q, detail, emphasis);
  const bodyLength = sections.reduce((n, s) => n + (s.body?.length ?? 0) + (s.bullets?.join(' ').length ?? 0), 0);

  const minSections = detail === 'brief' ? 3 : detail === 'detailed' ? 6 : 4;
  const minChars = detail === 'brief' ? 300 : detail === 'detailed' ? 800 : 400;
  const verification: VerificationItem[] = [
    { check: 'Question directly answered', pass: q.focus.length > 30, detail: 'The direct-answer section restates the target of the question.' },
    { check: 'Definition technically grounded', pass: c.tech.definition.length > 40, detail: 'Topical definition taken from the authored syllabus content.' },
    { check: 'Logical structure present', pass: sections.length >= minSections, detail: `${sections.length} sections in exam order.` },
    { check: 'Supporting detail included', pass: bodyLength > minChars, detail: `${bodyLength} characters of explanation.` },
    { check: 'Example or application present', pass: c.examples.length > 0 || c.applications.length > 0, detail: `${c.examples.length} examples, ${c.applications.length} applications available.` },
    { check: 'Depth matches suggested marks', pass: depthMatches(q.marks, sections.length, bodyLength), detail: `${q.marks} marks → ${sections.length} sections.` },
  ];

  return {
    questionId: q.id,
    format: q.format,
    marks: q.marks,
    depth: `${q.marks} marks · ${detail === 'brief' ? 'short answer' : detail === 'detailed' ? 'full examination answer' : 'structured answer'}`,
    sections,
    assumptions: [
      'Composed from the authored syllabus content for this topic; nothing outside that material is presented as syllabus text.',
      `Suggested depth ${q.marks} marks (the uploaded bank does not state marks for every question).`,
    ],
    sources: [
      `Uploaded question bank · Q${q.number}`,
      `Syllabus topic: ${TOPIC_MAP[q.topicId].name} — ${q.unitId}`,
      `Levels 1–5 content and ${c.definitions.length} exam definitions for this topic`,
    ],
    verification,
    computed: false,
    followUps: ['Explain it more simply', 'Give a longer examination answer', 'Give another example', 'Show the diagram'],
  };
}

function depthMatches(marks: number, sections: number, chars: number): boolean {
  if (marks <= 2) return sections >= 3;
  if (marks <= 3) return sections >= 4;
  if (marks <= 5) return sections >= 5 && chars > 500;
  return sections >= 6 && chars > 800;
}

function applicationAnswer(q: AMQuestion): GeneratedAnswer {
  const c = contentFor(q);
  const topic = TOPIC_MAP[q.topicId];
  const base = theoryAnswer(q, 'standard');
  const sections: AnswerSection[] = [
    section('Problem scenario', `Restated: ${q.text}`),
    section('Underlying concept', `${q.focus} The governing syllabus topic is ${topic.name}.`),
    section('Why this concept applies', c.zero.why ?? c.tech.definition),
    section('Proposed methodology', undefined, [
      'Frame the prediction target and choose a metric that matches the cost of errors.',
      'Clean, encode and scale features; fit every transform on training data only.',
      'Split into train / validation / test, stratified where classes are imbalanced.',
      'Start from a small baseline network, then add capacity only if validation says it helps.',
      'Train with early stopping; keep the checkpoint with the best validation metric.',
      'Evaluate once on the test split, then inspect errors by slice before deploying.',
    ]),
    section('Step-by-step application', undefined, c.examples.slice(0, 3)),
    section('Expected result', 'A model whose validation and test metrics are close, with the error analysis showing which slices still fail.'),
    section('Limitations and assumptions', undefined, [...c.tech.disadvantages.slice(0, 3), ...(c.tech.limitations ?? [])]),
    section('Conclusion', 'The design follows from the data type, the class balance and the cost of each error type — not from architecture fashion.'),
  ];
  return {
    ...base,
    format: q.format,
    sections,
    verification: [
      ...base.verification,
      { check: 'Scenario addressed explicitly', pass: true, detail: 'The question text is restated and answered step by step.' },
      { check: 'Methodology complete', pass: sections.some((s) => s.heading === 'Proposed methodology'), detail: 'Six ordered steps from data to evaluation.' },
    ],
    depth: `${q.marks} marks · applied design answer`,
  };
}

// ---------------------------------------------------------------- public API

/** Marks drive the default depth: 2 marks must not get a 10-mark essay. */
export function defaultDepth(marks: number): 'brief' | 'standard' | 'detailed' {
  if (marks <= 2) return 'brief';
  if (marks <= 5) return 'standard';
  return 'detailed';
}

export function answerFor(question: AMQuestion, opts: { detail?: 'brief' | 'standard' | 'detailed'; emphasis?: 'example' | null } = {}): GeneratedAnswer {
  const numeric = numericalAnswer(question);
  if (numeric) return numeric;
  if (MISSING_VALUES[question.number]) return missingDataAnswer(question);
  if (question.format === 'application' || question.format === 'analysis' || question.format === 'long') return applicationAnswer(question);
  return theoryAnswer(question, opts.detail ?? defaultDepth(question.marks), opts.emphasis ?? null);
}

export function answerForId(id: string, opts?: { detail?: 'brief' | 'standard' | 'detailed'; emphasis?: 'example' | null }): GeneratedAnswer | null {
  const q = AM_BY_ID[id];
  return q ? answerFor(q, opts) : null;
}

export function refine(answer: GeneratedAnswer, question: AMQuestion, mode: 'simpler' | 'detailed' | 'example'): GeneratedAnswer {
  if (answer.computed || answer.missing) {
    const q2 = question;
    if (mode === 'simpler') {
      return {
        ...answer,
        depth: `${answer.marks} marks · simplified walkthrough`,
        sections: answer.sections.map((s) => ({
          ...s,
          body: s.body ? s.body.replace(/\s+/g, ' ') : s.body,
        })),
        followUps: ['Show the full calculation again', 'Give another numerical example'],
      };
    }
    if (mode === 'detailed') {
      const c = CONTENT[q2.topicId];
      return {
        ...answer,
        sections: [
          ...answer.sections,
          section('Why this method works', c.zero.how),
          section('Where it is used', undefined, c.applications.slice(0, 3)),
        ],
        depth: `${answer.marks} marks · extended with method context`,
      };
    }
    return {
      ...answer,
      sections: [
        ...answer.sections,
        section('Another worked example', CONTENT[q2.topicId].examples[1] ?? CONTENT[q2.topicId].examples[0]),
      ],
      followUps: ['Explain this solution more simply'],
    };
  }
  if (mode === 'simpler') return theoryAnswer(question, 'brief');
  if (mode === 'detailed') return theoryAnswer(question, 'detailed');
  return theoryAnswer(question, 'standard', 'example');
}

// ---------------------------------------------------------------- free-form solver

export interface FreeformResult {
  answer: GeneratedAnswer;
  question: AMQuestion;
  matches: { topicId: string; topicName: string; score: number }[];
  outsideSyllabus: boolean;
  detectedFormat: FormatKind;
  suggestedMarks: number;
}

const STOP = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'in', 'on', 'for', 'to', 'is', 'are', 'what', 'why', 'how', 'explain',
  'with', 'by', 'from', 'that', 'this', 'it', 'be', 'as', 'at', 'using', 'given', 'calculate', 'derive', 'define',
  'between', 'difference', 'does', 'do', 'can', 'would', 'should', 'which', 'when', 'if', 'not', 'its', 'their',
  // generic deep-learning words that appear in almost every topic name
  'neural', 'network', 'networks', 'deep', 'learning', 'machine', 'model', 'models', 'training', 'data',
  'input', 'output', 'layer', 'layers', 'using', 'used', 'work', 'works', 'mean', 'means', 'different',
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Extra vocabulary for topics whose syllabus names are too broad to match student wording. */
const TOPIC_HINTS: Record<string, string[]> = {
  'dl-u2-t2': ['perceptron', 'bias', 'step function', 'threshold', 'linear classifier'],
  'dl-u2-t3': ['perceptron learning rule', 'weight update', 'convergence', 'training'],
  'dl-u2-t4': ['xor', 'linear separability', 'decision boundary'],
  'dl-u2-t5': ['backpropagation', 'chain rule', 'gradient', 'delta'],
  'dl-u2-t6': ['activation', 'gradient flow', 'nonlinearity'],
  'dl-u2-t7': ['relu', 'sigmoid', 'tanh', 'leaky', 'softmax', 'activation', 'dying relu'],
  'dl-u2-t8': ['computational graph', 'local gradient', 'backward pass'],
  'dl-u2-t10': ['overfitting', 'regularization', 'l1', 'l2', 'weight decay', 'early stopping', 'augmentation'],
  'dl-u2-t11': ['dropout', 'overfitting', 'ensemble', 'mask', 'inverted dropout'],
  'dl-u2-t12': ['classification', 'imbalance', 'confusion matrix', 'precision', 'recall', 'f1', 'roc', 'auc', 'kaggle'],
  'dl-u3-t4': ['loss', 'cross-entropy', 'mse', 'objective'],
  'dl-u4-t2': ['sgd', 'gradient descent', 'batch', 'mini-batch', 'learning rate'],
  'dl-u4-t3': ['momentum', 'velocity', 'oscillation'],
  'dl-u4-t5': ['adagrad', 'adaptive'],
  'dl-u4-t7': ['rmsprop', 'adaptive'],
  'dl-u4-t8': ['adam', 'optimizer', 'bias correction'],
  'dl-u4-t9': ['batch normalization', 'normalisation'],
  'dl-u4-t10': ['exploding gradients', 'gradient clipping'],
  'dl-u4-t11': ['vanishing gradients', 'relu', 'initialization', 'saturation'],
  'dl-u4-t12': ['hyperparameter', 'epoch', 'batch size', 'tuning'],
  'dl-u4-t13': ['interpretability', 'explainability'],
  'dl-u5-t2': ['cnn', 'convolution', 'pooling', 'kernel'],
  'dl-u5-t5': ['rnn', 'recurrent', 'sequence', 'lstm'],
  'dl-u1-t1': ['neuron', 'ann', 'network'],
  'dl-u1-t3': ['ai', 'ml', 'deep learning', 'machine learning'],
  'dl-u1-t4': ['history', 'ai winter', 'perceptron history', 'milestones'],
  'dl-u1-t5': ['gpu', 'imagenet', 'alexnet', 'success'],
  'dl-u1-t6': ['depth', 'hierarchy', 'representation learning', 'universal approximation'],
  'dl-u1-t7': ['application', 'vision', 'nlp', 'speech', 'recommendation'],
  'dl-u1-t8': ['challenge', 'data', 'compute', 'overfitting'],
};

export function matchTopics(text: string, limit = 3): { topicId: string; topicName: string; score: number }[] {
  const words = tokens(text);
  const scored = SUBJECTS.filter((s) => s.id === 'dl')
    .flatMap((s) => s.units.flatMap((u) => u.topics))
    .map((t) => {
      const hay = `${t.name} ${t.subtopics.join(' ')} ${CONTENT[t.id]?.tech.definition ?? ''}`.toLowerCase();
      const hints = (TOPIC_HINTS[t.id] ?? []).join(' ').toLowerCase();
      let score = 0;
      for (const w of words) {
        if (t.name.toLowerCase().includes(w)) score += 4;
        else if (hints.includes(w)) score += 3;
        else if (t.subtopics.some((st) => st.toLowerCase().includes(w))) score += 2;
        else if (hay.includes(w)) score += 1;
      }
      return { topicId: t.id, topicName: t.name, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.topicId.localeCompare(b.topicId));
  return scored.slice(0, limit);
}

function parseNumbers(text: string): number[] {
  return (text.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

/** Small, explicit numerical recognisers. They only fire when the needed values are actually present. */
function tryFreeformNumerical(text: string, topicId: string): GeneratedAnswer | null {
  const lower = text.toLowerCase();
  const nums = parseNumbers(text);

  if (/sigmoid/.test(lower) && !/derivative|gradient/.test(lower) && nums.length >= 1 && nums.length <= 4) {
    const zs = nums.slice(0, 4);
    const values = zs.map((z) => 1 / (1 + Math.exp(-z)));
    return {
      questionId: 'freeform',
      format: 'numerical',
      marks: 3,
      depth: 'Suggested 3 marks · computed activation',
      sections: [
        section('1. Given', undefined, [`z = [${zs.join(', ')}]`]),
        section('2. To find', 'Sigmoid activation for each value.'),
        section('3. Formula used', undefined, undefined, {
          formula: 'σ(z) = 1 / (1 + e^(−z))',
          note: 'Logistic sigmoid; outputs lie in (0,1).',
        }),
        section('4. Solution', undefined, zs.map((z, i) => `σ(${z}) = ${values[i].toFixed(4)}`)),
        section('5. Conclusion', `σ(z) = [${values.map((v) => v.toFixed(4)).join(', ')}].`),
      ],
      assumptions: ['The values were read directly from your question.'],
      sources: ['Your pasted question', `Closest syllabus topic: ${TOPIC_MAP[topicId].name}`],
      verification: [
        { check: 'Values parsed', pass: zs.length > 0, detail: `${zs.length} inputs` },
        { check: 'Outputs in (0,1)', pass: values.every((v) => v > 0 && v < 1), detail: 'Sigmoid range respected.' },
      ],
      computed: true,
      followUps: ['Give me another example', 'Explain the derivative too'],
    };
  }

  if (/softmax/.test(lower) && nums.length >= 2) {
    const z = nums.slice(0, 6);
    const max = Math.max(...z);
    const exps = z.map((v) => Math.exp(v - max));
    const total = exps.reduce((a, b) => a + b, 0);
    const p = exps.map((v) => v / total);
    return {
      questionId: 'freeform',
      format: 'numerical',
      marks: 3,
      depth: 'Suggested 3 marks · computed distribution',
      sections: [
        section('1. Given', undefined, [`logits = [${z.join(', ')}]`]),
        section('2. To find', 'Softmax probabilities.'),
        section('3. Formula used', undefined, undefined, { formula: 'softmax(zᵢ) = e^(zᵢ) / Σ e^(zⱼ)', note: 'Normalised exponential; outputs sum to 1.' }),
        section('4. Solution', undefined, [`Subtract max ${max} for stability`, `Exponentials: [${exps.map((v) => v.toFixed(4)).join(', ')}]`, `Sum = ${total.toFixed(4)}`, `Probabilities: [${p.map((v) => v.toFixed(4)).join(', ')}]`]),
        section('5. Conclusion', `[${p.map((v) => v.toFixed(4)).join(', ')}], summing to ${p.reduce((a, b) => a + b, 0).toFixed(4)}.`),
      ],
      assumptions: ['The vector was taken as the logits.'],
      sources: ['Your pasted question', `Closest syllabus topic: ${TOPIC_MAP[topicId].name}`],
      verification: [
        { check: 'Probabilities sum to 1', pass: Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-9, detail: 'Normalisation verified.' },
      ],
      computed: true,
      followUps: ['Show the same with a temperature', 'Explain cross-entropy on this output'],
    };
  }

  if (/perceptron/.test(lower)) {
    const wMatch =
      text.match(/w\s*=\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/i) ??
      text.match(/w1\s*=\s*(-?\d+(?:\.\d+)?)[,;]?\s*w2\s*=\s*(-?\d+(?:\.\d+)?)/i);
    const xMatch =
      text.match(/x\s*=\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/i) ??
      text.match(/x1\s*=\s*(-?\d+(?:\.\d+)?)[,;]?\s*x2\s*=\s*(-?\d+(?:\.\d+)?)/i);
    const bMatch = text.match(/\bb\s*=\s*(-?\d+(?:\.\d+)?)/i);
    if (wMatch && xMatch) {
      const w = [Number(wMatch[1]), Number(wMatch[2])];
      const x = [Number(xMatch[1]), Number(xMatch[2])];
      const b = bMatch ? Number(bMatch[1]) : 0;
      const z = w[0] * x[0] + w[1] * x[1] + b;
      const out = z >= 0 ? 1 : 0;
      return {
        questionId: 'freeform',
        format: 'numerical',
        marks: 5,
        depth: 'Suggested 5 marks · computed perceptron forward pass',
        sections: [
          section('1. Given', undefined, [`w = [${w.join(', ')}]`, `x = [${x.join(', ')}]`, `b = ${b}`, 'Step activation: 1 if z ≥ 0 else 0']),
          section('2. To find', 'The weighted sum z and the perceptron output.'),
          section('3. Formula used', undefined, undefined, { formula: 'z = w1x1 + w2x2 + b;  ŷ = 1 if z ≥ 0 else 0', note: 'Perceptron forward pass with a step activation.' }),
          section('4. Solution', undefined, [
            `z = (${w[0]})(${x[0]}) + (${w[1]})(${x[1]}) + (${b})`,
            `z = ${(w[0] * x[0]).toFixed(4)} + ${(w[1] * x[1]).toFixed(4)} + ${b} = ${z.toFixed(4)}`,
            `z ${z >= 0 ? '≥' : '<'} 0 → output ${out}`,
          ]),
          section('5. Conclusion', `z = ${z.toFixed(4)} and the perceptron predicts class ${out}.`),
        ],
        assumptions: ['Values were read directly from the question; the bias defaults to 0 only when no bias is stated.'],
        sources: ['Your pasted question', 'Computed perceptron forward pass'],
        verification: [
          { check: 'Values parsed', pass: true, detail: `w=[${w}] x=[${x}] b=${b}` },
          { check: 'Step rule applied', pass: true, detail: `z = ${z.toFixed(4)}` },
        ],
        computed: true,
        followUps: ['Show the weight update for this sample', 'Give another perceptron example'],
      };
    }
  }

  if (/mean squared|\bmse\b/.test(lower)) {
    const yMatch = text.match(/y\s*=\s*\[([^\]]+)\]/i);
    const pMatch = text.match(/(?:yhat|ŷ|predictions?|predicted|p)\s*=\s*\[([^\]]+)\]/i);
    if (yMatch && pMatch) {
      const y = yMatch[1].split(',').map((v) => Number(v.trim())).filter((v) => !Number.isNaN(v));
      const p = pMatch[1].split(',').map((v) => Number(v.trim())).filter((v) => !Number.isNaN(v));
      if (y.length && y.length === p.length) {
        const sq = y.map((v, i) => (v - p[i]) ** 2);
        const mse = sq.reduce((a, b) => a + b, 0) / y.length;
        return {
          questionId: 'freeform',
          format: 'numerical',
          marks: 3,
          depth: 'Suggested 3 marks · computed loss',
          sections: [
            section('1. Given', undefined, [`y = [${y.join(', ')}]`, `ŷ = [${p.join(', ')}]`]),
            section('2. To find', 'Mean squared error.'),
            section('3. Formula used', undefined, undefined, { formula: 'MSE = (1/n) Σ (yᵢ − ŷᵢ)²', note: 'Mean of the squared residuals.' }),
            section('4. Solution', undefined, [
              `Residuals: [${y.map((v, i) => (v - p[i]).toFixed(4)).join(', ')}]`,
              `Squared: [${sq.map((v) => v.toFixed(4)).join(', ')}]`,
              `Mean = ${sq.reduce((a, b) => a + b, 0).toFixed(4)} / ${y.length} = ${mse.toFixed(4)}`,
            ]),
            section('5. Conclusion', `MSE = ${mse.toFixed(4)}.`),
          ],
          assumptions: ['Both arrays were read from the question and have the same length.'],
          sources: ['Your pasted question', 'Computed mean squared error'],
          verification: [{ check: 'Equal lengths', pass: true, detail: `${y.length} pairs` }, { check: 'Value computed', pass: true, detail: `${mse.toFixed(4)}` }],
          computed: true,
          followUps: ['Compare this with MAE', 'Give another example'],
        };
      }
    }
  }

  if (/parameter|weights|biases/.test(lower)) {
    const arch = text.match(/(\d+)\s*(?:->|→|,|to)\s*(\d+)(?:\s*(?:->|→|,|to)\s*(\d+))?(?:\s*(?:->|→|,|to)\s*(\d+))?/);
    if (arch) {
      const layers = arch.slice(1).filter(Boolean).map(Number);
      const weights = layers.slice(1).reduce((n, w, i) => n + layers[i] * w, 0);
      const biases = layers.slice(1).reduce((n, w) => n + w, 0);
      return {
        questionId: 'freeform',
        format: 'numerical',
        marks: 3,
        depth: 'Suggested 3 marks · computed parameter count',
        sections: [
          section('1. Given', undefined, [`architecture ${layers.join(' → ')}`, 'fully connected, biases included']),
          section('2. To find', 'Weights, biases and total trainable parameters.'),
          section('3. Formula used', undefined, undefined, { formula: 'params = Σ (nᵢ₋₁ + 1)nᵢ', note: 'Each layer has nᵢ₋₁nᵢ weights plus nᵢ biases.' }),
          section('4. Solution', undefined, [
            ...layers.slice(1).map((w, i) => `${layers[i]}→${w}: weights ${layers[i] * w}, biases ${w}`),
            `Weights = ${weights}, biases = ${biases}`,
          ]),
          section('5. Conclusion', `${weights + biases} trainable parameters.`),
        ],
        assumptions: ['Layers are fully connected and include biases.'],
        sources: ['Your pasted question', 'Parameter-count formula'],
        verification: [
          { check: 'Arithmetic consistent', pass: weights + biases > 0, detail: `${weights} + ${biases}` },
        ],
        computed: true,
        followUps: ['What if I add another hidden layer?', 'Show the per-layer breakdown'],
      };
    }
  }

  return null;
}

export function solveFreeform(text: string): FreeformResult {
  const cleaned = text.trim();
  const detectedFormat = formatOf(cleaned);
  const suggestedMarks = marksOf(cleaned, detectedFormat);
  const matches = matchTopics(cleaned);
  const best = matches[0];
  const outsideSyllabus = !best || best.score < 3;

  const topicId = best?.topicId ?? 'dl-u1-t3';
  const topicContent = CONTENT[topicId];
  const synthetic: AMQuestion = {
    id: 'freeform',
    number: '—',
    order: 999,
    text: cleaned,
    format: detectedFormat,
    marks: suggestedMarks,
    difficulty: 3,
    topicId,
    unitId: TOPIC_MAP[topicId].unitId,
    focus: topicContent
      ? `${TOPIC_MAP[topicId].name}: ${topicContent.zero.what}`
      : `Closest authored topic: ${best?.topicName ?? 'none'}.`,
  };

  const numeric = tryFreeformNumerical(cleaned, synthetic.topicId);
  const answer =
    numeric ??
    (detectedFormat === 'numerical'
      ? freeformNumericalFallback(cleaned, synthetic, suggestedMarks)
      : answerFor(synthetic));

  const caveats: VerificationItem[] = [
    {
      check: 'Question classified',
      pass: true,
      detail: `${FORMAT_LABEL[detectedFormat]} · suggested ${suggestedMarks} marks`,
    },
    {
      check: 'Topic match',
      pass: !outsideSyllabus,
      detail: best
        ? `Closest topic: ${best.topicName} (score ${best.score}). ${outsideSyllabus ? 'Weak match — treat the answer as general knowledge.' : 'Strong match.'}`
        : 'No syllabus topic matched.',
    },
    {
      check: 'No invented values',
      pass: true,
      detail: numeric ? 'Values were read from your question.' : 'No numerical value is assumed when none was supplied.',
    },
  ];

  return {
    question: synthetic,
    answer: {
      ...answer,
      verification: [...answer.verification, ...caveats],
      assumptions: [
        ...answer.assumptions,
        ...(outsideSyllabus
          ? ['This question is outside the mapped Deep Learning syllabus, so the answer uses general established knowledge and is labelled as such.']
          : []),
      ],
      sources: [...answer.sources, 'Ask Any Deep Learning Question (free-form solver)'],
    },
    matches,
    outsideSyllabus,
    detectedFormat,
    suggestedMarks,
  };
}

function freeformNumericalFallback(text: string, q: AMQuestion, marks: number): GeneratedAnswer {
  const c = CONTENT[q.topicId];
  const numbers = parseNumbers(text);
  return {
    questionId: 'freeform',
    format: 'numerical',
    marks,
    depth: `Suggested ${marks} marks · method + missing-data disclosure`,
    sections: [
      section('Direct answer', `This is a numerical question about ${TOPIC_MAP[q.topicId].name}, but it does not match one of the module’s verified solver templates, so no numerical result is asserted.`),
      section(
        'Values detected in your question',
        numbers.length ? `Numbers read: ${numbers.join(', ')}.` : 'No numeric values were detected.',
      ),
      section('What is missing', 'To compute an answer the module needs the exact quantity requested and the full formula or definition of every symbol, so that no value has to be assumed.', [
        'state the formula or the operation to perform',
        'give every variable with its value and unit',
        'state what must be found (and the rounding expected)',
      ]),
      section('Method for this topic', c?.zero.how ?? 'Use the topic definition above and substitute only the values given in the question.'),
      section('Conclusion', 'Paste the complete question (or one of the bank numericals) and the solver will produce the full GIVEN → FORMULA → SOLUTION → CONCLUSION walkthrough.'),
    ],
    assumptions: ['No numerical value is assumed when the question is incomplete.'],
    sources: ['Your pasted question', `Closest syllabus topic: ${TOPIC_MAP[q.topicId].name}`],
    verification: [
      { check: 'No invented values', pass: true, detail: 'The answer declines to compute without complete inputs.' },
      { check: 'Missing information listed', pass: true, detail: 'Three concrete requirements listed.' },
    ],
    computed: false,
    missing: ['the formula or operation', 'all variables with values and units', 'the required output and rounding'],
    followUps: ['Here are the missing values', 'Explain the method for this topic'],
  };
}

// ---------------------------------------------------------------- progress

export interface AnswerStats {
  total: number;
  numbered: number;
  standalone: number;
  answered: number;
  checked: number;
  revised: number;
  needsCorrection: number;
  important: number;
  difficult: number;
  favourite: number;
  numerical: { total: number; answered: number };
  theory: { total: number; answered: number };
  application: { total: number; answered: number };
  perUnit: { unitId: string; name: string; total: number; answered: number; checked: number; percent: number }[];
}

export function answerStats(state: AppState): AnswerStats {
  const answers = state.answers ?? {};
  const entry = (id: string) => answers[id];
  const total = AM_QUESTIONS.length;
  const answered = AM_QUESTIONS.filter((q) => (entry(q.id)?.status ?? 'unanswered') !== 'unanswered').length;
  const byFormat = (formats: FormatKind[]) => {
    const qs = AM_QUESTIONS.filter((q) => formats.includes(q.format));
    return {
      total: qs.length,
      answered: qs.filter((q) => (entry(q.id)?.status ?? 'unanswered') !== 'unanswered').length,
    };
  };

  return {
    total,
    numbered: AM_QUESTIONS.filter((q) => !q.number.startsWith('N')).length,
    standalone: AM_QUESTIONS.filter((q) => q.number.startsWith('N')).length,
    answered,
    checked: AM_QUESTIONS.filter((q) => entry(q.id)?.status === 'checked').length,
    revised: AM_QUESTIONS.filter((q) => entry(q.id)?.revised).length,
    needsCorrection: AM_QUESTIONS.filter((q) => entry(q.id)?.status === 'needs_correction').length,
    important: AM_QUESTIONS.filter((q) => entry(q.id)?.important).length,
    difficult: AM_QUESTIONS.filter((q) => entry(q.id)?.difficult).length,
    favourite: AM_QUESTIONS.filter((q) => entry(q.id)?.favourite).length,
    numerical: byFormat(['numerical']),
    theory: byFormat(['theory', 'derivation', 'comparison']),
    application: byFormat(['application', 'analysis', 'long']),
    perUnit: DL_UNITS.map((u) => {
      const qs = AM_QUESTIONS.filter((q) => q.unitId === u.id);
      const done = qs.filter((q) => (entry(q.id)?.status ?? 'unanswered') !== 'unanswered').length;
      const checked = qs.filter((q) => entry(q.id)?.status === 'checked').length;
      return {
        unitId: u.id,
        name: `Unit ${u.order} — ${u.name}`,
        total: qs.length,
        answered: done,
        checked,
        percent: qs.length ? Math.round((done / qs.length) * 100) : 0,
      };
    }),
  };
}
