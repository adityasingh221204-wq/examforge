// EXAMFORGE — My Subjects: four subject modules with unit breakdown.

import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../state/store';
import { SUBJECTS, SUBJECT_MAP } from '../data/syllabus';
import { subjectStats, unitCoverage } from '../engine/progress';
import { diffDays, prettyDateShort, formatClock, todayKey } from '../engine/dates';
import { Bar, Card, CardHead, Ring, StatusBadge } from '../components/ui';
import { dueRevisions } from '../engine/revision';
import { getStatus } from '../engine/progress';

export function Subjects() {
  const { subjectId } = useParams();
  const { state } = useStore();
  const navigate = useNavigate();
  const today = todayKey();
  const due = dueRevisions(state);
  const active = subjectId ? SUBJECT_MAP[subjectId as keyof typeof SUBJECT_MAP] : undefined;

  if (active) {
    const stats = subjectStats(state, active);
    return (
      <main className="page">
        <div className="page-head">
          <div className="col">
            <span className="stat-label">
              {active.code} · {active.credits} credits · Level {active.level} · {active.hours} hours
            </span>
            <h1>{active.name}</h1>
            <p>
              Examination {prettyDateShort(active.examDate)} at {formatClock(active.examStart)} ·{' '}
              {diffDays(today, active.examDate)} days away
            </p>
          </div>
          <div className="page-actions">
            <button className="btn ghost" onClick={() => navigate('/subjects')}>
              ← All subjects
            </button>
            <button className="btn primary" onClick={() => navigate(`/learn?subject=${active.id}`)}>
              Start learning
            </button>
          </div>
        </div>

        <div className="grid g-side" style={{ marginBottom: 14 }}>
          <Card>
            <CardHead title="Units" sub={`${active.units.length} units · ${stats.totalTopics} official topics`} />
            {active.units.map((u) => {
              const cov = unitCoverage(state, u.id);
              return (
                <div key={u.id} style={{ padding: '8px 0', borderBottom: '1px solid #2b2924' }}>
                  <div className="row between" style={{ marginBottom: 4 }}>
                    <div className="col" style={{ gap: 0 }}>
                      <b className="small">
                        Unit {u.order}: {u.name}
                      </b>
                      <span className="tiny muted">
                        {u.topics.length} topics · {u.hours} hours · {cov.covered}/{cov.total} covered
                      </span>
                    </div>
                    <span className="mono small">{Math.round(cov.percent)}%</span>
                  </div>
                  <Bar percent={cov.percent} />
                  <div className="row wrap" style={{ gap: 5, marginTop: 6 }}>
                    {u.topics.map((t) => (
                      <button
                        key={t.id}
                        className="badge"
                        style={{ cursor: 'pointer', border: '1px solid #3a3730', background: '#24231e' }}
                        onClick={() => navigate(`/learn?topic=${t.id}`)}
                        title={t.subtopics.join(' · ')}
                      >
                        {t.name.length > 30 ? `${t.name.slice(0, 29)}…` : t.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </Card>
          <div className="col" style={{ gap: 14 }}>
            <Card>
              <CardHead title="Progress" />
              <div className="row" style={{ gap: 16 }}>
                <Ring percent={stats.percent} />
                <div className="col small" style={{ gap: 4 }}>
                  <span>Covered <b>{stats.covered}</b>/{stats.totalTopics}</span>
                  <span>Practised <b>{stats.practised}</b></span>
                  <span>Mastered <b>{stats.mastered}</b></span>
                  <span className="muted">Needs revision <b>{stats.needsRevision}</b></span>
                </div>
              </div>
            </Card>
            <Card>
              <CardHead title="Course objectives" />
              <ul style={{ margin: 0, paddingLeft: 18, color: '#cfc9bf', fontSize: 12.5 }}>
                {active.objectives.map((o) => (
                  <li key={o} style={{ marginBottom: 4 }}>{o}</li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHead title="Prescribed books" />
              {active.books.map((b) => (
                <div key={b.title} className="col" style={{ gap: 1, marginBottom: 8 }}>
                  <span className="small">{b.title}</span>
                  <span className="tiny muted">
                    {b.author} · {b.publisher}
                  </span>
                </div>
              ))}
            </Card>
          </div>
        </div>

        <Card>
          <CardHead title="Topic audit" sub="Status per official syllabus topic" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Topic</th>
                  <th>Subtopics</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {active.units.flatMap((u) =>
                  u.topics.map((t) => (
                    <tr key={t.id}>
                      <td className="muted">{u.order}</td>
                      <td>{t.name}</td>
                      <td className="muted small">{t.subtopics.join(' · ')}</td>
                      <td>
                        <StatusBadge status={getStatus(state, t.id)} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn sm ghost" onClick={() => navigate(`/learn?topic=${t.id}`)}>
                          Open
                        </button>
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-head">
        <div className="col">
          <h1>My Subjects</h1>
          <p>Four papers, twenty units and 172 official syllabus topics — each with its own content, questions and status.</p>
        </div>
      </div>

      <div className="grid g2">
        {SUBJECTS.map((s) => {
          const stats = subjectStats(state, s);
          const dueCount = due.filter((d) => d.subjectId === s.id).length;
          return (
            <Card key={s.id}>
              <CardHead
                title={`${s.name}`}
                sub={`${s.code} · ${s.credits} credits · exam ${prettyDateShort(s.examDate)} ${formatClock(s.examStart)}`}
                right={<span className="chip">{diffDays(today, s.examDate)}d</span>}
              />
              <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
                <Ring percent={stats.percent} />
                <div className="col small" style={{ gap: 3, flex: 1 }}>
                  <span className="muted">
                    {s.units.length} units · {stats.totalTopics} topics
                  </span>
                  <span>Covered <b>{stats.covered}</b> · mastered <b>{stats.mastered}</b></span>
                  {dueCount > 0 && <span className="badge needs_revision">{dueCount} revisions due</span>}
                  <div className="row wrap" style={{ gap: 4, marginTop: 6 }}>
                    {s.units.map((u) => {
                      const c = unitCoverage(state, u.id);
                      return (
                        <span key={u.id} className="badge" title={`${u.name} — ${Math.round(c.percent)}% covered`}>
                          U{u.order} {Math.round(c.percent)}%
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <button className="btn sm" onClick={() => navigate(`/subjects/${s.id}`)}>
                  Units & audit
                </button>
                <button className="btn sm ghost" onClick={() => navigate(`/learn?subject=${s.id}`)}>
                  Learn
                </button>
                <button className="btn sm ghost" onClick={() => navigate(`/bank?subject=${s.id}`)}>
                  Questions
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
