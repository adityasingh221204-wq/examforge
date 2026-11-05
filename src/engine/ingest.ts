// EXAMFORGE — material ingest engine.
//
// Turns an arbitrary document (lecture notes, slides exported as text, a past
// paper, a textbook chapter) into study material filed under the official
// syllabus topics. Everything here is deterministic and pure: the same document
// always produces the same sections, the same topics and the same confidence
// scores. No network, no model calls.
//
// Pipeline
//   cleanText        → normalise whitespace, PDF hyphenation, bullets
//   splitSections    → headings / paragraphs, with oversized blocks chunked
//   classifySection  → definition | formula | example | procedure | comparison | notes
//   matchText        → weighted phrase + IDF term scoring against 172 syllabus topics
//   summariseSentences / extractKeyTerms → what the review screen shows
//   dedupe           → exact fingerprints and near-duplicate Jaccard similarity
//   addMaterial      → commit reviewed sections into AppState

import type {
  AppState,
  MaterialAttachment,
  MaterialSectionKind,
  MaterialSource,
  SubjectId,
  Topic,
} from '../data/types';
import { ALL_TOPICS, SUBJECTS, TOPIC_MAP, unitOf } from '../data/syllabus';

// ---------------------------------------------------------------- thresholds

/** A section is filed under a topic only at or above this score. */
export const MATCH_SCORE_FLOOR = 3.5;
/** Confidence at which a match is pre-selected on the review screen. */
export const AUTO_ACCEPT_CONFIDENCE = 55;
/** Confidence below which a match is shown as "check this" in the UI. */
export const LOW_CONFIDENCE = 40;
/** Section bodies larger than this are chunked at sentence boundaries. */
export const MAX_SECTION_CHARS = 2400;
/** Jaccard similarity above which two blocks count as the same material. */
export const DUPLICATE_SIMILARITY = 0.85;
/** Matches returned per section (primary + alternatives). */
export const MAX_MATCHES = 4;

// ---------------------------------------------------------------- text basics

const STOPWORDS = new Set(
  `a an the of in on for to with and or but if then than that this these those from by as at is are was
  were be been being it its into within without about over under between among during across per via using
  use used uses such not no nor can could should would may might will shall do does did has have had which
  who whom whose what when where why how all any both each few more most other some only own same so too
  very also there their them they we you your our i he she his her him one two three four five first second
  third given following below above shown example examples fig figure table chapter unit section lecture
  slide slides page pages notes note topic topics syllabus question questions marks answer answers`
    .split(/\s+/)
    .filter(Boolean),
);

