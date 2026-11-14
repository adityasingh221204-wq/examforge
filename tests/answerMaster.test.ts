// EXAMFORGE — Deep Learning Answer Master tests.
// Verifies import fidelity, answer structure by format, numerical correctness, missing-data
// behaviour, free-form solving and progress accounting.

import { describe, expect, it } from 'vitest';
import { AM_QUESTIONS, AM_BY_ID, AM_TOTAL, AM_NUMBERED_TOTAL } from '../src/data/answerMaster';
import { answerFor, answerForId, answerStats, refine, solveFreeform } from '../src/engine/answerMaster';
import { NUMERICAL_SOLUTIONS } from '../src/data/answerMaster/numericals';
import { defaultState, parseImportedState, STATE_VERSION } from '../src/engine/storage';
import type { AnswerProgress } from '../src/data/answerMaster/types';

const byNumber = (n: string) => AM_QUESTIONS.find((q) => q.number === n)!;
const conclusion = (q: string) => answerFor(byNumber(q)).sections.find((s) => s.heading.startsWith('5.'))!.body!;

describe('question bank import', () => {
  it('imports 234 numbered questions plus the 5 standalone numericals', () => {
    expect(AM_TOTAL).toBe(239);
    expect(AM_NUMBERED_TOTAL).toBe(234);
    expect(AM_QUESTIONS.filter((q) => q.number.startsWith('N'))).toHaveLength(5);
  });

  it('preserves the original numbering and order', () => {
    const numbered = AM_QUESTIONS.filter((q) => !q.number.startsWith('N'));
    expect(numbered.map((q) => Number(q.number))).toEqual(Array.from({ length: 234 }, (_, i) => i + 1));
    expect(AM_QUESTIONS.slice(0, 5).map((q) => q.number)).toEqual(['N1', 'N2', 'N3', 'N4', 'N5']);
    expect(AM_QUESTIONS[5].number).toBe('1');
    expect(AM_QUESTIONS[AM_QUESTIONS.length - 1].number).toBe('234');
    for (let i = 1; i < AM_QUESTIONS.length; i++) expect(AM_QUESTIONS[i].order).toBeGreaterThan(AM_QUESTIONS[i - 1].order);
  });

  it('keeps every question verbatim and non-empty', () => {
    for (const q of AM_QUESTIONS) {
      expect(q.text.length).toBeGreaterThan(8);
      expect(q.text).not.toContain('**');
      expect(q.text).not.toContain('_');
      expect(AM_BY_ID[q.id]).toBe(q);
    }
    expect(AM_BY_ID['dlq-1'].text.startsWith('Define Artificial Intelligence')).toBe(true);
    expect(AM_BY_ID['dlq-234'].text).toContain('vanishing gradients and overfitting simultaneously');
  });

  it('assigns every question a real syllabus topic, unit, format and marks', () => {
    for (const q of AM_QUESTIONS) {
      expect(q.unitId).toMatch(/^dl-u[1-5]$/);
      expect(q.marks).toBeGreaterThanOrEqual(2);
      expect(['numerical', 'theory', 'comparison', 'application', 'diagram', 'derivation', 'analysis', 'long']).toContain(q.format);
      expect(q.focus.length).toBeGreaterThan(20);
    }
  });

  it('classifies the question types the document actually uses', () => {
    expect(byNumber('N1').format).toBe('numerical');
    expect(byNumber('94').format).toBe('numerical');
    expect(byNumber('112').format).toBe('theory');
    expect(byNumber('124').format).toBe('comparison');
    expect(byNumber('190').format).toBe('application');
    expect(byNumber('223').format).toBe('analysis');
    expect(byNumber('234').format).toBe('long');
    expect(byNumber('160').format).toBe('diagram');
  });
});

