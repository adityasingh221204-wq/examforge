// EXAMFORGE — Adaptive study planner.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { SUBJECTS, TOPIC_MAP } from '../data/syllabus';
import { STUDY_LABEL } from '../data/labels';
import { addDays, formatClock, prettyDate, todayKey, dateRange } from '../engine/dates';
import { applySchedule, missedCount, sessionsForDate, isTravelDay } from '../engine/scheduler';
import { Bar, Card, CardHead, Empty, Field, Tabs } from '../components/ui';
import type { ScheduleMode, StudySession } from '../data/types';

export function Planner() {
  const { state, set, regenerate, rebalance, notify } = useStore();
  const navigate = useNavigate();
  const today = todayKey();
  const [mode, setMode] = useState<ScheduleMode>(state.timetable?.mode ?? 'sprint');
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState(false);

  const days = useMemo(() => {
    const sessions = state.sessions;
    if (sessions.length === 0) return [today];
    const dates = [...new Set(sessions.map((s) => s.date))].sort();
    return dates.filter((d) => d >= today);
  }, [state.sessions, today]);

  const selectedSessions = sessionsForDate(state, selected);
  const week = dateRange(today, addDays(today, 6));
  const totalMinutes = state.sessions.filter((s) => !s.done).reduce((n, s) => n + s.minutes, 0);

  const toggleDone = (id: string) =>
    set((cur) => ({ ...cur, sessions: cur.sessions.map((s) => (s.id === id ? { ...s, done: !s.done } : s)) }));

  const applyMode = (m: ScheduleMode) => {
    setMode(m);
    set((cur) => applySchedule(cur, m, today));
    notify(`${STUDY_LABEL[m]} selected — timetable rebuilt from current coverage.`);
  };

  const updateBlock = (id: string, patch: Partial<{ start: string; end: string; label: string }>) =>
    set((cur) => ({
      ...cur,
      settings: {
        ...cur.settings,
        blocks: cur.settings.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      },
    }));

  return (
    <main className="page">
      <div className="page-head">
        <div className="col">
          <h1>Study Planner</h1>
          <p>
            {STUDY_LABEL[mode]}. Travel {state.settings.travelStart} → {state.settings.travelEnd} is kept free of compulsory study;
            sleep is never shortened to catch up.
          </p>
        </div>
        <div className="page-actions">
          <Tabs
            options={[
              { id: 'sprint', label: 'Sprint (coverage)' },
              { id: 'examwise', label: 'Exam-wise (mastery)' },
            ]}
            value={mode}
            onChange={(m) => applyMode(m as ScheduleMode)}
          />
          <button className="btn ghost" onClick={rebalance}>
            Rebalance missed
          </button>
          <button className="btn primary" onClick={regenerate}>
            Regenerate timetable
          </button>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Card>
          <span className="stat-label">Sessions ahead</span>
          <div className="stat-value mono">{state.sessions.filter((s) => !s.done && s.date >= today).length}</div>
          <span className="stat-sub">{(totalMinutes / 60).toFixed(1)} h of planned study</span>
        </Card>
        <Card>
          <span className="stat-label">Missed</span>
          <div className="stat-value mono">{missedCount(state)}</div>
          <span className="stat-sub">Rebalance to redistribute without touching sleep</span>
        </Card>
        <Card>
          <span className="stat-label">Daily target</span>
          <div className="stat-value mono">
            {Math.round(state.settings.dailyTargetMin / 60)}
            <small> h</small>
          </div>
          <span className="stat-sub">
            Wake {formatClock(state.settings.wake)} · sleep {formatClock(state.settings.sleep)}
          </span>
        </Card>
        <Card>
          <span className="stat-label">Next 7 days</span>
          <div className="col" style={{ gap: 4, marginTop: 4 }}>
            {week.map((d) => {
              const mins = state.sessions.filter((s) => s.date === d && s.minutes > 0).reduce((n, s) => n + s.minutes, 0);
              return (
                <div key={d} className="row between tiny">
                  <span className="muted">{prettyDate(d).slice(0, 6)}</span>
                  <span className="mono">{isTravelDay(d, state) ? 'travel' : `${(mins / 60).toFixed(1)}h`}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid g-side">
        <Card>
          <CardHead
            title="Daily sessions"
            sub={prettyDate(selected)}
            right={
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm ghost" onClick={() => setSelected(addDays(selected, -1))}>
                  ←
                </button>
                <button className="btn sm ghost" onClick={() => setSelected(today)}>
                  Today
                </button>
                <button className="btn sm ghost" onClick={() => setSelected(addDays(selected, 1))}>
                  →
                </button>
              </div>
            }
          />
          <div className="row wrap" style={{ gap: 5, marginBottom: 12 }}>
            {days.slice(0, 24).map((d) => (
              <button
                key={d}
                className={`btn sm ${d === selected ? 'primary' : 'ghost'}`}
                onClick={() => setSelected(d)}
              >
                {d.slice(5)}
              </button>
            ))}
          </div>
          {selectedSessions.length === 0 ? (
            <Empty>No sessions on this date. Generate a timetable or pick another day.</Empty>
          ) : (
            selectedSessions.map((s) => <SessionRow key={s.id} session={s} onToggle={() => toggleDone(s.id)} onOpen={(id) => navigate(`/learn?topic=${id}`)} />)
          )}
        </Card>

        <div className="col" style={{ gap: 14 }}>
          <Card>
            <CardHead
              title="Daily routine"
              sub="Every block is editable"
              right={
                <button className="btn sm ghost" onClick={() => setEditing((v) => !v)}>
                  {editing ? 'Done' : 'Edit'}
                </button>
              }
            />
            <div className="col" style={{ gap: 6 }}>
              {state.settings.blocks.map((b) => (
                <div key={b.id} className="row" style={{ gap: 8 }}>
                  <span className={`dot ${b.kind === 'study' ? 'em' : b.kind === 'break' ? '' : 'warn'}`} />
                  {editing ? (
                    <>
                      <input type="time" value={b.start} onChange={(e) => updateBlock(b.id, { start: e.target.value })} style={{ width: 96 }} />
                      <input type="time" value={b.end} onChange={(e) => updateBlock(b.id, { end: e.target.value })} style={{ width: 96 }} />
                      <input type="text" value={b.label} onChange={(e) => updateBlock(b.id, { label: e.target.value })} />
                    </>
                  ) : (
                    <>
                      <span className="small mono" style={{ minWidth: 100 }}>
                        {formatClock(b.start)}–{formatClock(b.end)}
                      </span>
                      <span className="small muted">{b.label}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="row between small">
              <span className="muted">Focused study per day</span>
              <b className="mono">
                {Math.round(
                  state.settings.blocks.filter((b) => b.kind === 'study').reduce((n, b) => n + (Number(b.end.slice(0, 2)) * 60 + Number(b.end.slice(3)) - (Number(b.start.slice(0, 2)) * 60 + Number(b.start.slice(3)))), 0) / 60,
                )}{' '}
                h
              </b>
            </div>
            <div className="row between small">
              <span className="muted">Sleep window</span>
              <b className="mono">
                {formatClock(state.settings.sleep)} → {formatClock(state.settings.wake)}
              </b>
            </div>
          </Card>

          <Card>
            <CardHead title="How sessions are allocated" />
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#cfc9bf' }}>
              <li>Least-slack subject first: remaining minutes ÷ available days to that exam.</li>
              <li>Coverage targets 15 minutes per topic (20 for numerical topics).</li>
              <li>Exam eve keeps an optional final revision; exam mornings are never scheduled.</li>
              <li>Exam-wise mode adds a full mock at T−2 and weak-topic practice at T−1.</li>
              <li>Missed work is redistributed, never recovered by cutting sleep.</li>
            </ul>
            <div className="divider" />
            <Field label="Exam countdowns">
              <div className="col" style={{ gap: 4 }}>
                {[...SUBJECTS].sort((a, b) => a.examDate.localeCompare(b.examDate)).map((s) => (
                  <div key={s.id} className="row between small">
                    <span>{s.code}</span>
                    <span className="mono muted">{s.examDate}</span>
                  </div>
                ))}
              </div>
            </Field>
          </Card>
        </div>
      </div>
    </main>
  );
}

function SessionRow({
  session,
  onToggle,
  onOpen,
}: {
  session: StudySession;
  onToggle: () => void;
  onOpen: (topicId: string) => void;
}) {
  const subject = SUBJECTS.find((s) => s.id === session.subjectId);
  return (
    <div className="item" style={{ alignItems: 'flex-start', gap: 12 }}>
      <div className="col" style={{ gap: 2, width: 92, flex: 'none' }}>
        <b className="small mono">{formatClock(session.start)}</b>
        <span className="tiny muted">{formatClock(session.end)}</span>
        <span className="badge lav" style={{ marginTop: 2 }}>{subject?.code}</span>
      </div>
      <div className="col" style={{ gap: 3, flex: 1 }}>
        <div className="row" style={{ gap: 6 }}>
          <b className="small">{session.kind === 'mock' ? 'Mock examination' : session.kind === 'revision' ? 'Spaced revision' : 'Learning session'}</b>
          <span className="mark-pill">{session.minutes} min</span>
          {session.missed && <span className="badge needs_revision">missed</span>}
        </div>
        <span className="small" style={{ color: '#ded8cc' }}>
          {session.topicIds.length > 0 ? session.topicIds.map((id) => TOPIC_MAP[id]?.name ?? id).join(' · ') : session.material}
        </span>
        <span className="tiny muted">{session.objectives.join(' · ')}</span>
        <span className="tiny muted">Criteria: {session.criteria}</span>
        <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
          {session.topicIds.slice(0, 2).map((id) => (
            <button key={id} className="btn sm ghost" onClick={() => onOpen(id)}>
              Open topic
            </button>
          ))}
          {session.kind === 'mock' && (
            <button className="btn sm ghost" onClick={() => { window.location.hash = '#/mocks'; }}>
              Go to mocks
            </button>
          )}
        </div>
      </div>
      <div className="col" style={{ gap: 6, alignItems: 'flex-end' }}>
        <button className={`btn sm ${session.done ? 'em' : ''}`} onClick={onToggle}>
          {session.done ? 'Done ✓' : 'Mark done'}
        </button>
        <div style={{ width: 70 }}>
          <Bar percent={session.done ? 100 : 0} tone="em" />
        </div>
      </div>
    </div>
  );
}
