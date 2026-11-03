// EXAMFORGE — Performance Analytics: every number computed from real recorded activity.

import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { SUBJECTS } from '../data/syllabus';
import { buildDashboard, masteryHeatmap, questionsAttemptedBySubject } from '../engine/analytics';
import { overallCoverage } from '../engine/progress';
import { Bar, Card, CardHead, Empty, Ring } from '../components/ui';
import { BarSeries, Heatmap, LineChart, WeekBars } from '../components/charts';

export function Analytics() {
  const { state, exportJson } = useStore();
  const navigate = useNavigate();
  const dash = buildDashboard(state);
  const coverage = overallCoverage(state);
  const heat = masteryHeatmap(state);
  const perSubject = questionsAttemptedBySubject(state);
  const totalMinutes = state.studyLog.reduce((n, l) => n + l.minutes, 0);

  return (
    <main className="page">
      <div className="page-head">
        <div className="col">
          <h1>Performance Analytics</h1>
          <p>
            Computed from your own study log, attempts and mock papers — no placeholder numbers. Coverage and mastery are
            reported separately.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn ghost" onClick={exportJson}>
            Export progress report
          </button>
          <button className="btn primary" onClick={() => navigate('/practice')}>
            Fix weak areas
          </button>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Card>
          <span className="stat-label">Syllabus coverage</span>
          <div className="stat-value mono">
            {coverage.percent}
            <small> %</small>
          </div>
          <Bar percent={coverage.percent} />
        </Card>
        <Card>
          <span className="stat-label">Mastery</span>
          <div className="stat-value mono">
            {Math.round((coverage.mastered / Math.max(coverage.total, 1)) * 100)}
            <small> %</small>
          </div>
          <Bar percent={(coverage.mastered / Math.max(coverage.total, 1)) * 100} tone="em" />
        </Card>
        <Card>
          <span className="stat-label">Question accuracy</span>
          <div className="stat-value mono">{dash.attempts.percent}%</div>
          <span className="stat-sub">
            {dash.attempts.correct}/{dash.attempts.attempted} attempts correct
          </span>
        </Card>
        <Card>
          <span className="stat-label">Numerical accuracy</span>
          <div className="stat-value mono">{dash.numerical.percent}%</div>
          <span className="stat-sub">
            {dash.numerical.correct}/{dash.numerical.attempted} numericals
          </span>
        </Card>
      </div>

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Card>
          <span className="stat-label">Study time</span>
          <div className="stat-value mono">
            {Math.floor(totalMinutes / 60)}
            <small> h</small>
          </div>
          <span className="stat-sub">Today {Math.floor(dash.todayMinutes / 60)}h {dash.todayMinutes % 60}m · streak {dash.streak}d</span>
        </Card>
        <Card>
          <span className="stat-label">Average mock score</span>
          <div className="stat-value mono">{dash.avgMockPercent}%</div>
          <span className="stat-sub">{state.mocks.length} papers</span>
        </Card>
        <Card>
          <span className="stat-label">Revision backlog</span>
          <div className="stat-value mono">{dash.revisions.backlog}</div>
          <span className="stat-sub">
            {dash.revisions.due} due today · {dash.revisions.graduated} graduated
          </span>
        </Card>
        <Card>
          <span className="stat-label">Topics attempted</span>
          <div className="stat-value mono">{new Set(state.attempts.map((a) => a.questionId)).size}</div>
          <span className="stat-sub">distinct questions answered</span>
        </Card>
      </div>

      <div className="grid g2" style={{ marginBottom: 14 }}>
        <Card>
          <CardHead title="Subject performance" sub="Coverage % per paper" />
          <BarSeries
            data={dash.subjects.map((s) => ({
              label: SUBJECTS.find((x) => x.id === s.subjectId)?.code ?? s.subjectId,
              value: s.percent,
            }))}
          />
          <div className="table-wrap" style={{ maxHeight: 'none', marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Covered</th>
                  <th>Mastered</th>
                  <th>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {dash.subjects.map((s) => {
                  const p = perSubject.find((x) => x.subjectId === s.subjectId);
                  return (
                    <tr key={s.subjectId}>
                      <td>{SUBJECTS.find((x) => x.id === s.subjectId)?.code}</td>
                      <td className="mono">
                        {s.covered}/{s.totalTopics}
                      </td>
                      <td className="mono">{s.mastered}</td>
                      <td className="mono muted">
                        {p && p.attempted > 0 ? `${Math.round((p.correct / p.attempted) * 100)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHead title="Overall preparation" sub="Coverage, mastery and revision health" />
          <div className="row" style={{ gap: 18, marginBottom: 12 }}>
            <Ring percent={coverage.percent} />
            <div className="col small" style={{ gap: 5, flex: 1 }}>
              <span>
                Covered <b>{coverage.covered}</b> of {coverage.total}
              </span>
              <span>
                Practised <b>{coverage.practised}</b>
              </span>
              <span>
                Mastered <b>{coverage.mastered}</b>
              </span>
              <span className="muted">
                Needs revision <b>{coverage.needsRevision}</b>
              </span>
            </div>
          </div>
          <span className="stat-label">Paper-level mastery</span>
          <div className="col" style={{ gap: 8, marginTop: 6 }}>
            {dash.subjects.map((s) => (
              <div key={s.subjectId}>
                <div className="row between small">
                  <span>{SUBJECTS.find((x) => x.id === s.subjectId)?.name}</span>
                  <span className="mono muted">{s.masteryPercent}%</span>
                </div>
                <Bar percent={s.masteryPercent} tone="em" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid g2" style={{ marginBottom: 14 }}>
        <Card>
          <CardHead title="Weekly study consistency" sub="Minutes per day against your daily target" />
          <WeekBars week={dash.week} target={state.settings.dailyTargetMin} />
        </Card>
        <Card>
          <CardHead title="Accuracy over time" sub="Rolling daily accuracy from graded answers" />
          {dash.accuracySeries.length === 0 ? (
            <Empty>Answer some questions to build this chart.</Empty>
          ) : (
            <LineChart
              series={[{ label: 'Accuracy', points: dash.accuracySeries.map((p) => ({ x: p.date, y: p.percent })) }]}
              height={160}
              labelEvery={Math.max(1, Math.ceil(dash.accuracySeries.length / 6))}
            />
          )}
        </Card>
      </div>

      <div className="grid g2" style={{ marginBottom: 14 }}>
        <Card>
          <CardHead title="Topic mastery heatmap" sub="Percentage of topics MASTERED per unit" />
          <Heatmap rows={heat} />
        </Card>
        <Card>
          <CardHead title="Mock examination progress" sub={`${state.mocks.length} papers · average ${dash.avgMockPercent}%`} />
          {dash.mockTrend.length === 0 ? (
            <Empty>No mock papers submitted yet.</Empty>
          ) : (
            <LineChart
              series={[{ label: 'Mock %', points: dash.mockTrend.map((m) => ({ x: m.label, y: m.percent })), tone: '#5fb08a' }]}
              height={160}
            />
          )}
        </Card>
      </div>

      <div className="grid g2">
        <Card>
          <CardHead title="Weakest topics" sub="Lowest scores from assessments, attempts and revisions" />
          {dash.weakest.length === 0 ? (
            <Empty>No weakness data yet.</Empty>
          ) : (
            dash.weakest.map((w) => (
              <div key={w.topicId} className="item" onClick={() => navigate(`/learn?topic=${w.topicId}`)}>
                <span className="dot warn" />
                <div className="col" style={{ gap: 0, flex: 1 }}>
                  <span className="small">{w.name}</span>
                  <span className="tiny muted">{w.reason}</span>
                </div>
                <span className="mono small">{Math.round(w.score)}</span>
              </div>
            ))
          )}
        </Card>
        <Card>
          <CardHead title="Strongest topics" sub="Highest verified performance" />
          {dash.strongest.length === 0 ? (
            <Empty>Master a topic to populate this list.</Empty>
          ) : (
            dash.strongest.map((w) => (
              <div key={w.topicId} className="item" onClick={() => navigate(`/learn?topic=${w.topicId}`)}>
                <span className="dot em" />
                <div className="col" style={{ gap: 0, flex: 1 }}>
                  <span className="small">{w.name}</span>
                  <span className="tiny muted">{w.reason}</span>
                </div>
                <span className="mono small">{Math.round(w.score)}</span>
              </div>
            ))
          )}
        </Card>
      </div>
    </main>
  );
}
