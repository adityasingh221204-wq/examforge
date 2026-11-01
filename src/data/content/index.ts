// EXAMFORGE — teaching content registry.
// Aggregates the five-level content authored per topic and validates coverage against the syllabus.

import type { TopicContent } from '../types';
import { ALL_TOPICS } from '../syllabus';
import { DL_CONTENT } from './dl';
import { CN_CONTENT } from './cn';
import { NLP_CONTENT } from './nlp';
import { CLOUD_CONTENT } from './cloud';

const ALL_CONTENT: TopicContent[] = [...DL_CONTENT, ...CN_CONTENT, ...NLP_CONTENT, ...CLOUD_CONTENT];

export const CONTENT: Record<string, TopicContent> = Object.fromEntries(
  ALL_CONTENT.map((t) => [t.topicId, t]),
);

export function contentFor(topicId: string): TopicContent | undefined {
  return CONTENT[topicId];
}

/** Topic ids present in the syllabus but missing authored teaching content. */
export const MISSING_CONTENT: string[] = ALL_TOPICS.filter((t) => !CONTENT[t.id]).map((t) => t.id);

/** Content entries whose topic id does not exist in the official syllabus. */
export const ORPHAN_CONTENT: string[] = ALL_CONTENT.filter(
  (t) => !ALL_TOPICS.some((s) => s.id === t.topicId),
).map((t) => t.topicId);

export const CONTENT_STATS = {
  authored: ALL_CONTENT.length,
  syllabusTopics: ALL_TOPICS.length,
  missing: MISSING_CONTENT.length,
  orphan: ORPHAN_CONTENT.length,
};
