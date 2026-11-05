// EXAMFORGE — material ingest QA suite.
//
// Covers the analysis pipeline the Add Material page depends on: text cleaning,
// sectioning, block classification, topic matching, subject detection,
// summarising, de-duplication, committing into state and store migration.

import { describe, expect, it } from 'vitest';
import {
  AUTO_ACCEPT_CONFIDENCE,
  MAX_SECTION_CHARS,
  addMaterial,
  analyseMaterial,
  classifySection,
  cleanText,
  detectSubject,
  extractKeyTerms,
  fingerprint,
  flatten,
  matchText,
  materialSummary,
  materialsForTopic,
  removeMaterial,
  removeMaterialSource,
  searchMaterials,
  similarity,
  splitSections,
  stem,
  summariseSentences,
  tokenise,
  wordCount,
} from '../src/engine/ingest';
import { TOPIC_MAP } from '../src/data/syllabus';
import { defaultState, loadState, STATE_VERSION, STORAGE_KEY } from '../src/engine/storage';
import type { MaterialAttachment } from '../src/data/types';

const DL_NOTES = `Backpropagation computes the gradient of the loss with respect to every weight using the chain rule.
During the forward pass activations are cached, and the backward pass propagates the error signal layer by layer.
Weight update then uses gradient descent with the chosen learning rate.`;

const CN_NOTES = `TCP congestion control uses slow start, congestion avoidance, fast retransmit and fast recovery.
The congestion window grows exponentially during slow start and linearly during congestion avoidance.
Packet loss is treated as a congestion signal.`;

const NLP_NOTES = `Word embeddings map tokens into a dense vector space. Word2Vec trains skip-gram and CBOW models
so that words in similar contexts receive similar representations. Cosine similarity then measures semantic closeness.`;

const CLOUD_NOTES = `Infrastructure as a Service provides virtual machines, storage and networking on demand.
The cloud provider manages the physical hardware while the customer manages the operating system, middleware
and applications.`;

describe('text cleaning', () => {
  it('repairs hyphenated line breaks and strips page furniture', () => {
    const raw = 'A neural net-\nwork learns representations.\n\nPage 4 of 12\n\n- weights\n- biases';
    const cleaned = cleanText(raw);
    expect(cleaned).toContain('neural network learns representations.');
    expect(cleaned).not.toMatch(/Page 4 of 12/);
    expect(cleaned).toContain('- weights');
  });

  it('normalises dashes and collapses runs of whitespace', () => {
    expect(flatten('Slow–Start   (TCP)')).toBe('slow-start tcp');
    expect(cleanText('a    b\n\n\n\nc')).toBe('a b\n\nc');
  });

  it('tokenises without stopwords and applies light stemming', () => {
    const tokens = tokenise('The networks are learning representations of the data');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('are');
    expect(tokens).toContain('network');
    expect(tokens).toContain('learn');
    expect(stem('networks')).toBe('network');
    expect(stem('classification')).toBe('classific');
    expect(stem('processes')).toBe('process');
  });

  it('counts words', () => {
    expect(wordCount('  one two   three ')).toBe(3);
  });
});

describe('section splitting', () => {
  it('splits on markdown, numbered and upper-case headings', () => {
    const doc = `# Backpropagation
Gradients are computed with the chain rule and propagated backwards.

2.1 TCP Congestion Control
Slow start grows the window exponentially.

NORMALISATION
Batch normalisation stabilises training by re-centring activations.`;
    const sections = splitSections(doc);
    expect(sections.map((s) => s.heading)).toEqual(['Backpropagation', 'TCP Congestion Control', 'NORMALISATION']);
    expect(sections[0].body).toContain('chain rule');
  });

  it('drops a short document title line instead of filing it as a block', () => {
    const doc = `Unit 2 — Neural Network Training (handout)\n\n# Backpropagation\nGradients are computed with the chain rule.\n`;
    const sections = splitSections(doc);
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe('Backpropagation');
  });

  it('keeps a sentence that ends with a full stop as content', () => {
    const sections = splitSections('This handout covers unit 2.\n\n# Backpropagation\nGradients use the chain rule.');
    expect(sections[0].heading).not.toBe('Backpropagation');
    expect(sections.some((s) => s.body.includes('covers unit 2'))).toBe(true);
  });

  it('keeps a document without headings as one section', () => {
    const sections = splitSections(DL_NOTES);
    expect(sections).toHaveLength(1);
    expect(sections[0].body).toContain('chain rule');
  });

  it('chunks oversized bodies at sentence boundaries', () => {
    const sentence = 'Gradient descent updates each parameter in the direction of the negative gradient. ';
    const doc = `# Optimisation\n${sentence.repeat(60)}`;
    const sections = splitSections(doc);
    expect(sections.length).toBeGreaterThan(1);
    for (const section of sections) {
      expect(section.body.length).toBeLessThanOrEqual(MAX_SECTION_CHARS + sentence.length);
    }
    expect(sections[1].heading).toContain('(2)');
  });

  it('returns nothing for empty input', () => {
    expect(splitSections('   ')).toEqual([]);
  });
});