export function normalise(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lowercase, punctuation-free form used for phrase containment checks. */
export function flatten(input: string): string {
  return normalise(input)
    .replace(/[^a-z0-9+#\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Very light suffix stripping — enough to align "networks" with "network". */
export function stem(word: string): string {
  if (word.length <= 4) return word;
  const suffixes = ['ations', 'ation', 'ments', 'ment', 'ings', 'ing', 'ies', 'ed', 'es', 's'];
  for (const suffix of suffixes) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 4) {
      const base = word.slice(0, -suffix.length);
      return suffix === 'ies' ? `${base}y` : base;
    }
  }
  return word;
}

export function tokenise(input: string): string[] {
  return flatten(input)
    .split(/[^a-z0-9+#]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
    .map(stem);
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Collapse PDF artefacts: soft hyphens, bullet glyphs, running headers, page numbers. */
export function cleanText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/\u00ad/g, '')
    .replace(/([a-z])-\n([a-z])/g, '$1$2') // hyphenated line break inside a word
    .replace(/^\s*page\s+\d+(\s+of\s+\d+)?\s*$/gim, '')
    .replace(/[\u2022\u25cf\u25aa\u00b7\u2043]/g, '-')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

// ---------------------------------------------------------------- topic index

interface Phrase {
  text: string;
  weight: number;
}

interface TopicVector {
  topic: Topic;
  namePhrases: Phrase[];
  subtopicPhrases: Phrase[];
  terms: Map<string, number>;
  unitTerms: Set<string>;
}

interface IndexedTopics {
  vectors: TopicVector[];
  idf: Map<string, number>;
}

const NUMBERED_HEADING = /^(\d+(\.\d+)*)[).]?\s+\S/;
const UPPER_HEADING = /^[A-Z0-9][A-Z0-9\s,&/()\-:']{3,}$/;

/**
 * How much a phrase says about a topic: multi-word names are specific, while a
 * one-word name that appears in many topics (“Applications”, “Challenges”)
 * must not dominate the score.
 */
function phraseSpecificity(phrase: string, df: Map<string, number>): number {
  const content = phrase.split(' ').filter((w) => w && !STOPWORDS.has(w));
  if (content.length >= 3) return 1.3;
  if (content.length === 2) return 1.1;
  if (content.length === 0) return 0.2;
  const count = df.get(stem(content[0])) ?? 1;
  if (count <= 2) return 1;
  if (count <= 4) return 0.6;
  return 0.3;
}

/**
 * “Infrastructure as a Service (IaaS)” should match the full phrase, the
 * version without the parenthetical, and the acronym on its own.
 */
function phraseVariants(text: string): { text: string; factor: number }[] {
  const variants: { text: string; factor: number }[] = [{ text: flatten(text), factor: 1 }];
  const withoutParens = flatten(text.replace(/\([^)]*\)/g, ' '));
  if (withoutParens && withoutParens !== variants[0].text) variants.push({ text: withoutParens, factor: 1 });
  for (const group of text.match(/\([^)]*\)/g) ?? []) {
    const inner = flatten(group.slice(1, -1));
    if (inner && inner !== variants[0].text && !variants.some((v) => v.text === inner)) {
      variants.push({ text: inner, factor: 0.75 });
    }
  }
  return variants;
}

function buildIndex(): IndexedTopics {
  // first pass: how many topics each term appears in (document frequency)
  const df = new Map<string, number>();
  for (const topic of ALL_TOPICS) {
    const seen = new Set(tokenise(`${topic.name} ${topic.subtopics.join(' ')}`));
    for (const token of seen) df.set(token, (df.get(token) ?? 0) + 1);
  }

  const vectors: TopicVector[] = [];
  for (const topic of ALL_TOPICS) {
    const unit = unitOf(topic.unitId);
    const terms = new Map<string, number>();
    const add = (text: string, weight: number) => {
      for (const token of tokenise(text)) {
        terms.set(token, Math.max(terms.get(token) ?? 0, weight));
      }
    };
    add(topic.name, 3);
    topic.subtopics.forEach((s) => add(s, 1.6));

    const namePhrases: Phrase[] = phraseVariants(topic.name).map((variant) => ({
      text: variant.text,
      weight: 16 * variant.factor * phraseSpecificity(variant.text, df),
    }));

    const seenSubtopic = new Set<string>();
    const subtopicPhrases: Phrase[] = [];
    for (const subtopic of topic.subtopics) {
      for (const variant of phraseVariants(subtopic)) {
        if (variant.text.length <= 4 || seenSubtopic.has(variant.text)) continue;
        seenSubtopic.add(variant.text);
        subtopicPhrases.push({
          text: variant.text,
          weight: 8 * variant.factor * phraseSpecificity(variant.text, df),
        });
      }
    }

    vectors.push({
      topic,
      namePhrases,
      subtopicPhrases,
      terms,
      unitTerms: new Set(unit ? tokenise(unit.name) : []),
    });
  }

  const idf = new Map<string, number>();
  for (const [token, count] of df) idf.set(token, Math.log(1 + vectors.length / count));
  return { vectors, idf };
}

/** Whole-phrase containment on padded text — “nag” must not match “manages”. */
function containsPhrase(padded: string, phrase: string): boolean {
  return phrase.length > 0 && padded.includes(` ${phrase} `);
}

let cachedIndex: IndexedTopics | null = null;
function index(): IndexedTopics {
  if (!cachedIndex) cachedIndex = buildIndex();
  return cachedIndex;
}

// ---------------------------------------------------------------- matching

export interface TopicMatch {
  topicId: string;
  score: number;
  /** 0–100, adjusted for how far ahead of the runner-up this topic is. */
  confidence: number;
  signals: string[];
}

export interface MatchOptions {
  /** restrict/boost a subject; `null`/omitted means no subject prior */
  subjectId?: SubjectId | null;
  /** heading text is weighted more heavily than body text */
  heading?: string;
  limit?: number;
}

/**
 * Score free text against every syllabus topic.
 * Returns the strongest matches, strongest first.
 */
export function matchText(text: string, options: MatchOptions = {}): TopicMatch[] {
  const { vectors, idf } = index();
  const body = ` ${flatten(text)} `;
  if (!body.trim()) return [];
  const heading = options.heading ? ` ${flatten(options.heading)} ` : ' ';
  const bodyTokens = new Set(tokenise(text));
  const headingTokens = new Set(options.heading ? tokenise(options.heading) : []);
  const limit = options.limit ?? MAX_MATCHES;

  const scored: { topicId: string; score: number; signals: string[] }[] = [];

  for (const vector of vectors) {
    let score = 0;
    const signals: string[] = [];

    for (const phrase of vector.namePhrases) {
      if (!containsPhrase(body, phrase.text)) continue;
      const boost = containsPhrase(heading, phrase.text) ? 1.6 : 1;
      score += phrase.weight * boost;
      signals.push(`title "${vector.topic.name}"`);
      break;
    }
    for (const phrase of vector.subtopicPhrases) {
      if (containsPhrase(body, phrase.text)) {
        score += containsPhrase(heading, phrase.text) ? phrase.weight * 1.75 : phrase.weight;
        if (signals.length < 3) signals.push(`subtopic "${phrase.text}"`);
      }
    }

    let matchedTerms = 0;
    const termHits: { term: string; weight: number }[] = [];
    for (const [term, weight] of vector.terms) {
      if (bodyTokens.has(term) || headingTokens.has(term)) {
        matchedTerms += 1;
        const idfWeight = idf.get(term) ?? 1;
        const inHeading = headingTokens.has(term) ? 1.3 : 1;
        const contribution = Math.min(weight, 3) * idfWeight * 0.55 * inHeading;
        score += contribution;
        termHits.push({ term, weight: contribution });
      }
    }
    if (vector.terms.size > 0) {
      const coverage = matchedTerms / vector.terms.size;
      score += 9 * coverage * coverage;
    }
    let unitHits = 0;
    for (const term of vector.unitTerms) if (bodyTokens.has(term)) unitHits += 1;
    if (vector.unitTerms.size > 0) score += 2.5 * (unitHits / vector.unitTerms.size);

    if (signals.length < 3) {
      termHits
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 2)
        .forEach((hit) => signals.push(hit.term));
    }

    if (options.subjectId) {
      score *= vector.topic.subjectId === options.subjectId ? 1.45 : 0.5;
    }

    if (score >= MATCH_SCORE_FLOOR) scored.push({ topicId: vector.topic.id, score, signals });
  }

  scored.sort((a, b) => b.score - a.score || a.topicId.localeCompare(b.topicId));
  const top = scored.slice(0, limit);
  const best = top[0]?.score ?? 0;

  return top.map((entry, i) => {
    const base = 100 * (1 - Math.exp(-entry.score / 18));
    const runnerUp = i === 0 ? top[1]?.score ?? 0 : best;
    const margin = best > 0 ? Math.max(0, (best - runnerUp) / best) : 0;
    const confidence = Math.round(Math.max(5, Math.min(99, base * (0.55 + 0.45 * margin))));
    return { topicId: entry.topicId, score: Math.round(entry.score * 10) / 10, confidence, signals: entry.signals.slice(0, 4) };
  });
}

/** Best-guess subject for a whole document, with the per-subject evidence. */
export function detectSubject(text: string): { subjectId: SubjectId | null; scores: { subjectId: SubjectId; score: number }[] } {
  const totals = new Map<SubjectId, number>();
  for (const subject of SUBJECTS) totals.set(subject.id, 0);

  for (const section of splitSections(text)) {
    const matches = matchText(`${section.heading}\n${section.body}`, { limit: 6 });
    for (const match of matches) {
      const topic = TOPIC_MAP[match.topicId];
      if (!topic) continue;
      totals.set(topic.subjectId, (totals.get(topic.subjectId) ?? 0) + match.score);
    }
  }

  const scores = [...totals.entries()]
    .map(([subjectId, score]) => ({ subjectId, score: Math.round(score * 10) / 10 }))
    .sort((a, b) => b.score - a.score);
  const [first, second] = scores;
  const confident = first !== undefined && first.score >= 8 && first.score >= (second?.score ?? 0) * 1.25;
  return { subjectId: confident ? first.subjectId : null, scores };
}

// ---------------------------------------------------------------- sectioning

export interface RawSection {
  heading: string;
  body: string;
}

function isHeading(line: string, next: string | undefined): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^#{1,6}\s+/.test(trimmed)) return true;
  if (trimmed.length > 110) return false;
  if (NUMBERED_HEADING.test(trimmed) && trimmed.length < 90) return true;
  if (UPPER_HEADING.test(trimmed) && trimmed.split(' ').length <= 12) return true;
  if (trimmed.endsWith(':') && trimmed.length < 70 && !!next && next.trim().length > 0) return true;
  return false;
}

