// Persistent storage — localStorage-backed AppState with export/import.

import type { AppState, DayBlock, Settings } from '../data/types';

export const STORAGE_KEY = 'examforge.state.v1';
export const STATE_VERSION = 1;

export const DEFAULT_BLOCKS: DayBlock[] = [
  { id: 'b1', start: '08:30', end: '10:30', label: 'Study Block 1', kind: 'study' },
  { id: 'b2', start: '10:50', end: '12:50', label: 'Study Block 2', kind: 'study' },
  { id: 'b3', start: '14:00', end: '16:00', label: 'Study Block 3', kind: 'study' },
  { id: 'b4', start: '16:45', end: '18:45', label: 'Study Block 4', kind: 'study' },
  { id: 'b5', start: '20:00', end: '21:00', label: 'Optional light revision / personal time', kind: 'personal' },
];

export const DEFAULT_SETTINGS: Settings = {
  wake: '07:30',
  sleep: '22:30',
  blocks: DEFAULT_BLOCKS,
  dailyTargetMin: 480,
  travelStart: '2026-11-04',
  travelEnd: '2026-11-11',
  passPercent: 70,
};

export function defaultState(): AppState {
  return {
    version: STATE_VERSION,
    progress: {},
    sessions: [],
    timetable: null,
    attempts: [],
    mocks: [],
    revisions: [],
    studyLog: [],
    settings: { ...DEFAULT_SETTINGS },
    seeded: false,
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      version: STATE_VERSION,
    };
  } catch {
    return defaultState();
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveState(state: AppState, immediate = false): void {
  const write = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error('ExamForge: failed to persist state', err);
    }
  };
  if (saveTimer) clearTimeout(saveTimer);
  if (immediate) write();
  else saveTimer = setTimeout(write, 250);
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function exportStateJson(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function parseImportedState(raw: string): AppState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (!parsed || typeof parsed !== 'object' || !parsed.progress) return null;
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      version: STATE_VERSION,
    };
  } catch {
    return null;
  }
}

export function downloadFile(filename: string, content: string, mime = 'application/json'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