describe('theory answers', () => {
  it('builds a structured exam answer for a theory question', () => {
    const a = answerFor(byNumber('2'), { detail: 'standard' });
    expect(a.sections[0].heading).toBe('Direct answer');
    const headings = a.sections.map((s) => s.heading);
    expect(headings).toEqual(expect.arrayContaining(['Definition and core concept', 'How it works', 'Conclusion']));
    expect(a.sections.some((s) => s.bullets?.length)).toBe(true);
    expect(a.verification.length).toBeGreaterThanOrEqual(5);
    expect(a.verification.every((v) => v.pass)).toBe(true);
    expect(a.marks).toBe(byNumber('2').marks);
  });

  it('adapts length to the requested depth', () => {
    const short = answerFor(byNumber('56'), { detail: 'brief' });
    const full = answerFor(byNumber('56'), { detail: 'detailed' });
    expect(full.sections.length).toBeGreaterThan(short.sections.length);
    expect(full.sections.some((s) => s.heading === 'Examination vocabulary')).toBe(true);
  });

  it('produces a comparison table for comparison questions', () => {
    const a = answerFor(byNumber('63'));
    const t = a.sections.find((s) => s.table)!.table!;
    expect(t.columns.length).toBeGreaterThan(2);
    expect(t.rows.length).toBeGreaterThan(2);
  });

  it('answers application questions with a methodology', () => {
    const a = answerFor(byNumber('191'));
    expect(a.sections.map((s) => s.heading)).toEqual(
      expect.arrayContaining(['Problem scenario', 'Proposed methodology', 'Limitations and assumptions']),
    );
  });

  it('refines an answer without changing the question', () => {
    const q = byNumber('27');
    const a = answerFor(q);
    const detailed = refine(a, q, 'detailed');
    expect(detailed.sections.length).toBeGreaterThan(a.sections.length);
    expect(answerFor(q).questionId).toBe(q.id);
  });
});

describe('numerical answers', () => {
  it('solves the standalone perceptron problems', () => {
    const n1 = answerFor(byNumber('N1'));
    expect(n1.computed).toBe(true);
    expect(n1.sections.map((s) => s.heading)).toEqual([
      '1. Given',
      '2. To find / to prove',
      '3. Formula used',
      '4. Solution',
      '5. Conclusion / final answer',
    ]);
    expect(n1.sections[4].body).toContain('-0.8');

    const n2 = answerFor(byNumber('N2'));
    expect(n2.sections[4].body).toContain('0.3');
    expect(n2.sections[4].body).toContain('-0.2');
    expect(n2.sections[4].body).toContain('0.2');
  });

  it('computes activation, loss and gradient numerics correctly', () => {
    expect(conclusion('69')).toContain('0.1192');
    expect(conclusion('73')).toContain('0.6652');
    expect(conclusion('84')).toContain('0.08');
    expect(conclusion('85')).toContain('0.2231');
    expect(conclusion('87')).toContain('0.3567');
    expect(conclusion('94')).toContain('-0.2115');
    expect(conclusion('95')).toContain('-4.5');
    expect(conclusion('98')).toContain('0');
    expect(conclusion('109')).toContain('-0.5781');
    expect(conclusion('219')).toContain('0.7063');
  });

  it('computes optimisation, regularisation and parameter counts', () => {
    expect(conclusion('133')).toContain('3.6893');
    expect(conclusion('134')).toContain('1.124');
    expect(conclusion('135')).toContain('2.048');
    expect(conclusion('154')).toContain('3.2');
    expect(conclusion('155')).toContain('2.9');
    expect(conclusion('156')).toContain('3.8');
    expect(conclusion('170')).toContain('151');
    expect(conclusion('171')).toContain('7160');
    expect(conclusion('172')).toContain('235146');
  });

  it('builds the optimiser comparison table', () => {
    const a = answerFor(byNumber('222'));
    const t = a.sections.find((s) => s.table)!.table!;
    expect(t.rows).toHaveLength(6);
    expect(t.rows[0][1]).toBe('10');
    expect(t.rows[5][0]).toBe('5');
  });

  it('reports missing values instead of inventing them', () => {
    for (const n of ['110', '161', '220', '221', '228']) {
      const a = answerFor(byNumber(n));
      expect(a.missing?.length).toBeGreaterThan(0);
      expect(a.sections.map((s) => s.heading)).toContain('Missing information');
      expect(a.verification.every((v) => v.pass)).toBe(true);
    }
    const q225 = answerFor(byNumber('225'));
    expect(q225.missing?.length).toBeGreaterThan(0);
    expect(q225.assumptions.join(' ')).toContain('illustration');
    const q161 = answerFor(byNumber('161'));
    expect(q161.sections[0].body).toContain('No architecture');
  });

  it('covers every solver with passing checks and a numeric conclusion', () => {
    expect(Object.keys(NUMERICAL_SOLUTIONS).length).toBeGreaterThanOrEqual(30);
    for (const key of Object.keys(NUMERICAL_SOLUTIONS)) {
      const q = byNumber(key);
      expect(q, `question ${key} missing`).toBeDefined();
      const a = answerFor(q);
      expect(a.computed).toBe(true);
      expect(a.sections.find((s) => s.heading.startsWith('5.'))?.body).toMatch(/\d/);
      expect(a.verification.every((v) => v.pass)).toBe(true);
    }
  });
});