function stripHeadingMarkup(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^(\d+(\.\d+)*)[).]?\s+/, '')
    .replace(/[:.]$/, '')
    .trim();
}

function chunkBody(body: string): string[] {
  if (body.length <= MAX_SECTION_CHARS) return [body];
  const sentences = body.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + ' ' + sentence).trim().length > MAX_SECTION_CHARS && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = `${current} ${sentence}`;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 0);
}

export function splitSections(raw: string): RawSection[] {
  const text = cleanText(raw);
  if (!text) return [];

  const lines = text.split('\n');

  // a short, unpunctuated first line followed by a blank line is the document
  // title, not study material — it should not become a block of its own
  const firstLine = lines.findIndex((line) => line.trim().length > 0);
  if (firstLine >= 0) {
    const candidate = lines[firstLine].trim();
    const endsBlock = firstLine + 1 >= lines.length || lines[firstLine + 1].trim() === '';
    if (candidate.length <= 90 && !/[.!?]$/.test(candidate) && endsBlock && !/^#{1,6}\s/.test(candidate)) {
      lines[firstLine] = '';
    }
  }

  const sections: RawSection[] = [];
  let heading = '';
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join('\n').replace(/\n{2,}/g, '\n\n').trim();
    // a heading with no text under it is not study material — drop it
    if (body) {
      const title = heading || firstSentence(body).slice(0, 70);
      for (const [i, chunk] of chunkBody(body).entries()) {
        sections.push({ heading: i === 0 ? title : `${title} (${i + 1})`, body: chunk });
      }
    }
    heading = '';
    buffer = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (isHeading(line, lines[i + 1])) {
      flush();
      heading = stripHeadingMarkup(line);
      continue;
    }
    if (!line.trim()) {
      buffer.push('');
      continue;
    }
    buffer.push(line.trim());
  }
  flush();

  return sections.filter((s) => s.body.trim().length >= 15 || s.heading.trim().length > 0);
}

