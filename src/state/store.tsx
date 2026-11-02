// EXAMFORGE — application state store.
// Single localStorage-backed AppState, exposed through React context with typed helpers.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AppState } from '../data/types';
import { defaultState, loadState, saveState, clearState, downloadFile, exportStateJson } from '../engine/storage';
import { applySchedule, reorganize } from '../engine/scheduler';
import { todayKey } from '../engine/dates';

interface StoreApi {
  state: AppState;
  /** functional update; persisted automatically */
  set: (updater: (s: AppState) => AppState) => void;
  replace: (next: AppState) => void;
  notify: (message: string) => void;
  resetAll: () => void;
  exportJson: () => void;
  regenerate: () => void;
  rebalance: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seeded = useRef(false);

  // first run: build the sprint timetable so the planner is never empty
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    setState((cur) => {
      if (cur.timetable && cur.timetable.sessions.length > 0) return { ...cur, seeded: true };
      return applySchedule({ ...cur, seeded: true }, 'sprint', todayKey());
    });
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const set = useCallback((updater: (s: AppState) => AppState) => {
    setState((cur) => updater(cur));
  }, []);

  const replace = useCallback((next: AppState) => setState(next), []);

  const resetAll = useCallback(() => {
    clearState();
    const fresh = defaultState();
    setState(applySchedule({ ...fresh, seeded: true }, 'sprint', todayKey()));
    notify('All progress cleared. Timetable regenerated.');
  }, [notify]);

  const exportJson = useCallback(() => {
    downloadFile(`examforge-progress-${todayKey()}.json`, exportStateJson(state));
    notify('Progress report exported as JSON.');
  }, [state, notify]);

  const regenerate = useCallback(() => {
    setState((cur) => {
      const mode = cur.timetable?.mode ?? 'sprint';
      return applySchedule(cur, mode, todayKey());
    });
    notify('Timetable regenerated from current coverage.');
  }, [notify]);

  const rebalance = useCallback(() => {
    setState((cur) => reorganize(cur));
    notify('Missed sessions rescheduled. Sleep time untouched.');
  }, [notify]);

  const api = useMemo<StoreApi>(
    () => ({ state, set, replace, notify, resetAll, exportJson, regenerate, rebalance }),
    [state, set, replace, notify, resetAll, exportJson, regenerate, rebalance],
  );

  return (
    <StoreContext.Provider value={api}>
      {children}
      {toast && <div className="toast">{toast}</div>}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
