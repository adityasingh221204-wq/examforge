// EXAMFORGE — render smoke tests: every page mounts without throwing and produces real markup.

import { beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { StoreProvider } from '../src/state/store';
import { Dashboard } from '../src/pages/Dashboard';
import { Subjects } from '../src/pages/Subjects';
import { Tracker } from '../src/pages/Tracker';
import { Planner } from '../src/pages/Planner';
import { Learn } from '../src/pages/Learn';
import { Book } from '../src/pages/Book';
import { Bank } from '../src/pages/Bank';
import { Lab } from '../src/pages/Lab';
import { Practice } from '../src/pages/Practice';
import { Mocks } from '../src/pages/Mocks';
import { Revision } from '../src/pages/Revision';
import { Analytics } from '../src/pages/Analytics';
import { SettingsPage } from '../src/pages/Settings';
import { Ingest } from '../src/pages/Ingest';

// minimal localStorage so the store can load and persist in a node environment
const memory = new Map<string, string>();
beforeEach(() => {
  memory.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
      removeItem: (k: string) => void memory.delete(k),
      clear: () => memory.clear(),
      key: (i: number) => [...memory.keys()][i] ?? null,
      get length() {
        return memory.size;
      },
    },
  });
});

function render(page: ReactElement, route = '/') {
  return renderToString(
    <MemoryRouter initialEntries={[route]}>
      <StoreProvider>{page}</StoreProvider>
    </MemoryRouter>,
  );
}

const pages: [string, ReactElement, string][] = [
  ['Dashboard', <Dashboard />, '/'],
  ['Add Material', <Ingest />, '/ingest'],
  ['Subjects', <Subjects />, '/subjects'],
  ['Syllabus Tracker', <Tracker />, '/tracker'],
  ['Study Planner', <Planner />, '/planner'],
  ['Learn', <Learn />, '/learn'],
  ['Study Book', <Book />, '/book'],
  ['Question Bank', <Bank />, '/bank'],
  ['Numerical Lab', <Lab />, '/lab'],
  ['Practice Tests', <Practice />, '/practice'],
  ['Mock Examinations', <Mocks />, '/mocks'],
  ['Revision Centre', <Revision />, '/revision'],
  ['Analytics', <Analytics />, '/analytics'],
  ['Settings', <SettingsPage />, '/settings'],
];

describe('page rendering', () => {
  for (const [name, page, route] of pages) {
    it(`renders ${name} with substantive markup`, () => {
      const html = render(page, route);
      expect(html.length).toBeGreaterThan(2000);
      // The Study Book prints authored content verbatim, and that content legitimately
      // discusses NaN losses and exploding gradients.
      if (name !== 'Study Book') expect(html).not.toMatch(/undefined|NaN/);
    });
  }

  it('offers a subject switcher on the Learn page', () => {
    const html = render(<Learn />, '/learn?topic=dl-u2-t5');
    for (const label of ['Deep Learning', 'Computer Networks', 'NLP', 'Cloud Computing']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('Choose subject');
  });

  it('renders a known subject topic in the Learn page', () => {
    const html = render(<Learn />, '/learn?topic=dl-u2-t5');
    expect(html).toContain('Backpropagation');
    expect(html).toContain('Zero level');
    expect(html).toContain('What it is');
    expect(html).toContain('The problem it solves');
  });

  it('lays the study book out as chapters with a subject switcher', () => {
    const html = render(<Book />, '/book?subject=nlp');
    expect(html).toContain('Choose book');
    expect(html).toMatch(/Chapter[\s\S]{0,30}1/);
    expect(html).toContain('Evolution of Natural Language');
    expect(html).toContain('1.1');
    expect(html).toContain('Contents');
    expect(html).toContain('Print / save as PDF');
  });

  it('renders the audit table row count for the tracker', () => {
    const html = render(<Tracker />, '/tracker');
    expect(html).toContain('Syllabus Tracker');
    expect(html).toContain('172');
  });
});