function firstSentence(text: string): string {
  const match = text.match(/[^.!?\n]{1,200}[.!?]/);
  return (match?.[0] ?? text.split('\n')[0] ?? '').trim();
}

// ---------------------------------------------------------------- classification

export function classifySection(text: string): MaterialSectionKind {
  const value = text.toLowerCase();
  const numberedLines = text.split('\n').filter((l) => /^\s*(\d+[).]|step\s+\d+)[\s:]/i.test(l)).length;

  if (/[=≈∑√∫±≤≥]/.test(text) || /\b(formula|equation|derivation of)\b/.test(value)) return 'formula';
  if (/\b(algorithm|pseudo-?code|procedure|steps? to|process flow|how to)\b/.test(value) || numberedLines >= 3) {
    return 'procedure';
  }
  if (/\b(for example|e\.g\.|worked example|illustration|for instance|numerical)\b/.test(value)) return 'example';
  if (/\b(versus|vs\.?|difference between|comparison|compare|pros and cons|advantages and disadvantages)\b/.test(value)) {
    return 'comparison';
  }
  if (/\b(is defined as|refers to|definition|is a type of|is an? \w+ that|means that|stands for)\b/.test(value)) {
    return 'definition';
  }
  return 'notes';
}

// ---------------------------------------------------------------- summarising

