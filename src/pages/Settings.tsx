// EXAMFORGE — Settings: routine, targets, travel window, data portability.

import { useRef, useState } from 'react';
import { useStore } from '../state/store';
import { parseImportedState } from '../engine/storage';
import { ALL_TOPICS } from '../data/syllabus';
import { ALL_QUESTIONS } from '../data/bank';
import { Card, CardHead, Field } from '../components/ui';

export function SettingsPage() {
  const { state, set, resetAll, exportJson, replace, notify } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pass, setPass] = useState(state.settings.passPercent);
  const [target, setTarget] = useState(Math.round(state.settings.dailyTargetMin / 60));

  const patchSettings = (patch: Partial<typeof state.settings>) =>
    set((cur) => ({ ...cur, settings: { ...cur.settings, ...patch } }));

  const updateBlock = (id: string, patch: Partial<{ start: string; end: string; label: string }>) =>
    set((cur) => ({
      ...cur,
      settings: { ...cur.settings, blocks: cur.settings.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) },
    }));

  const onImport = async (file: File) => {
    const text = await file.text();
    const parsed = parseImportedState(text);
    if (!parsed) {
      notify('That file is not a valid EXAMFORGE export.');
      return;
    }
    replace(parsed);
    notify('Progress imported successfully.');
  };

  const studyBlocks = state.settings.blocks.filter((b) => b.kind === 'study');
  const totalStudyMinutes = studyBlocks.reduce((n, b) => {
    const [sh, sm] = b.start.split(':').map(Number);
    const [eh, em] = b.end.split(':').map(Number);
    return n + (eh * 60 + em - (sh * 60 + sm));
  }, 0);

  return (
    <main className="page">
      <div className="page-head">
        <div className="col">
          <h1>Settings</h1>
          <p>Routine, targets and data. All progress lives in this browser's local storage and can be exported at any time.</p>
        </div>
        <div className="page-actions">
          <button className="btn ghost" onClick={exportJson}>
            Export progress (JSON)
          </button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>
            Import progress
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <div className="grid g2" style={{ marginBottom: 14 }}>
        <Card>
          <CardHead title="Daily routine" sub="Every block is editable; sleep is protected" />
          <div className="col" style={{ gap: 8 }}>
            {state.settings.blocks.map((b) => (
              <div key={b.id} className="row" style={{ gap: 8 }}>
                <input type="time" value={b.start} onChange={(e) => updateBlock(b.id, { start: e.target.value })} style={{ width: 104 }} aria-label={`${b.label} start`} />
                <input type="time" value={b.end} onChange={(e) => updateBlock(b.id, { end: e.target.value })} style={{ width: 104 }} aria-label={`${b.label} end`} />
                <input type="text" value={b.label} onChange={(e) => updateBlock(b.id, { label: e.target.value })} aria-label="Block label" />
                <span className={`badge ${b.kind === 'study' ? 'learned' : b.kind === 'break' ? 'in_progress' : 'not_started'}`}>{b.kind}</span>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className="row between small">
            <span className="muted">Focused study per day</span>
            <b className="mono">{(totalStudyMinutes / 60).toFixed(1)} h</b>
          </div>
        </Card>

        <div className="col" style={{ gap: 14 }}>
          <Card>
            <CardHead title="Targets & windows" />
            <div className="grid g2">
              <Field label="Wake time">
                <input type="time" value={state.settings.wake} onChange={(e) => patchSettings({ wake: e.target.value })} />
              </Field>
              <Field label="Sleep time">
                <input type="time" value={state.settings.sleep} onChange={(e) => patchSettings({ sleep: e.target.value })} />
              </Field>
              <Field label="Travel start">
                <input type="date" value={state.settings.travelStart} onChange={(e) => patchSettings({ travelStart: e.target.value })} />
              </Field>
              <Field label="Travel end">
                <input type="date" value={state.settings.travelEnd} onChange={(e) => patchSettings({ travelEnd: e.target.value })} />
              </Field>
              <Field label="Daily study target (hours)">
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  onBlur={() => patchSettings({ dailyTargetMin: Math.max(60, target * 60) })}
                />
              </Field>
              <Field label="Mastery pass mark (%)">
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={pass}
                  onChange={(e) => setPass(Number(e.target.value))}
                  onBlur={() => patchSettings({ passPercent: Math.min(100, Math.max(50, pass)) })}
                />
              </Field>
            </div>
            <div className="small muted" style={{ marginTop: 10 }}>
              Travel {state.settings.travelStart} → {state.settings.travelEnd} is excluded from compulsory study. Raising the pass
              mark makes MASTERED harder to earn.
            </div>
          </Card>

          <Card>
            <CardHead title="Data" sub="Local-first, no account required" />
            <div className="col small" style={{ gap: 4 }}>
              <div className="row between">
                <span className="muted">Syllabus topics</span>
                <b className="mono">{ALL_TOPICS.length}</b>
              </div>
              <div className="row between">
                <span className="muted">Questions in bank</span>
                <b className="mono">{ALL_QUESTIONS.length}</b>
              </div>
              <div className="row between">
                <span className="muted">Attempts recorded</span>
                <b className="mono">{state.attempts.length}</b>
              </div>
              <div className="row between">
                <span className="muted">Mock papers</span>
                <b className="mono">{state.mocks.length}</b>
              </div>
              <div className="row between">
                <span className="muted">Revision items</span>
                <b className="mono">{state.revisions.length}</b>
              </div>
            </div>
            <div className="divider" />
            <button className="btn danger" onClick={() => resetAll()}>
              Reset all progress
            </button>
            <p className="tiny muted" style={{ marginTop: 8 }}>
              Resetting clears progress, attempts, mocks, revisions and study logs, then regenerates the timetable. Export first if
              you want a copy.
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