describe('ask any question', () => {
  it('solves a sigmoid question that is not in the bank', () => {
    const r = solveFreeform('Calculate the sigmoid output for z = 1 and z = -1');
    expect(r.answer.computed).toBe(true);
    expect(r.answer.sections[4].body).toContain('0.7311');
    expect(r.outsideSyllabus).toBe(false);
  });

  it('solves a softmax question and verifies normalisation', () => {
    const r = solveFreeform('Calculate the softmax probabilities for z = [1, 2, 3]');
    expect(r.answer.computed).toBe(true);
    const sum = r.answer.verification.find((v) => v.check.includes('sum'));
    expect(sum?.pass).toBe(true);
  });

  it('solves a new perceptron forward-pass question', () => {
    const r = solveFreeform('A perceptron has w = [0.5, -0.25], b = 0.1 and input x = [2, 4]. What is the output?');
    expect(r.answer.computed).toBe(true);
    expect(r.answer.sections[4].body).toContain('0.1');
    expect(r.answer.sections[4].body).toContain('1');
  });

  it('computes MSE for arrays pasted with the question', () => {
    const r = solveFreeform('Calculate MSE for y = [1, 0, 1] and predictions = [0.8, 0.2, 0.6]');
    expect(r.answer.computed).toBe(true);
    expect(r.answer.sections[4].body).toContain('0.0800');
  });

  it('computes a parameter count from an architecture', () => {
    const r = solveFreeform('Calculate the number of parameters for architecture 4 -> 5 -> 3');
    expect(r.answer.computed).toBe(true);
    expect(r.answer.sections[4].body).toContain('43');
  });

  it('classifies a free-form theory question and finds its topic', () => {
    const r = solveFreeform('Explain why dropout reduces overfitting');
    expect(r.detectedFormat).toBe('theory');
    expect(r.matches[0].topicId).toBe('dl-u2-t11');
    expect(r.answer.sections[0].heading).toBe('Direct answer');
  });

  it('discloses an outside-syllabus question', () => {
    const r = solveFreeform('Explain Kubernetes pod autoscaling and ingress controllers');
    expect(r.outsideSyllabus).toBe(true);
    expect(r.answer.assumptions.join(' ')).toContain('outside the mapped Deep Learning syllabus');
  });

  it('refuses to invent numbers when a numerical question is incomplete', () => {
    const r = solveFreeform('Calculate the gradient for a network with some weights and a loss');
    expect(r.answer.missing?.length).toBeGreaterThan(0);
    expect(r.answer.computed).toBe(false);
    expect(r.answer.sections.some((s) => s.heading === 'What is missing')).toBe(true);
  });
});

describe('progress tracking', () => {
  it('counts answered, checked, revised and corrections separately', () => {
    let state = { ...defaultState(), seeded: true };
    const answers: Record<string, AnswerProgress> = {
      'dlq-1': { status: 'checked', revised: true },
      'dlq-2': { status: 'generated' },
      'dlq-3': { status: 'needs_correction' },
      'dlq-170': { status: 'checked' },
      'dlq-171': { status: 'generated', important: true },
    };
    state = { ...state, answers };
    const stats = answerStats(state);
    expect(stats.total).toBe(239);
    expect(stats.answered).toBe(5);
    expect(stats.checked).toBe(2);
    expect(stats.revised).toBe(1);
    expect(stats.needsCorrection).toBe(1);
    expect(stats.important).toBe(1);
    expect(stats.numerical.answered).toBe(2);
    expect(stats.perUnit.reduce((n, u) => n + u.total, 0)).toBe(239);
    expect(stats.perUnit.find((u) => u.unitId === 'dl-u2')!.total).toBeGreaterThan(0);
  });

  it('upgrades a version-3 save without losing progress', () => {
    const legacy = JSON.stringify({
      version: 3,
      progress: { 'dl-u1-t1': { status: 'mastered', level: 5 } },
      attempts: [],
      materials: [],
    });
    const state = parseImportedState(legacy)!;
    expect(state.version).toBe(STATE_VERSION);
    expect(state.answers).toEqual({});
    expect(state.progress['dl-u1-t1'].status).toBe('mastered');
    expect(defaultState().answers).toEqual({});
  });

  it('does not count an opened answer as revised', () => {
    const stats = answerStats({ ...defaultState(), answers: { 'dlq-1': { status: 'generated', views: 9 } } });
    expect(stats.revised).toBe(0);
    expect(answerForId('dlq-1')).not.toBeNull();
  });
});