export function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Extractive summary: 2–3 sentences with the strongest term density. */
export function summariseSentences(text: string, keyTerms: string[] = [], maxSentences = 3): string {
  const sentences = splitSentences(text).filter((s) => wordCount(s) >= 4);
  if (sentences.length === 0) return text.replace(/\s+/g, ' ').slice(0, 200);
  if (sentences.length <= 2) return sentences.join(' ');

  const terms = new Set(keyTerms.map((t) => stem(normalise(t))));
  const scored = sentences.map((sentence, index) => {
    const tokens = new Set(tokenise(sentence));
    let hits = 0;
    for (const term of terms) if (tokens.has(term)) hits += 1;
    const position = index <= 1 ? 1.2 : index === 2 ? 0.5 : 0;
    const density = hits * 2 + position;
    const lengthScore = wordCount(sentence) >= 8 && wordCount(sentence) <= 45 ? 0.8 : 0;
    return { sentence, index, score: density + lengthScore };
  });

  const chosen = scored
    .slice()
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(1, Math.min(maxSentences, sentences.length)))
    .sort((a, b) => a.index - b.index)
    .map((s) => s.sentence)
    .join(' ');

  return chosen.length > 340 ? `${chosen.slice(0, 337).replace(/\s+\S*$/, '')}…` : chosen;
}

