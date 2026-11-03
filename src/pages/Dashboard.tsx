// EXAMFORGE — Dashboard.

import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { SUBJECTS, TOPIC_MAP } from '../data/syllabus';
import { buildDashboard } from '../engine/analytics';
import { diffDays, prettyDateShort, todayKey, formatClock } from '../engine/dates';
import { sessionsForDate, nextSession, examCountdown, isTravelDay } from '../engine/scheduler';
import { dueRevisions } from '../engine/revision';
import { Bar, Card, CardHead, Empty, Ring, Stat } from '../components/ui';
import { BarSeries, WeekBars } from '../components/charts';
import { STATUS_LABELS } from '../data/types';

export function Dashboard() {
  const { state, set } = useStore();
  const navigate = useNavigate();
  const today = todayKey();
  const dash = buildDashboard(state);
  const todaySessions = sessionsForDate(state, today);
  const next = nextSession(state);
  const due = dueRevisions(state);
  const travel = isTravelDay(today, state);

  const upcoming = [...SUBJECTS].sort((a, b) => a.examDate.localeCompare(b.examDate));
  const nextExam = upcoming.find((s) => diffDays(today, s.examDate) >= 0) ?? upcoming[0];
  const daysToExam = diffDays(today, nextExam.examDate);
  const weak = dash.weakest.filter((w) => w.reason !== 'mastered').slice(0, 5);

  const markDone = (id: string) => {
    set((cur) => ({
      ...cur,
      sessions: cur.sessions.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
    }));
  };

  const continueTopic = next?.topicIds[0];

  return (
    <main className="page">
      <div className="page-head">
        <div className="col">
          <h1>Dashboard</h1>
          <p>
            {travel
              ? 'Travel period — no compulsory sessions are scheduled. Optional light revision only.'
              : `Coverage is ${Math.round(dash.coverage.percent)}% and mastery is ${Math.round(
                  ((dash.coverage.mastered / Math.max(dash.coverage.total, 1)) * 100),
                )}% — coverage is not mastery.`}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn ghost" onClick={() => navigate('/planner')}>
            Today's plan
          </button>
          <button
            className="btn primary"
            onClick={() => navigate(continueTopic ? `/learn?topic=${continueTopic}` : '/learn')}
          >
            Continue learning →
          </button>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Card>
          <Stat
            label="Overall coverage"
            value={Math.round(dash.coverage.percent)}
            unit="%"
            sub={`${dash.coverage.covered} of ${dash.coverage.total} topics learned`}
          />
          <div style={{ marginTop: 10 }}>
            <Bar percent={dash.coverage.percent} />
          </div>
        </Card>
        <Card>
          <Stat
            label="Mastery"
            value={Math.round((dash.coverage.mastered / Math.max(dash.coverage.total, 1)) * 100)}
            unit="%"
            sub={`${dash.coverage.mastered} topics passed assessment`}
          />
          <div style={{ marginTop: 10 }}>
            <Bar percent={((dash.coverage.mastered / Math.max(dash.coverage.total, 1)) * 100)} tone="em" />
          </div>
        </Card>
        <Card>
          <Stat
            label={`Next exam · ${nextExam.code}`}
            value={daysToExam === 0 ? 'Today' : daysToExam}
            unit={daysToExam === 0 ? '' : 'days'}
            sub={`${nextExam.name} · ${prettyDateShort(nextExam.examDate)} ${formatClock(nextExam.examStart)}`}
          />
          <div className="small muted" style={{ marginTop: 8 }}>
            {examCountdown(today, nextExam.examDate) <= 0
              ? 'Examination day.'
              : `${Math.max(examCountdown(today, nextExam.examDate), 0)} study days remaining.`}
          </div>
        </Card>
        <Card>
          <Stat
            label="Study today"
            value={`${Math.floor(dash.todayMinutes / 60)}h ${dash.todayMinutes % 60}m`}
            sub={`Target ${Math.round(state.settings.dailyTargetMin / 60)}h · streak ${dash.streak} days`}
          />
          <div style={{ marginTop: 10 }}>
            <Bar percent={(dash.todayMinutes / state.settings.dailyTargetMin) * 100} tone="warn" />
          </div>
        </Card>
      </div>

      <div className="grid g-side" style={{ marginBottom: 14 }}>
        <Card>
          <CardHead
            title="Today's study schedule"
            sub={travel ? 'Travel period — sessions are optional' : `${todaySessions.length} sessions planned`}
            right={
              <button className="btn sm ghost" onClick={() => navigate('/planner')}>
                Open planner
              </button>
            }
          />
          {todaySessions.length === 0 && <Empty>No sessions today. Generate a plan in the Study Planner.</Empty>}
          <div className="col" style={{ gap: 6 }}>
            {todaySessions.map((s) => (
              <div key={s.id} className="item" style={{ alignItems: 'flex-start' }}>
                <span className={`dot ${s.done ? 'em' : s.kind === 'mock' ? 'warn' : ''}`} style={{ marginTop: 6 }} />
                <div className="col" style={{ gap: 2, flex: 1 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <b className="small mono">
                      {formatClock(s.start)}–{formatClock(s.end)}
                    </b>
                    <span className="tiny muted">
                      {SUBJECTS.find((x) => x.id === s.subjectId)?.code} · {s.kind}
                    </span>
                  </div>
                  <span className="small" style={{ color: '#ded8cc' }}>
                    {s.topicIds.length > 0
                      ? s.topicIds.map((id) => TOPIC_MAP[id]?.name ?? id).join(' · ')
                      : s.kind === 'mock'
                        ? 'Full mock examination'
                        : 'Revision block'}
                  </span>
                  <span className="tiny muted">{s.objectives.slice(0, 2).join(' · ')}</span>
                </div>
                <button className={`btn sm ${s.done ? 'extra' : 'ghost'}`} onClick={() => markDone(s.id)}>
                  {s.done ? 'Done ✓' : 'Mark done'}
                </button>
              </div>
            ))}
          </div>
        </Card>

        <div className="col" style={{ gap: 14 }}>
          <Card>
            <CardHead title="Preparation" sub="Coverage vs mastery across all four subjects" />
            <div className="row" style={{ gap: 16 }}>
              <Ring percent={dash.coverage.percent} />
              <div className="col" style={{ gap: 8, flex: 1 }}>
                <div>
                  <div className="row between small">
                    <span className="muted">Learned</span>
                    <b>{dash.coverage.covered}</b>
                  </div>
                  <Bar percent={dash.coverage.percent} />
                </div>
                <div>
                  <div className="row between small">
                    <span className="muted">Mastered</span>
                    <b>{dash.coverage.mastered}</b>
                  </div>
                  <Bar percent={((dash.coverage.mastered / Math.max(dash.coverage.total, 1)) * 100)} tone="em" />
                </div>
                <div className="row between small">
                  <span className="muted">Needs revision</span>
                  <b>{dash.coverage.needsRevision}</b>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHead
              title="Revision queue"
              sub={`${due.length} due today`}
              right={
                <button className="btn sm ghost" onClick={() => navigate('/revision')}>
                  Review
                </button>
              }
            />
            {due.length === 0 ? (
              <Empty>Nothing due. Revisions appear here on the spaced-repetition schedule.</Empty>
            ) : (
              due.slice(0, 4).map((r) => (
                <div key={r.id} className="row between small" style={{ padding: '5px 0' }}>
                  <span>{TOPIC_MAP[r.topicId]?.name ?? r.topicId}</span>
                  <span className="tiny muted">stage {r.stage}</span>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>

      <div className="grid g2" style={{ marginBottom: 14 }}>
        <Card>
          <CardHead title="Subject progress" sub="Coverage and mastery by paper" />
          <BarSeries
            data={dash.subjects.map((s) => ({
              label: SUBJECTS.find((x) => x.id === s.subjectId)?.code ?? s.subjectId,
              value: s.percent,
              hint: `${s.mastered}/${s.totalTopics} mastered`,
            }))}
          />
          <div className="col" style={{ gap: 8, marginTop: 10 }}>
            {dash.subjects.map((s) => {
              const subj = SUBJECTS.find((x) => x.id === s.subjectId)!;
              return (
                <div key={s.subjectId} onClick={() => navigate(`/subjects/${s.subjectId}`)} style={{ cursor: 'pointer' }}>
                  <div className="row between small">
                    <span>{subj.name}</span>
                    <span className="mono muted">
                      {Math.round(s.percent)}% · {Math.round(s.masteryPercent)}% mastered
                    </span>
                  </div>
                  <Bar percent={s.percent} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead title="This week's consistency" sub="Minutes studied per day against target" />
          <WeekBars week={dash.week} target={state.settings.dailyTargetMin} />
          <div className="chart-legend">
            <span><i style={{ background: '#5fb08a' }} />target met</span>
            <span><i style={{ background: '#b3a6d6' }} />below target</span>
            <span><i style={{ background: '#5fb08a', opacity: 0.6 }} />daily target line</span>
          </div>
        </Card>
      </div>

      <div className="grid g2">
        <Card>
          <CardHead title="Today's learning objectives" sub="From your next scheduled session" />
          {next ? (
            <>
              <div className="row wrap" style={{ gap: 6, marginBottom: 8 }}>
                <span className="badge lav">{SUBJECTS.find((s) => s.id === next.subjectId)?.code}</span>
                <span className="badge">{next.topicIds.length} topic(s)</span>
                <span className="badge">{next.minutes} min</span>
              </div>
              <ul style={{ margin: '0 0 10px', paddingLeft: 18, color: '#cfc9bf', fontSize: 12.5 }}>
                {next.objectives.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
              <div className="small muted" style={{ marginBottom: 10 }}>
                Material: {next.material}
              </div>
              <button
                className="btn primary sm"
                onClick={() => navigate(next.topicIds[0] ? `/learn?topic=${next.topicIds[0]}` : '/learn')}
              >
                Start this session
              </button>
            </>
          ) : (
            <Empty>No upcoming session. Rebalance the planner to schedule the remaining syllabus.</Empty>
          )}
        </Card>

        <Card>
          <CardHead
            title="Weak topics"
            sub="Lowest assessment and practice scores first"
            right={
              <button className="btn sm ghost" onClick={() => navigate('/analytics')}>
                Analytics
              </button>
            }
          />
          {weak.length === 0 ? (
            <Empty>No weak topics yet — attempt practice tests to build the picture.</Empty>
          ) : (
            weak.map((w) => (
              <div
                key={w.topicId}
                className="item"
                onClick={() => navigate(`/learn?topic=${w.topicId}`)}
              >
                <span className="dot warn" />
                <div className="col" style={{ gap: 0, flex: 1 }}>
                  <span className="small">{w.name}</span>
                  <span className="tiny muted">
                    {w.unitName} · {w.reason}
                  </span>
                </div>
                <span className="badge needs_revision">{STATUS_LABELS[state.progress[w.topicId]?.status ?? 'not_started']}</span>
              </div>
            ))
          )}
        </Card>
      </div>
    </main>
  );
}