describe('block classification', () => {
  it('recognises formulas, definitions, examples, procedures and comparisons', () => {
    expect(classifySection('Accuracy = (TP + TN) / (TP + TN + FP + FN)')).toBe('formula');
    expect(classifySection('Dropout is defined as randomly removing units during training.')).toBe('definition');
    expect(classifySection('For example, a 3x3 convolution over a 224px image produces 222px output.')).toBe('example');
    expect(classifySection('Step 1: initialise weights\nStep 2: forward pass\nStep 3: update weights')).toBe('procedure');
    expect(classifySection('Compare TCP and UDP: connection-oriented versus connectionless.')).toBe('comparison');
    expect(classifySection('Dropout reduces overfitting in large fully connected layers.')).toBe('notes');
  });
});

describe('topic matching', () => {
  it('files a backpropagation paragraph under the Backpropagation topic', () => {
    const [best] = matchText(DL_NOTES);
    expect(TOPIC_MAP[best.topicId].name).toBe('Backpropagation');
    expect(best.confidence).toBeGreaterThanOrEqual(AUTO_ACCEPT_CONFIDENCE);
  });

  it('files a congestion-control paragraph under TCP congestion control', () => {
    const [best] = matchText(CN_NOTES);
    expect(TOPIC_MAP[best.topicId].name).toBe('TCP Congestion control');
    expect(TOPIC_MAP[best.topicId].subjectId).toBe('cn');
  });

  it('handles parenthetical topic names through their acronym', () => {
    const [best] = matchText(CLOUD_NOTES);
    expect(TOPIC_MAP[best.topicId].name).toBe('Infrastructure as a Service (IaaS)');
  });

  it('does not match a short topic name inside a longer word', () => {
    const matches = matchText('The operator manages infrastructure and monitors applications.');
    expect(matches.some((m) => TOPIC_MAP[m.topicId].name === 'NAG')).toBe(false);
  });

  it('boosts the chosen subject without hiding a clearly better match elsewhere', () => {
    const asCloud = matchText(CLOUD_NOTES, { subjectId: 'cloud', limit: 20 })[0];
    expect(TOPIC_MAP[asCloud.topicId].subjectId).toBe('cloud');

    const cnWithoutPrior = matchText(CLOUD_NOTES, { limit: 20 }).find(
      (m) => TOPIC_MAP[m.topicId].subjectId === 'cn',
    );
    const cnWithPrior = matchText(CLOUD_NOTES, { subjectId: 'cn', limit: 20 }).find(
      (m) => TOPIC_MAP[m.topicId].subjectId === 'cn',
    );
    expect(cnWithPrior?.score ?? 0).toBeGreaterThan(cnWithoutPrior?.score ?? 0);
  });

  it('returns no matches for unrelated text', () => {
    expect(matchText('The cafeteria closes at four on Fridays.')).toEqual([]);
  });

  it('reports match signals and keeps the list bounded', () => {
    const matches = matchText(DL_NOTES);
    expect(matches.length).toBeLessThanOrEqual(4);
    expect(matches[0].signals.length).toBeGreaterThan(0);
    expect(matches[0].score).toBeGreaterThan(0);
  });
});

describe('subject detection', () => {
  it('detects each subject from a paragraph of its notes', () => {
    expect(detectSubject(DL_NOTES).subjectId).toBe('dl');
    expect(detectSubject(CN_NOTES).subjectId).toBe('cn');
    expect(detectSubject(NLP_NOTES).subjectId).toBe('nlp');
    expect(detectSubject(CLOUD_NOTES).subjectId).toBe('cloud');
  });

  it('declines to guess on unrelated text', () => {
    const result = detectSubject('Remember to buy milk and call the electrician on Tuesday.');
    expect(result.subjectId).toBeNull();
    expect(result.scores).toHaveLength(4);
  });
});

