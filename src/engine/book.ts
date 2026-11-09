// EXAMFORGE — Study Book assembly.
// Turns the official syllabus and the authored five-level content into one linear,
// printable, offline-readable book per subject: units become chapters, topics become
// sections, in syllabus order.

import { SUBJECTS } from '../data/syllabus';
import { CONTENT } from '../data/content';
import type { Subject, SubjectId, Topic, TopicContent, Unit } from '../data/types';

/** Reading speed used for the "time to read" estimate — slow on purpose, it is technical text. */
export const WORDS_PER_MINUTE = 160;

export interface BookEntry {
  topic: Topic;
  content?: TopicContent;
  words: number;
}

export interface BookChapter {
  unit: Unit;
  /** 1-based chapter number inside the book. */
  index: number;
  entries: BookEntry[];
  words: number;
  minutes: number;
}

export interface BookModel {
  subject: Subject;
  chapters: BookChapter[];
  topics: number;
  words: number;
  minutes: number;
}

function countWords(value: unknown): number {
  if (typeof value === 'string') return value.trim().split(/\s+/).filter(Boolean).length;
  if (Array.isArray(value)) return value.reduce<number>((n, v) => n + countWords(v), 0);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).reduce<number>((n, v) => n + countWords(v), 0);
  }
  return 0;
}

export function readMinutes(words: number): number {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** Build the book for one subject, optionally narrowed to a single unit. */
export function bookFor(subjectId: SubjectId, unitId?: string): BookModel {
  const subject = SUBJECTS.find((s) => s.id === subjectId) ?? SUBJECTS[0];
  const units = unitId ? subject.units.filter((u) => u.id === unitId) : subject.units;

  const chapters: BookChapter[] = units.map((unit, i) => {
    const entries: BookEntry[] = unit.topics.map((topic) => {
      const content = CONTENT[topic.id];
      return { topic, content, words: content ? countWords(content) : 0 };
    });
    const words = entries.reduce((n, e) => n + e.words, 0);
    return { unit, index: i + 1, entries, words, minutes: readMinutes(words) };
  });

  const words = chapters.reduce((n, c) => n + c.words, 0);
  return {
    subject,
    chapters,
    topics: chapters.reduce((n, c) => n + c.entries.length, 0),
    words,
    minutes: readMinutes(words),
  };
}

/** "3.7" — the section number a topic carries inside its book. */
export function sectionNumber(chapterIndex: number, topicIndex: number): string {
  return `${chapterIndex}.${topicIndex + 1}`;
}
