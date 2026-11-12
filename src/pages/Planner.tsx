// EXAMFORGE — Adaptive study planner for the active examination plan.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { SUBJECTS, TOPIC_MAP } from '../data/syllabus';
import { SESSION_KIND_LABEL, SESSION_KIND_TONE, STUDY_LABEL } from '../data/labels';
import { addDays, formatClock, prettyDate, todayKey } from '../engine/dates';
import { sessionsForDate, missedCount, examCountdown } from '../engine/scheduler';
import { activatePlan, planSummary, toggleSessionDone } from '../engine/plan';
import { PLAN_ID } from '../data/plan';
import { Bar, Card, CardHead, Empty, Field, Tabs } from '../components/ui';
import type { ScheduleMode, StudySession } from '../data/types';

export function Planner() {
  const { state, set, regenerate, rebalance, notify } = useStore();
  const navigate = useNavigate();
  const today = todayKey();
  const [mode, setMode] = useState<ScheduleMode>(state.timetable?.mode ?? 'plan');
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState(false);

  const summary = useMemo(() => planSummary(state), [state]);
  const planActive = state.plan?.id === PLAN_ID;

  const days = useMemo(() => {
    const sessions = state.sessions;
    if (sessions.length === 0) return [today];
    const dates = [...new Set(sessions.map((s) => s.date))].sort();
    return dates.filter((d) => d >= today);
  }, [state.sessions, today]);

  const selectedSessions = sessionsForDate(state, selected);
  const selectedView = summary.days.find((d) => d.date === selected);
  const aheadSessions = state.sessions.filter(
    (s) => !s.done && s.date >= today && s.kind !== 'routine' && s.kind !== 'exam',
  );
  const totalMinutes = aheadSessions.reduce((n, s) => n + s.minutes, 0);

  const toggleDone = (id: string) => set((cur) => toggleSessionDone(cur, id));

  const applyMode = (m: ScheduleMode) => {
    setMode(m);
    if (m === 'plan') {
      set((cur) => activatePlan(cur));
      notify('November examination plan activated — progress and materials preserved.');
      return;
    }
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
            {STUDY_LABEL[mode]}. Every date below is a real session with real topics — finish a session and the topic is
            <b> covered, not mastered</b>; only a passed assessment earns mastery.
          </p>
        </div>
        <div className="page-actions">
          <Tabs
            options={[
              { id: 'plan', label: 'Examination plan' },
              { id: 'sprint', label: 'Sprint (coverage)' },
              { id: 'examwise', label: 'Exam-wise (mastery)' },
            ]}
            value={mode}
            onChange={(m) => applyMode(m as ScheduleMode)}
          />
          <button className="btn ghost" onClick={rebalance} title="Move unfinished topics into later sessions">
            Redistribute missed
          </button>
          <button className="btn primary" onClick={regenerate}>
            Rebuild timetable
          </button>
        </div>
      </div>

      {planActive && (
        <Card style={{ marginBottom: 14 }}>
          <CardHead
            title="Four-paper plan · 12–26 November 2026"
            sub={`${summary.days.length} study days · ${summary.days.reduce((n, d) => n + d.total, 0)} sessions · ${(
              summary.days.reduce((n, d) => n + d.minutes, 0) / 60
            ).toFixed(1)} h planned · IST`}
            right={<span className="badge mastered">ACTIVE</span>}
          />
          <div className="col" style={{ gap: 6 }}>
            <div className="row between small">
              <span className="muted">Today · {prettyDate(today)}</span>
              <b className="mono">
                {summary.today.done}/{summary.today.total} sessions · {summary.today.percent}%
              </b>
            </div>
            <Bar percent={summary.today.percent} tone="em" />
          </div>
          <div className="row wrap" style={{ gap: 6, marginTop: 12 }}>
            {[...SUBJECTS]
              .sort((a, b) => a.examDate.localeCompare(b.examDate))
              .map((s) => {
                const d = examCountdown(today, s.examDate);
                return (
                  <span key={s.id} className={`badge ${d < 0 ? 'not_started' : d <= 1 ? 'needs_revision' : 'lav'}`}>
                    {s.code} · {d < 0 ? 'done' : d === 0 ? 'today' : `${d}d`}
                  </span>
                );
              })}
            {summary.pending.length > 0 && <span className="badge needs_revision">{summary.pending.length} unfinished</span>}
          </div>
          <div className="divider" />
          <div className="row wrap" style={{ gap: 6 }}>
            {summary.days.map((d) => {
              const pct = d.total ? Math.round((d.done / d.total) * 100) : 0;
              const past = d.date < today;
              return (
                <button
                  key={d.date}
                  className={`btn sm ${d.date === selected ? 'primary' : 'ghost'}`}
                  onClick={() => setSelected(d.date)}
                  title={d.label}
                >
                  {d.date.slice(8)} Nov · {pct}%
                  {past && pct < 100 ? ' !' : ''}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Card>
          <span className="stat-label">Sessions ahead</span>
          <div className="stat-value mono">{aheadSessions.length}</div>
          <span className="stat-sub">{(totalMinutes / 60).toFixed(1)} h of planned study and revision</span>
        </Card>
        <Card>
          <span className="stat-label">Today</span>
          <div className="stat-value mono">
            {summary.today.percent}
            <small> %</small>
          </div>
          <span className="stat-sub">
            {summary.today.done} of {summary.today.total} sessions · {summary.today.doneMinutes}/
            {summary.today.minutes} min
          </span>
        </Card>
        <Card>
          <span className="stat-label">Missed</span>
          <div className="stat-value mono">{missedCount(state)}</div>
          <span className="stat-sub">Redistribute to move topics, never to cut sleep</span>
        </Card>
        <Card>
          <span className="stat-label">Next exam</span>
          <div className="stat-value mono">
            {summary.nextExam ? (summary.nextExam.days === 0 ? 'Today' : summary.nextExam.days) : '—'}
            {summary.nextExam && summary.nextExam.days !== 0 && <small> days</small>}
          </div>
          <span className="stat-sub">
            {summary.nextExam
              ? `${summary.nextExam.code} · ${prettyDate(summary.nextExam.date)}`
              : 'All papers written'}
          </span>
        </Card>
      </div>

      <div className="grid g-side">
        <Card>
          <CardHead
            title={selectedView ? selectedView.label : 'Daily sessions'}
            sub={`${prettyDate(selected)}${
              selectedView ? ` · ${selectedView.done}/${selectedView.total} done` : ''
            }`}
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
            <Empty>No sessions on this date. Rebuild the timetable or pick another day.</Empty>
          ) : (
            selectedSessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                onToggle={() => toggleDone(s.id)}
                onOpen={(id) => navigate(`/learn?topic=${id}`)}
                onMock={() => navigate('/mocks')}
              />
            ))
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
              {[...state.settings.blocks]
                .sort((a, b) => a.start.localeCompare(b.start))
                .map((b) => (
                <div key={b.id} className="row" style={{ gap: 8 }}>
                  <span className={`dot ${b.kind === 'study' ? 'em' : b.kind === 'break' ? '' : 'warn'}`} />
                  {editing ? (
                    <>
                      <input
                        type="time"
                        value={b.start}
                        onChange={(e) => updateBlock(b.id, { start: e.target.value })}
                        style={{ width: 96 }}
                      />
                      <input
                        type="time"
                        value={b.end}
                        onChange={(e) => updateBlock(b.id, { end: e.target.value })}
                        style={{ width: 96 }}
                      />
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
                {(
                  state.settings.blocks
                    .filter((b) => b.kind === 'study')
                    .reduce(
                      (n, b) =>
                        n +
                        (Number(b.end.slice(0, 2)) * 60 +
                          Number(b.end.slice(3)) -
                          (Number(b.start.slice(0, 2)) * 60 + Number(b.start.slice(3)))),
                      0,
                    ) / 60
                ).toFixed(1)}{' '}
                h
              </b>
            </div>
            <div className="row between small">
              <span className="muted">Daily target (incl. recall)</span>
              <b className="mono">{(state.settings.dailyTargetMin / 60).toFixed(1)} h</b>
            </div>
            <div className="row between small">
              <span className="muted">Sleep window</span>
              <b className="mono">
                {formatClock(state.settings.sleep)} → {formatClock(state.settings.wake)}
              </b>
            </div>
          </Card>

          <Card>
            <CardHead title="How this plan works" sub="Rules the timetable never breaks" />
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#cfc9bf' }}>
              <li>Tomorrow's paper first: coverage is ordered by examination date, never by preference.</li>
              <li>Exam mornings are protected — only a light revision pass before the paper.</li>
              <li>The night before an exam carries revision and a mock report, never new heavy material.</li>
              <li>Finishing a session marks coverage only; MASTERED still needs a passed assessment at {state.settings.passPercent}%.</li>
              <li>Missed sessions are redistributed into later capacity; sleep and meals are never shortened.</li>
              <li>Practice, numericals and recall appear every day, not only at the end.</li>
            </ul>
            <div className="divider" />
            <Field label="Exam countdowns">
              <div className="col" style={{ gap: 4 }}>
                {[...SUBJECTS].sort((a, b) => a.examDate.localeCompare(b.examDate)).map((s) => (
                  <div key={s.id} className="row between small">
                    <span>{s.code}</span>
                    <span className="mono muted">
                      {s.examDate} · {examCountdown(today, s.examDate)}d
                    </span>
                  </div>
                ))}
              </div>
            </Field>
            {!planActive && (
              <>
                <div className="divider" />
                <button className="btn primary" onClick={() => set((cur) => activatePlan(cur))}>
                  Activate November plan
                </button>
              </>
            )}
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
  onMock,
}: {
  session: StudySession;
  onToggle: () => void;
  onOpen: (topicId: string) => void;
  onMock: () => void;
}) {
  const subject = SUBJECTS.find((s) => s.id === session.subjectId);
  const kindLabel = SESSION_KIND_LABEL[session.kind];
  const tone = SESSION_KIND_TONE[session.kind];
  return (
    <div className="item" style={{ alignItems: 'flex-start', gap: 12 }}>
      <div className="col" style={{ gap: 2, width: 92, flex: 'none' }}>
        <b className="small mono">{formatClock(session.start)}</b>
        <span className="tiny muted">{formatClock(session.end)}</span>
        {session.kind !== 'routine' && (
          <span className="badge lav" style={{ marginTop: 2 }}>
            {subject?.code}
          </span>
        )}
      </div>
      <div className="col" style={{ gap: 3, flex: 1 }}>
        <div className="row wrap" style={{ gap: 6 }}>
          <b className="small">{session.title ?? kindLabel}</b>
          <span className={`badge ${tone}`}>{kindLabel}</span>
          <span className="mark-pill">{session.minutes} min</span>
          {session.missed && <span className="badge needs_revision">missed</span>}
          {session.carryOver && session.carryOver.length > 0 && (
            <span className="badge in_progress">{session.carryOver.length} carried over</span>
          )}
        </div>
        <span className="small" style={{ color: '#ded8cc' }}>
          {session.topicIds.length > 0 ? session.topicIds.map((id) => TOPIC_MAP[id]?.name ?? id).join(' · ') : session.material}
        </span>
        {session.objectives.length > 0 && <span className="tiny muted">{session.objectives.join(' · ')}</span>}
        <span className="tiny muted">Criteria: {session.criteria}</span>
        <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
          {session.topicIds.slice(0, 2).map((id) => (
            <button key={id} className="btn sm ghost" onClick={() => onOpen(id)}>
              Open topic
            </button>
          ))}
          {session.kind === 'mock' && (
            <button className="btn sm ghost" onClick={onMock}>
              Go to mocks
            </button>
          )}
        </div>
      </div>
      <div className="col" style={{ gap: 6, alignItems: 'flex-end' }}>
        {session.kind === 'routine' || session.kind === 'exam' ? (
          <span className="tiny muted">{session.kind === 'exam' ? 'paper' : 'protected'}</span>
        ) : (
          <button className={`btn sm ${session.done ? 'em' : ''}`} onClick={onToggle}>
            {session.done ? 'Done ✓' : 'Mark done'}
          </button>
        )}
        <div style={{ width: 70 }}>
          <Bar percent={session.done ? 100 : 0} tone="em" />
        </div>
      </div>
    </div>
  );
}
