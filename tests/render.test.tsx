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
import { Bank } from '../src/pages/Bank';
import { Lab } from '../src/pages/Lab';
import { Practice } from '../src/pages/Practice';
import { Mocks } from '../src/pages/Mocks';
import { Revision } from '../src/pages/Revision';
import { Analytics } from '../src/pages/Analytics';
import { SettingsPage } from '../src/pages/Settings';

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
  ['Subjects', <Subjects />, '/subjects'],
  ['Syllabus Tracker', <Tracker />, '/tracker'],
  ['Study Planner', <Planner />, '/planner'],
  ['Learn', <Learn />, '/learn'],
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
      expect(html).not.toMatch(/undefined|NaN/);
    });
  }

  it('renders a known subject topic in the Learn page', () => {
    const html = render(<Learn />, '/learn?topic=dl-u2-t5');
    expect(html).toContain('Backpropagation');
    expect(html).toContain('Zero level');
    expect(html).toContain('What it is');
    expect(html).toContain('The problem it solves');
  });

  it('renders the audit table row count for the tracker', () => {
    const html = render(<Tracker />, '/tracker');
    expect(html).toContain('Syllabus Tracker');
    expect(html).toContain('172');
  });
});