describe('summaries and key terms', () => {
  it('returns a bounded extractive summary', () => {
    const summary = summariseSentences(CN_NOTES, ['congestion', 'window']);
    expect(summary.length).toBeGreaterThan(30);
    expect(summary.length).toBeLessThanOrEqual(340);
  });

  it('extracts topic-relevant key terms', () => {
    const terms = extractKeyTerms(CN_NOTES, 'cn-u4-t1');
    expect(terms.length).toBeGreaterThan(0);
    expect(terms.length).toBeLessThanOrEqual(8);
    expect(terms.map((t) => t.toLowerCase())).toContain('congestion');
  });

  it('falls back to raw text when there are no sentences', () => {
    expect(summariseSentences('short', []).length).toBeGreaterThan(0);
  });
});

describe('de-duplication', () => {
  it('computes 1 for identical text and 0 for unrelated text', () => {
    expect(similarity(CN_NOTES, CN_NOTES)).toBe(1);
    expect(similarity('tcp window scaling', 'word embeddings vector space')).toBe(0);
    expect(fingerprint(CN_NOTES)).toBe(fingerprint(CN_NOTES));
  });
});

describe('document analysis', () => {
  const doc = `# Backpropagation
Gradients are computed with the chain rule and propagated backwards through the network.

# TCP Congestion Control
Slow start grows the congestion window exponentially until the threshold is reached.

# Reinforcement Learning basics
Q-learning updates a value function from rewards.`;

  it('matches sections, flags unmatched ones and reports statistics', () => {
    const analysis = analyseMaterial(doc, { sourceName: 'mixed.md' });
    expect(analysis.sections).toHaveLength(3);
    expect(analysis.stats.matched).toBe(2);
    expect(analysis.stats.unmatched).toBe(1);
    expect(analysis.stats.sections).toBe(3);
    expect(analysis.warnings.join(' ')).toContain('could not be linked');
    const names = analysis.sections.filter((s) => s.topicId).map((s) => TOPIC_MAP[s.topicId as string].name);
    expect(names).toContain('Backpropagation');
    expect(names).toContain('TCP Congestion control');
  });

  it('honours an explicitly chosen subject', () => {
    const analysis = analyseMaterial(DL_NOTES, { subjectId: 'dl', sourceName: 'dl.txt' });
    expect(analysis.requestedSubject).toBe('dl');
    expect(analysis.subjectId).toBe('dl');
  });

  it('marks duplicates of existing material as not selected', () => {
    const first = analyseMaterial(CN_NOTES, { subjectId: 'cn', sourceName: 'cn.txt' });
    const topic = first.sections[0].topicId as string;
    const existing: MaterialAttachment = {
      id: 'mat-existing',
      sourceId: 'src-existing',
      sourceName: 'cn.txt',
      subjectId: 'cn',
      unitId: TOPIC_MAP[topic].unitId,
      topicId: topic,
      title: 'TCP Congestion Control',
      kind: 'notes',
      body: first.sections[0].body,
      summary: 'existing',
      keyTerms: [],
      confidence: 90,
      signals: [],
      addedAt: 1,
      words: 40,
    };
    const second = analyseMaterial(CN_NOTES, { subjectId: 'cn', sourceName: 'cn-again.txt', existing: [existing] });
    expect(second.stats.duplicates).toBe(1);
    expect(second.sections[0].duplicateOf).toBe('mat-existing');
    expect(second.sections[0].selected).toBe(false);
  });

  it('detects duplicates inside a single document', () => {
    const repeated = `# Congestion control\n${CN_NOTES}\n\n# Congestion control again\n${CN_NOTES}`;
    const analysis = analyseMaterial(repeated, { subjectId: 'cn' });
    expect(analysis.stats.duplicates).toBeGreaterThanOrEqual(1);
  });

  it('warns when there is nothing to read', () => {
    const analysis = analyseMaterial('   \n  ');
    expect(analysis.sections).toHaveLength(0);
    expect(analysis.warnings[0]).toMatch(/No readable text/);
  });
});

