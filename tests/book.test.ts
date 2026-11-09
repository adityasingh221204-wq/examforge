// EXAMFORGE — study book assembly and file export.

import { describe, expect, it } from 'vitest';
import { bookFor, sectionNumber } from '../src/engine/book';
import { bookFileHtml } from '../src/engine/bookFile';

describe('study book', () => {
  it('turns every syllabus unit into a chapter, in syllabus order', () => {
    const book = bookFor('nlp');
    expect(book.chapters.length).toBe(5);
    expect(book.topics).toBe(48);
    expect(book.chapters.map((c) => c.index)).toEqual([1, 2, 3, 4, 5]);
    expect(book.words).toBeGreaterThan(1000);
    expect(book.minutes).toBeGreaterThan(1);
  });

  it('can narrow the book to a single unit', () => {
    const book = bookFor('dl', 'dl-u2');
    expect(book.chapters.length).toBe(1);
    expect(book.chapters[0].unit.id).toBe('dl-u2');
    expect(book.topics).toBe(book.chapters[0].entries.length);
  });

  it('numbers sections and exports one self-contained file', () => {
    expect(sectionNumber(3, 0)).toBe('3.1');
    const html = bookFileHtml({
      title: 'TEE7101 — <NLP>',
      kicker: 'EXAMFORGE study book',
      subtitle: '48 topics',
      bodyHtml: '<article>Body</article>',
    });
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('TEE7101 — &lt;NLP&gt;');
    expect(html).toContain('<article>Body</article>');
    expect(html).not.toContain('<script');
    expect(html).toContain('@media print');
  });
});
