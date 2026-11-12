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
import { activatePlan, redistributeMissed } from '../engine/plan';
import { PLAN_ID, PLAN_REVISION } from '../data/plan';
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
  activateExamPlan: () => void;
  redistribute: () => { moved: number; unplaced: number };
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seeded = useRef(false);

  // first run: the November examination plan is the active timetable.
  // Progress, materials and completed sessions are preserved — only the future schedule changes.
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    setState((cur) => {
      if (cur.plan?.id !== PLAN_ID || cur.plan?.version !== PLAN_REVISION) return activatePlan({ ...cur, seeded: true });
      if (cur.timetable && cur.timetable.sessions.length > 0) return { ...cur, seeded: true };
      return activatePlan({ ...cur, seeded: true });
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
    setState(activatePlan({ ...fresh, seeded: true }));
    notify('All progress cleared. The November plan is rebuilt from scratch.');
  }, [notify]);

  const exportJson = useCallback(() => {
    downloadFile(`examforge-progress-${todayKey()}.json`, exportStateJson(state));
    notify('Progress report exported as JSON.');
  }, [state, notify]);

  const regenerate = useCallback(() => {
    setState((cur) => {
      if (cur.plan?.id === PLAN_ID) return activatePlan(cur);
      const mode = cur.timetable?.mode ?? 'sprint';
      return applySchedule(cur, mode, todayKey());
    });
    notify('Timetable rebuilt from the active plan and current coverage.');
  }, [notify]);

  const rebalance = useCallback(() => {
    let report = { moved: 0, unplaced: 0 };
    setState((cur) => {
      if (cur.plan?.id === PLAN_ID) {
        const out = redistributeMissed(cur);
        report = { moved: out.moved.length, unplaced: out.unplaced.length };
        return out.state;
      }
      return reorganize(cur);
    });
    queueMicrotask(() => {
      if (report.moved + report.unplaced > 0) {
        notify(
          `Redistributed ${report.moved} topic${report.moved === 1 ? '' : 's'}${
            report.unplaced > 0 ? ` · ${report.unplaced} could not fit` : ''
          }. Nothing marked complete.`,
        );
      } else {
        notify('Nothing to redistribute — no unfinished sessions behind you.');
      }
    });
  }, [notify]);

  const activateExamPlan = useCallback(() => {
    setState((cur) => activatePlan(cur));
    notify('November examination plan activated. Progress and materials kept.');
  }, [notify]);

  const redistribute = useCallback(() => {
    const out = redistributeMissed(state);
    setState(out.state);
    notify(
      out.moved.length + out.unplaced.length === 0
        ? 'Nothing to redistribute.'
        : `Moved ${out.moved.length} topic(s) forward${out.unplaced.length ? ` · ${out.unplaced.length} unplaced` : ''}.`,
    );
    return { moved: out.moved.length, unplaced: out.unplaced.length };
  }, [state, set, notify]);

  const api = useMemo<StoreApi>(
    () => ({ state, set, replace, notify, resetAll, exportJson, regenerate, rebalance, activateExamPlan, redistribute }),
    [state, set, replace, notify, resetAll, exportJson, regenerate, rebalance, activateExamPlan, redistribute],
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
