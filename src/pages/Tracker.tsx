// EXAMFORGE — Syllabus Tracker / audit page.
// Subject | Unit | Topic | Subtopics | Status, plus the per-topic completeness report.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../state/store';
import { ALL_TOPICS, SUBJECTS, SUBJECT_MAP, unitOf } from '../data/syllabus';
import { CONTENT } from '../data/content';
import { QUESTIONS_BY_TOPIC } from '../data/bank';
import { getStatus, overallCoverage, setStatus } from '../engine/progress';
import { STATUS_LABELS, STATUS_ORDER, type SubjectId, type TopicStatus } from '../data/types';
import { Bar, Card, CardHead, StatusBadge, Tabs } from '../components/ui';

const CHECKLIST = ['theory', 'explanation', 'example', 'diagram', 'application', 'q3', 'q4', 'q5', 'assessment', 'revision'] as const;

export function Tracker() {
  const { state, set, notify } = useStore();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<'all' | SubjectId>('all');
  const [status, setStatusFilter] = useState<'all' | TopicStatus>('all');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'audit' | 'qa'>('audit');

  const coverage = overallCoverage(state);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_TOPICS.filter((t) => {
      if (subject !== 'all' && t.subjectId !== subject) return false;
      if (status !== 'all' && getStatus(state, t.id) !== status) return false;
      if (q && !(`${t.name} ${t.subtopics.join(' ')}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [subject, status, query, state]);

  const qa = useMemo(
    () =>
      ALL_TOPICS.map((t) => {
        const c = CONTENT[t.id];
        const qs = QUESTIONS_BY_TOPIC[t.id] ?? [];
        return {
          topic: t,
          checks: {
            theory: Boolean(c?.tech.architecture && c?.tech.components.length),
            explanation: Boolean(c?.zero.what && c?.zero.how && c?.zero.why),
            example: Boolean(c?.examples.length),
            diagram: Boolean(c?.diagram || c?.comparison),
            application: Boolean(c?.applications.length),
            q3: qs.some((q) => q.marks === 3),
            q4: qs.some((q) => q.marks === 4),
            q5: qs.some((q) => q.marks === 5),
            assessment: qs.length >= 4,
            revision: Boolean(getStatus(state, t.id) !== 'not_started' || state.sessions.some((s) => s.topicIds.includes(t.id))),
          } as Record<(typeof CHECKLIST)[number], boolean>,
        };
      }),
    [state],
  );

  const totals = CHECKLIST.reduce((acc, k) => {
    acc[k] = qa.filter((r) => r.checks[k]).length;
    return acc;
  }, {} as Record<string, number>);

  const contentComplete = qa.filter((r) => r.checks.theory && r.checks.explanation && r.checks.example && r.checks.q3 && r.checks.q4 && r.checks.q5).length;

  return (
    <main className="page">
      <div className="page-head">
        <div className="col">
          <h1>Syllabus Tracker</h1>
          <p>
            Every official topic with its own status. MASTERED is only granted after an independent assessment scores at least{' '}
            {state.settings.passPercent}%.
          </p>
        </div>
        <div className="page-actions">
          <Tabs
            options={[
              { id: 'audit', label: 'Audit table' },
              { id: 'qa', label: 'Completeness report' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Card>
          <span className="stat-label">Covered</span>
          <div className="stat-value mono">
            {coverage.covered}
            <small> / {coverage.total}</small>
          </div>
          <Bar percent={coverage.percent} />
        </Card>
        <Card>
          <span className="stat-label">Mastered</span>
          <div className="stat-value mono">
            {coverage.mastered}
            <small> topics</small>
          </div>
          <Bar percent={(coverage.mastered / Math.max(coverage.total, 1)) * 100} tone="em" />
        </Card>
        <Card>
          <span className="stat-label">Needs revision</span>
          <div className="stat-value mono">{coverage.needsRevision}</div>
          <span className="stat-sub">Flagged by wrong answers or failed assessments</span>
        </Card>
        <Card>
          <span className="stat-label">Content complete</span>
          <div className="stat-value mono">
            {contentComplete}
            <small> / {ALL_TOPICS.length}</small>
          </div>
          <span className="stat-sub">Theory, explanation, example + 3/4/5-mark questions</span>
        </Card>
      </div>

      {tab === 'audit' ? (
        <Card>
          <CardHead
            title="Subject · Unit · Topic · Subtopics · Status"
            sub={`${rows.length} rows`}
            right={
              <div className="row" style={{ gap: 8 }}>
                <input
                  type="text"
                  placeholder="Filter topics…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{ width: 180 }}
                  aria-label="Filter topics"
                />
                <select value={subject} onChange={(e) => setSubject(e.target.value as 'all' | SubjectId)} aria-label="Filter subject">
                  <option value="all">All subjects</option>
                  {SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code}
                    </option>
                  ))}
                </select>
                <select
                  value={status}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | TopicStatus)}
                  aria-label="Filter status"
                >
                  <option value="all">Any status</option>
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            }
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Unit</th>
                  <th>Topic</th>
                  <th>Subtopics</th>
                  <th>Status</th>
                  <th>Set status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const unit = unitOf(t.unitId);
                  const cur = getStatus(state, t.id);
                  return (
                    <tr key={t.id}>
                      <td className="muted">{SUBJECT_MAP[t.subjectId].code}</td>
                      <td className="muted small">
                        U{unit?.order} {unit?.name}
                      </td>
                      <td>
                        <button
                          className="btn sm ghost"
                          style={{ padding: 0, border: 0, background: 'none', color: '#f4f0e8', textAlign: 'left' }}
                          onClick={() => navigate(`/learn?topic=${t.id}`)}
                        >
                          {t.name}
                        </button>
                      </td>
                      <td className="muted small">{t.subtopics.join(' · ')}</td>
                      <td>
                        <StatusBadge status={cur} />
                      </td>
                      <td>
                        <select
                          value={cur}
                          onChange={(e) => {
                            const next = e.target.value as TopicStatus;
                            if (next === 'mastered' && cur !== 'mastered') {
                              notify('MASTERED requires passing an independent assessment in Practice Tests.');
                              return;
                            }
                            set((s) => setStatus(s, t.id, next));
                          }}
                          aria-label={`Status for ${t.name}`}
                          style={{ minWidth: 140 }}
                        >
                          {STATUS_ORDER.filter((s) => s !== 'mastered' || cur === 'mastered').map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHead
            title="Syllabus completeness report"
            sub="Per-topic checklist. “Revision material” is true once a topic is scheduled, studied or assessed."
          />
          <div className="grid g3" style={{ marginBottom: 12 }}>
            {CHECKLIST.map((k) => (
              <div key={k} className="row between small">
                <span className="muted">{k}</span>
                <b className="mono">
                  {totals[k]}/{ALL_TOPICS.length}
                </b>
              </div>
            ))}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Topic</th>
                  {CHECKLIST.map((k) => (
                    <th key={k}>{k === 'q3' ? '3M' : k === 'q4' ? '4M' : k === 'q5' ? '5M' : k.slice(0, 4)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {qa.map(({ topic, checks }) => (
                  <tr key={topic.id}>
                    <td className="muted">{SUBJECT_MAP[topic.subjectId].code}</td>
                    <td>{topic.name}</td>
                    {CHECKLIST.map((k) => (
                      <td key={k} style={{ color: checks[k] ? '#5fb08a' : '#d5796c' }}>
                        {checks[k] ? '✓' : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </main>
  );
}