describe('committing material into state', () => {
  it('adds attachments under the matched topics and records the source', () => {
    const analysis = analyseMaterial(DL_NOTES, { subjectId: 'dl', sourceName: 'dl-week2.txt' });
    const result = addMaterial(defaultState(), analysis, analysis.sections, {
      sourceName: 'dl-week2.txt',
      mime: 'text/plain',
      bytes: DL_NOTES.length,
      now: 1_700_000_000_000,
    });

    expect(result.added.length).toBe(1);
    expect(result.source?.attached).toBe(1);
    const attachment = result.added[0];
    expect(attachment.topicId).toBe(TOPIC_MAP[attachment.topicId].id);
    expect(TOPIC_MAP[attachment.topicId].name).toBe('Backpropagation');
    expect(attachment.subjectId).toBe('dl');
    expect(attachment.unitId).toBe(TOPIC_MAP[attachment.topicId].unitId);
    expect(attachment.summary.length).toBeGreaterThan(20);
    expect(attachment.keyTerms.length).toBeGreaterThan(0);

    const stored = materialsForTopic(result.state, attachment.topicId);
    expect(stored).toHaveLength(1);
    expect(result.state.materialSources[0].name).toBe('dl-week2.txt');
  });

  it('skips re-importing the same text into the same state', () => {
    const analysis = analyseMaterial(DL_NOTES, { subjectId: 'dl', sourceName: 'dl.txt' });
    const first = addMaterial(defaultState(), analysis, analysis.sections, { sourceName: 'dl.txt' });
    const second = addMaterial(first.state, analysis, analysis.sections, { sourceName: 'dl.txt' });
    expect(second.added).toHaveLength(0);
    expect(second.skipped).toBeGreaterThan(0);
    expect(second.state.materials).toHaveLength(1);
  });

  it('leaves deselected blocks out', () => {
    const analysis = analyseMaterial(`${DL_NOTES}\n\n# Notes\nUnrelated closing remark about scheduling.`, {
      subjectId: 'dl',
    });
    const drafts = analysis.sections.map((section) => ({ ...section, selected: false }));
    const result = addMaterial(defaultState(), analysis, drafts, { sourceName: 'dl.txt' });
    expect(result.added).toHaveLength(0);
    expect(result.state.materials).toHaveLength(0);
  });

  it('removes a single block and then its orphaned source', () => {
    const analysis = analyseMaterial(DL_NOTES, { subjectId: 'dl', sourceName: 'dl.txt' });
    const { state } = addMaterial(defaultState(), analysis, analysis.sections, { sourceName: 'dl.txt' });
    const material = state.materials[0];

    const afterItem = removeMaterial(state, material.id);
    expect(afterItem.materials).toHaveLength(0);
    expect(afterItem.materialSources).toHaveLength(0);

    const afterSource = removeMaterialSource(state, material.sourceId);
    expect(afterSource.materials).toHaveLength(0);
    expect(afterSource.materialSources).toHaveLength(0);
  });
});

describe('material library helpers', () => {
  const analysis = analyseMaterial(CN_NOTES, { subjectId: 'cn', sourceName: 'cn-notes.txt' });
  const { state } = addMaterial(defaultState(), analysis, analysis.sections, { sourceName: 'cn-notes.txt' });

  it('summarises the library', () => {
    const summary = materialSummary(state);
    expect(summary.attachments).toBe(1);
    expect(summary.sources).toBe(1);
    expect(summary.topics).toBe(1);
    expect(summary.words).toBeGreaterThan(20);
    expect(Object.values(summary.kinds).reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('searches titles, summaries and key terms', () => {
    expect(searchMaterials(state, 'congestion').length).toBe(1);
    expect(searchMaterials(state, 'zzzz')).toHaveLength(0);
    expect(searchMaterials(state, 'c')).toHaveLength(1); // too short to filter — returns the library
  });
});

describe('state migration', () => {
  it('migrates a v1 save that has no materials fields', () => {
    const legacy = {
      ...defaultState(),
      version: 1,
      materials: undefined,
      materialSources: undefined,
      progress: { 'dl-u2-t5': { status: 'learned', studyMinutes: 30, assessments: [] } },
    };
    const store = new Map<string, string>([[STORAGE_KEY, JSON.stringify(legacy)]]);
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
        key: (i: number) => [...store.keys()][i] ?? null,
        get length() {
          return store.size;
        },
      },
    });

    const loaded = loadState();
    expect(loaded.version).toBe(STATE_VERSION);
    expect(loaded.materials).toEqual([]);
    expect(loaded.materialSources).toEqual([]);
    expect(loaded.progress['dl-u2-t5'].status).toBe('learned');
  });
});