export function extractKeyTerms(text: string, topicId?: string | null, max = 8): string[] {
  const topicTerms = new Set<string>();
  const topic = topicId ? TOPIC_MAP[topicId] : undefined;
  if (topic) {
    for (const token of tokenise(`${topic.name} ${topic.subtopics.join(' ')}`)) topicTerms.add(token);
  }

  const counts = new Map<string, { count: number; display: string; score: number }>();
  const words = text.match(/[A-Za-z][A-Za-z0-9+#-]{2,}/g) ?? [];
  for (const word of words) {
    const key = stem(normalise(word));
    if (STOPWORDS.has(normalise(word)) || /^\d+$/.test(key)) continue;
    const isAcronym = /^[A-Z]{2,}$/.test(word);
    const entry = counts.get(key);
    if (entry) {
      entry.count += 1;
      if (isAcronym && entry.display !== word) entry.display = word;
      entry.score += 1;
    } else {
      counts.set(key, { count: 1, display: word, score: 1 });
    }
  }

  return [...counts.entries()]
    .map(([key, entry]) => ({
      display: entry.display,
      score:
        entry.count *
        (topicTerms.has(key) ? 2.6 : 1) *
        (/[A-Z]/.test(entry.display) ? 1.25 : 1) *
        (entry.display.length >= 5 ? 1.1 : 0.9),
    }))
    .filter((entry) => entry.display.length >= 3)
    .sort((a, b) => b.score - a.score || a.display.localeCompare(b.display))
    .slice(0, max)
    .map((entry) => entry.display.replace(/[.,;:]$/, ""));
}

// ---------------------------------------------------------------- de-duplication

export function fingerprint(text: string): string {
  return [...new Set(tokenise(text))].sort().join(' ').slice(0, 400);
}

/** Jaccard similarity between two texts over stemmed token sets. */
export function similarity(a: string, b: string): number {
  const setA = new Set(tokenise(a));
  const setB = new Set(tokenise(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared += 1;
  return shared / (setA.size + setB.size - shared);
}

export function findDuplicate(
  body: string,
  existing: MaterialAttachment[],
): MaterialAttachment | undefined {
  const print = fingerprint(body);
  return existing.find((item) => fingerprint(item.body) === print || similarity(item.body, body) >= DUPLICATE_SIMILARITY);
}

// ---------------------------------------------------------------- analysis

export interface SectionDraft {
  id: string;
  heading: string;
  body: string;
  kind: MaterialSectionKind;
  words: number;
  matches: TopicMatch[];
  /** chosen topic for this block, or null when it is still unmatched */
  topicId: string | null;
  confidence: number;
  summary: string;
  keyTerms: string[];
  /** id of an existing/new attachment this block duplicates */
  duplicateOf?: string;
  /** pre-selected on the review screen */
  selected: boolean;
}

export interface IngestAnalysis {
  sourceName: string;
  /** the subject used for matching (picked or detected) */
  subjectId: SubjectId | null;
  requestedSubject: SubjectId | 'auto';
  subjectScores: { subjectId: SubjectId; score: number }[];
  sections: SectionDraft[];
  stats: {
    characters: number;
    words: number;
    sections: number;
    matched: number;
    unmatched: number;
    duplicates: number;
    topics: number;
    automatic: number;
    review: number;
    averageConfidence: number;
  };
  warnings: string[];
}

export interface AnalyseOptions {
  subjectId?: SubjectId | 'auto';
  sourceName?: string;
  existing?: MaterialAttachment[];
  now?: number;
}

let draftSeq = 0;

export function analyseMaterial(rawText: string, options: AnalyseOptions = {}): IngestAnalysis {
  const text = cleanText(rawText);
  const sourceName = options.sourceName?.trim() || 'Pasted material';
  const requestedSubject = options.subjectId ?? 'auto';
  const existing = options.existing ?? [];

  const detection = requestedSubject === 'auto' ? detectSubject(text) : { subjectId: requestedSubject, scores: [] };
  const subjectId = detection.subjectId;
  const rawSections = splitSections(text);

  const sections: SectionDraft[] = [];
  const seen: MaterialAttachment[] = [];

  for (const section of rawSections) {
    const body = section.body.trim();
    if (body.length < 20 && !section.heading) continue;
    const matches = matchText(`${section.heading}\n${body}`, { subjectId, heading: section.heading });
    const top = matches[0];
    const topicId = top && top.confidence >= LOW_CONFIDENCE ? top.topicId : null;
    const keyTerms = extractKeyTerms(body, topicId);
    draftSeq += 1;

    const draft: SectionDraft = {
      id: `draft-${Date.now().toString(36)}-${draftSeq}`,
      heading: section.heading || firstSentence(body).slice(0, 70),
      body,
      kind: classifySection(`${section.heading}\n${body}`),
      words: wordCount(body),
      matches,
      topicId,
      confidence: top?.confidence ?? 0,
      summary: summariseSentences(body, keyTerms),
      keyTerms,
      selected: false,
    };

    const duplicate =
      findDuplicate(body, existing) ??
      seen.find((item) => fingerprint(item.body) === fingerprint(body) || similarity(item.body, body) >= DUPLICATE_SIMILARITY);
    if (duplicate) {
      draft.duplicateOf = duplicate.id;
      draft.selected = false;
    } else {
      draft.selected = draft.topicId !== null;
      seen.push({
        id: draft.id,
        sourceId: 'pending',
        sourceName,
        subjectId: topicId ? TOPIC_MAP[topicId].subjectId : subjectId ?? 'dl',
        unitId: topicId ? TOPIC_MAP[topicId].unitId : '',
        topicId: topicId ?? '',
        title: draft.heading,
        kind: draft.kind,
        body,
        summary: draft.summary,
        keyTerms,
        confidence: draft.confidence,
        signals: top?.signals ?? [],
        addedAt: options.now ?? Date.now(),
        words: draft.words,
      });
    }
    sections.push(draft);
  }

  const matched = sections.filter((s) => s.topicId && !s.duplicateOf);
  const unmatched = sections.filter((s) => !s.topicId && !s.duplicateOf);
  const duplicates = sections.filter((s) => s.duplicateOf);
  const automatic = matched.filter((s) => s.confidence >= AUTO_ACCEPT_CONFIDENCE);
  const topics = new Set(matched.map((s) => s.topicId as string));
  const confidences = matched.map((s) => s.confidence);
  const averageConfidence = confidences.length
    ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
    : 0;

  const warnings: string[] = [];
  if (sections.length === 0) {
    warnings.push('No readable text was found. Scanned PDFs need OCR before they can be analysed.');
  }
  if (requestedSubject === 'auto' && !subjectId) {
    warnings.push('The subject could not be detected with confidence — choose one manually and re-run the analysis.');
  }
  if (unmatched.length > 0) {
    warnings.push(
      `${unmatched.length} block${unmatched.length === 1 ? '' : 's'} could not be linked to a syllabus topic — assign ${unmatched.length === 1 ? 'it' : 'them'} manually or leave ${unmatched.length === 1 ? 'it' : 'them'} out.`,
    );
  }
  if (duplicates.length > 0) {
    warnings.push(`${duplicates.length} block${duplicates.length === 1 ? ' is' : 's are'} already in your study material and will be skipped.`);
  }
  if (sections.length > 0 && averageConfidence > 0 && averageConfidence < AUTO_ACCEPT_CONFIDENCE) {
    warnings.push('Average confidence is low — review the topic assignments before adding.');
  }
  if (sections.length > 0 && sections.every((s) => s.words < 12)) {
    warnings.push('The document is very short; you may get better results from a fuller set of notes.');
  }

  return {
    sourceName,
    subjectId,
    requestedSubject,
    subjectScores: detection.scores,
    sections,
    stats: {
      characters: text.length,
      words: wordCount(text),
      sections: sections.length,
      matched: matched.length,
      unmatched: unmatched.length,
      duplicates: duplicates.length,
      topics: topics.size,
      automatic: automatic.length,
      review: matched.length - automatic.length,
      averageConfidence,
    },
    warnings,
  };
}

// ---------------------------------------------------------------- commit

export interface CommitOptions {
  sourceName: string;
  mime?: string;
  bytes?: number;
  now?: number;
}

export interface CommitResult {
  state: AppState;
  added: MaterialAttachment[];
  skipped: number;
  source: MaterialSource | null;
}

/**
 * Write the reviewed drafts into AppState, re-checking duplicates against the
 * material that is already stored (so two tabs cannot double-import).
 */
export function addMaterial(
  state: AppState,
  analysis: IngestAnalysis,
  drafts: SectionDraft[],
  options: CommitOptions,
): CommitResult {
  const now = options.now ?? Date.now();
  const sourceId = `src-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const selected = drafts.filter((d) => d.selected && d.topicId && !d.duplicateOf);

  const added: MaterialAttachment[] = [];
  let skipped = 0;

  for (const draft of selected) {
    const topic = TOPIC_MAP[draft.topicId as string];
    if (!topic) {
      skipped += 1;
      continue;
    }
    if (findDuplicate(draft.body, [...state.materials, ...added])) {
      skipped += 1;
      continue;
    }
    added.push({
      id: `mat-${now.toString(36)}-${added.length}-${Math.random().toString(36).slice(2, 6)}`,
      sourceId,
      sourceName: options.sourceName,
      subjectId: topic.subjectId,
      unitId: topic.unitId,
      topicId: topic.id,
      title: draft.heading || topic.name,
      kind: draft.kind,
      body: draft.body,
      summary: draft.summary,
      keyTerms: draft.keyTerms,
      confidence: draft.confidence,
      signals: draft.matches.find((m) => m.topicId === draft.topicId)?.signals ?? [],
      addedAt: now,
      words: draft.words,
    });
  }

  if (added.length === 0) {
    return { state, added, skipped: skipped + (drafts.length - selected.length), source: null };
  }

  const source: MaterialSource = {
    id: sourceId,
    name: options.sourceName,
    mime: options.mime ?? 'text/plain',
    bytes: options.bytes ?? analysis.stats.characters,
    addedAt: now,
    subjectId: analysis.requestedSubject,
    sections: analysis.stats.sections,
    attached: added.length,
    words: added.reduce((sum, item) => sum + item.words, 0),
  };

  return {
    state: {
      ...state,
      materials: [...state.materials, ...added],
      materialSources: [...state.materialSources, source],
    },
    added,
    skipped: skipped + (drafts.length - selected.length),
    source,
  };
}

export function removeMaterialSource(state: AppState, sourceId: string): AppState {
  return {
    ...state,
    materials: state.materials.filter((m) => m.sourceId !== sourceId),
    materialSources: state.materialSources.filter((s) => s.id !== sourceId),
  };
}

export function removeMaterial(state: AppState, id: string): AppState {
  const material = state.materials.find((m) => m.id === id);
  const materials = state.materials.filter((m) => m.id !== id);
  const sources =
    material && !materials.some((m) => m.sourceId === material.sourceId)
      ? state.materialSources.filter((s) => s.id !== material.sourceId)
      : state.materialSources;
  return { ...state, materials, materialSources: sources };
}

export function materialsForTopic(state: AppState, topicId: string): MaterialAttachment[] {
  return state.materials
    .filter((m) => m.topicId === topicId)
    .sort((a, b) => b.addedAt - a.addedAt);
}

export interface MaterialSummary {
  sources: number;
  attachments: number;
  topics: number;
  subjects: number;
  words: number;
  kinds: Record<MaterialSectionKind, number>;
}

export function materialSummary(state: AppState): MaterialSummary {
  const kinds: Record<MaterialSectionKind, number> = {
    definition: 0,
    formula: 0,
    example: 0,
    procedure: 0,
    comparison: 0,
    notes: 0,
  };
  let words = 0;
  const topics = new Set<string>();
  const subjects = new Set<SubjectId>();
  for (const item of state.materials) {
    kinds[item.kind] += 1;
    words += item.words;
    topics.add(item.topicId);
    subjects.add(item.subjectId);
  }
  return {
    sources: state.materialSources.length,
    attachments: state.materials.length,
    topics: topics.size,
    subjects: subjects.size,
    words,
    kinds,
  };
}

/** Search across imported material; used by the library and the Learn page. */
export function searchMaterials(state: AppState, query: string, limit = 40): MaterialAttachment[] {
  const q = normalise(query);
  if (q.length < 2) return state.materials.slice(0, limit);
  const terms = tokenise(query);
  return state.materials
    .map((item) => {
      const haystack = normalise(`${item.title} ${item.summary} ${item.keyTerms.join(' ')} ${item.body}`);
      let score = 0;
      if (normalise(item.title).includes(q)) score += 6;
      if (normalise(item.sourceName).includes(q)) score += 2;
      for (const term of terms) if (haystack.includes(term)) score += 1;
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.item.addedAt - a.item.addedAt)
    .slice(0, limit)
    .map((entry) => entry.item);
}
