// EXAMFORGE — Settings: routine, targets, travel window, data portability.

import { useRef, useState } from 'react';
import { useStore } from '../state/store';
import { parseImportedState } from '../engine/storage';
import { ALL_TOPICS, SUBJECTS } from '../data/syllabus';
import { ALL_QUESTIONS } from '../data/bank';
import { planSummary } from '../engine/plan';
import { PLAN_ID, PLAN_TITLE } from '../data/plan';
import { currentReminder, deliver, requestNotificationPermission, reminderSupported } from '../engine/reminders';
import { prettyDate } from '../engine/dates';
import { Card, CardHead, Field } from '../components/ui';

export function SettingsPage() {
  const { state, set, resetAll, exportJson, replace, notify, activateExamPlan } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pass, setPass] = useState(state.settings.passPercent);
  const [target, setTarget] = useState(Math.round(state.settings.dailyTargetMin / 60));
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    reminderSupported() ? Notification.permission : 'unsupported',
  );
  const plan = planSummary(state);
  const planActive = state.plan?.id === PLAN_ID;

  const patchSettings = (patch: Partial<typeof state.settings>) =>
    set((cur) => ({ ...cur, settings: { ...cur.settings, ...patch } }));

  const patchReminders = (patch: Partial<typeof state.reminders>) =>
    set((cur) => ({ ...cur, reminders: { ...cur.reminders, ...patch } }));

  const enableNotifications = async () => {
    if (!reminderSupported()) {
      notify('This browser does not support notifications.');
      return;
    }
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      patchReminders({ desktopEnabled: true });
      const reminder = currentReminder(state);
      notify('Desktop reminders enabled — they fire while EXAMFORGE is open.');
      if (reminder) deliver(reminder);
    } else {
      patchReminders({ desktopEnabled: false });
      notify('Notification permission was not granted — in-app reminders stay on.');
    }
  };

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
            {[...state.settings.blocks]
              .sort((a, b) => a.start.localeCompare(b.start))
              .map((b) => (
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
            <CardHead
              title="Active examination plan"
              sub={planActive ? `${PLAN_TITLE} · activated ${prettyDate(new Date(state.plan!.activatedAt).toISOString().slice(0, 10))}` : 'No plan active'}
              right={<span className={`badge ${planActive ? 'mastered' : 'not_started'}`}>{planActive ? 'ACTIVE' : 'INACTIVE'}</span>}
            />
            <div className="col small" style={{ gap: 4 }}>
              {[...SUBJECTS].sort((a, b) => a.examDate.localeCompare(b.examDate)).map((s) => (
                <div key={s.id} className="row between">
                  <span className="muted">
                    {s.code} · {s.name}
                  </span>
                  <b className="mono">
                    {prettyDate(s.examDate)} · {s.examStart}
                  </b>
                </div>
              ))}
              <div className="row between">
                <span className="muted">Sessions planned</span>
                <b className="mono">{plan.days.reduce((n, d) => n + d.total, 0)}</b>
              </div>
              <div className="row between">
                <span className="muted">Today</span>
                <b className="mono">
                  {plan.today.done}/{plan.today.total} sessions
                </b>
              </div>
            </div>
            <div className="divider" />
            <button className="btn primary" onClick={activateExamPlan}>
              {planActive ? 'Rebuild plan from syllabus' : 'Activate November plan'}
            </button>
            <p className="tiny muted" style={{ marginTop: 8 }}>
              Rebuilding only rewrites the schedule. Topic progress, assessments, mocks, revisions and imported material are kept
              untouched.
            </p>
          </Card>

          <Card>
            <CardHead title="Reminders" sub="Local notifications, delivered while the app is open" />
            <div className="col" style={{ gap: 8 }}>
              <div className="row between small">
                <span className="muted">Desktop notifications</span>
                <b className="mono">
                  {permission === 'unsupported' ? 'unsupported' : permission === 'granted' && state.reminders.desktopEnabled ? 'on' : 'off'}
                </b>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn sm" onClick={() => void enableNotifications()}>
                  Enable notifications
                </button>
                <button
                  className="btn sm ghost"
                  onClick={() => {
                    const reminder = currentReminder(state) ?? {
                      key: `test:${Date.now()}`,
                      title: 'EXAMFORGE reminder test',
                      body: 'Reminders are delivered while the app is open. Keep this tab pinned on study days.',
                      tone: 'revision' as const,
                    };
                    if (!deliver(reminder)) notify('Allow notifications in the browser to see this reminder.');
                  }}
                >
                  Test
                </button>
              </div>
              <Field label="Daily revision reminder">
                <input
                  type="time"
                  value={state.reminders.dailyTime}
                  onChange={(e) => patchReminders({ dailyTime: e.target.value })}
                />
              </Field>
              <div className="row between small">
                <span className="muted">Exam warning</span>
                <b className="mono">{state.reminders.examLeadHours.join(' h / ')} h before</b>
              </div>
              <div className="row between small">
                <span className="muted">Overdue work</span>
                <b className="mono">{plan.overdue.length + plan.pending.length} sessions</b>
              </div>
            </div>
            <p className="tiny muted" style={{ marginTop: 8 }}>
              A browser app cannot ring when it is closed. Keep EXAMFORGE installed or pinned: the daily recall reminder, exam
              countdowns and overdue nudges are checked once a minute while it is open, and each fires once per day.
            </p>
          </Card>

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
