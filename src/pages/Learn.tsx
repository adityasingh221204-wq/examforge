// EXAMFORGE — Learn: the five-level teaching engine per topic.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../state/store';
import { ALL_TOPICS, SUBJECTS, TOPIC_MAP, unitOf } from '../data/syllabus';
import { CONTENT } from '../data/content';
import { QUESTIONS_BY_TOPIC } from '../data/bank';
import { getStatus, markLearned, setStatus, logStudy } from '../engine/progress';
import { ensureRevision } from '../engine/revision';
import { Bar, Card, CardHead, Empty, StatusBadge } from '../components/ui';
import { Diagram } from '../components/diagram';
import { QuestionView } from '../components/QuestionView';
import type { SubjectId } from '../data/types';

const LEVELS = [
  { id: 1, name: 'Zero level', hint: 'What it is, why it exists, what it solves' },
  { id: 2, name: 'Technical', hint: 'Definition, architecture, components, maths' },
  { id: 3, name: 'Visual', hint: 'Diagrams, flows, comparison tables, formulas' },
  { id: 4, name: 'Practical', hint: 'Examples, industry use, code, numericals' },
  { id: 5, name: 'Exam readiness', hint: 'Definitions, questions, answer structures' },
];

export function Learn() {
  const [params, setParams] = useSearchParams();
  const { state, set, notify } = useStore();
  const navigate = useNavigate();
  const [level, setLevel] = useState(1);
  const [filter, setFilter] = useState('');

  const subjectId = (params.get('subject') as SubjectId | null) ?? null;
  const topicId = params.get('topic') ?? null;

  const firstTopic = useMemo(() => {
    if (topicId && TOPIC_MAP[topicId]) return topicId;
    const pool = subjectId ? ALL_TOPICS.filter((t) => t.subjectId === subjectId) : ALL_TOPICS;
    const uncovered = pool.find((t) => getStatus(state, t.id) === 'not_started');
    return (uncovered ?? pool[0])?.id ?? ALL_TOPICS[0].id;
  }, [topicId, subjectId, state]);

  useEffect(() => {
    if (!topicId) setParams({ topic: firstTopic }, { replace: true });
  }, [topicId, firstTopic, setParams]);

  const topic = TOPIC_MAP[firstTopic];
  const content = CONTENT[firstTopic];
  const unit = topic ? unitOf(topic.unitId) : undefined;
  const subject = topic ? SUBJECTS.find((s) => s.id === topic.subjectId) : undefined;
  const status = topic ? getStatus(state, topic.id) : 'not_started';
  const questions = QUESTIONS_BY_TOPIC[firstTopic] ?? [];

  const subjectTopics = ALL_TOPICS.filter((t) => t.subjectId === topic?.subjectId).filter((t) =>
    filter ? t.name.toLowerCase().includes(filter.toLowerCase()) : true,
  );

  if (!topic) {
    return (
      <main className="page">
        <Empty>Topic not found.</Empty>
      </main>
    );
  }

  const pick = (id: string) => {
    setLevel(1);
    setParams({ topic: id }, { replace: true });
  };

  const study = () => {
    set((cur) => {
      let next = markLearned(cur, [topic.id]);
      next = ensureRevision(next, topic.id);
      next = logStudy(next, topic.id, 20);
      return next;
    });
    notify(`Marked "${topic.name}" as LEARNED and scheduled spaced revision (1, 3, 7, 14, 30 days).`);
  };

  return (
    <main className="page">
      <div className="page-head">
        <div className="col">
          <span className="stat-label">
            {subject?.code} · Unit {unit?.order}: {unit?.name}
          </span>
          <h1>{topic.name}</h1>
          <p>{topic.subtopics.join(' · ')}</p>
        </div>
        <div className="page-actions">
          <StatusBadge status={status} />
          <button className="btn ghost" onClick={() => navigate(`/bank?topic=${topic.id}`)}>
            Questions ({questions.length})
          </button>
          <button className="btn primary" onClick={study}>
            Mark learned + schedule revision
          </button>
        </div>
      </div>

      <div className="grid split">
        <Card className="card" >
          <CardHead title="Syllabus" sub={`${subject?.units.length} units`} />
          <input
            type="text"
            placeholder="Filter topics…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ marginBottom: 10 }}
            aria-label="Filter topics"
          />
          <div style={{ maxHeight: 620, overflow: 'auto' }}>
            {subject?.units.map((u) => (
              <div key={u.id} style={{ marginBottom: 10 }}>
                <div className="stat-label" style={{ fontSize: 9.5, marginBottom: 3 }}>
                  U{u.order} · {u.name}
                </div>
                {u.topics
                  .filter((t) => subjectTopics.some((st) => st.id === t.id))
                  .map((t) => {
                    const st = getStatus(state, t.id);
                    return (
                      <button
                        key={t.id}
                        className={`level-btn ${t.id === topic.id ? 'on' : ''}`}
                        style={{ width: '100%' }}
                        onClick={() => pick(t.id)}
                      >
                        <span
                          className={`dot ${st === 'mastered' ? 'em' : st === 'needs_revision' ? 'warn' : ''}`}
                          style={{ marginTop: 6 }}
                        />
                        <span style={{ flex: 1 }}>{t.name}</span>
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </Card>

        <div className="col" style={{ gap: 14 }}>
          <Card>
            <CardHead
              title="Learning objectives"
              sub="Verified against the official syllabus topic"
              right={
                <select
                  value={status}
                  onChange={(e) => {
                    const next = e.target.value as typeof status;
                    if (next === 'mastered' && status !== 'mastered') {
                      notify('Mastery must be earned in Practice Tests — take the topic assessment.');
                      return;
                    }
                    set((cur) => setStatus(cur, topic.id, next));
                  }}
                  aria-label="Change topic status"
                  style={{ width: 160 }}
                >
                  <option value="not_started">NOT STARTED</option>
                  <option value="in_progress">IN PROGRESS</option>
                  <option value="learned">LEARNED</option>
                  <option value="practised">PRACTISED</option>
                  <option value="needs_revision">NEEDS REVISION</option>
                  {status === 'mastered' && <option value="mastered">MASTERED</option>}
                </select>
              }
            />
            <ul style={{ margin: 0, paddingLeft: 18, color: '#cfc9bf', fontSize: 12.5 }}>
              {content?.objectives.map((o) => (
                <li key={o} style={{ marginBottom: 3 }}>{o}</li>
              ))}
            </ul>
          </Card>

          <div className="grid split-wide">
            <Card>
              <div className="level-nav">
                {LEVELS.map((l) => (
                  <button key={l.id} className={`level-btn ${level === l.id ? 'on' : ''}`} onClick={() => setLevel(l.id)}>
                    <span className="level-num">{l.id}</span>
                    <span className="col" style={{ gap: 0 }}>
                      <span>{l.name}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="divider" />
              <div className="tiny muted">Five levels, never skipped: fundamentals → technical → visual → practical → exam.</div>
            </Card>

            <Card>
              {!content ? (
                <Empty>No content authored for this topic.</Empty>
              ) : (
                <div className="prose">
                  <div className="row between" style={{ marginBottom: 10 }}>
                    <h2>
                      Level {level} · {LEVELS[level - 1].name}
                    </h2>
                    <span className="tiny muted">{LEVELS[level - 1].hint}</span>
                  </div>

                  {level === 1 && (
                    <>
                      <h4>What it is</h4>
                      <p>{content.zero.what}</p>
                      <h4>Why it exists</h4>
                      <p>{content.zero.why}</p>
                      <h4>The problem it solves</h4>
                      <p>{content.zero.problem}</p>
                      <h4>How it works</h4>
                      <p>{content.zero.how}</p>
                      <h4>Where it is used</h4>
                      <p>{content.zero.where}</p>
                    </>
                  )}

                  {level === 2 && (
                    <>
                      <h4>Technical definition</h4>
                      <p>{content.tech.definition}</p>
                      <h4>Internal architecture / mechanism</h4>
                      <p>{content.tech.architecture}</p>
                      <h4>Important components</h4>
                      <ul>
                        {content.tech.components.map((cpt) => (
                          <li key={cpt}>{cpt}</li>
                        ))}
                      </ul>
                      <h4>Advantages</h4>
                      <ul>
                        {content.tech.advantages.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                      <h4>Disadvantages &amp; limitations</h4>
                      <ul>
                        {[...content.tech.disadvantages, ...(content.tech.limitations ?? [])].map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                      {content.formulas && content.formulas.length > 0 && (
                        <>
                          <h4>Mathematical foundations</h4>
                          {content.formulas.map((f) => (
                            <div key={f.name} className="formula">
                              {f.expr}
                              <small>
                                {f.name} — {f.when}
                              </small>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}

                  {level === 3 && (
                    <>
                      {content.diagram ? (
                        <Diagram spec={content.diagram} />
                      ) : (
                        <Empty>This topic is diagram-free; its visual level is the comparison table below.</Empty>
                      )}
                      {content.comparison && (
                        <>
                          <h4>{content.comparison.title}</h4>
                          <div className="table-wrap" style={{ maxHeight: 'none', marginBottom: 10 }}>
                            <table>
                              <thead>
                                <tr>
                                  <th>Item</th>
                                  {content.comparison.columns.map((c) => (
                                    <th key={c}>{c}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {content.comparison.rows.map((r) => (
                                  <tr key={r.label}>
                                    <td style={{ fontWeight: 600, color: '#f4f0e8' }}>{r.label}</td>
                                    {r.cells.map((cell, i) => (
                                      <td key={`${r.label}-${i}`} className="muted">
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                      {content.formulas && content.formulas.length > 0 && (
                        <>
                          <h4>Formulas</h4>
                          {content.formulas.map((f) => (
                            <div key={f.name} className="formula">
                              {f.expr}
                              <small>
                                {f.name} — {f.when}
                              </small>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}

                  {level === 4 && (
                    <>
                      <h4>Real-world examples</h4>
                      <ul>
                        {content.examples.map((e) => (
                          <li key={e}>{e}</li>
                        ))}
                      </ul>
                      <h4>Industry applications</h4>
                      <ul>
                        {content.applications.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                      {content.code && (
                        <>
                          <h4>{content.code.title}</h4>
                          <pre>{content.code.snippet}</pre>
                        </>
                      )}
                      <button className="btn sm ghost" onClick={() => navigate(`/lab?subject=${topic.subjectId}`)}>
                        Practise related numericals →
                      </button>
                    </>
                  )}

                  {level === 5 && (
                    <>
                      <h4>Important definitions</h4>
                      <dl className="kv">
                        {content.definitions.map((d) => (
                          <div key={d.term} style={{ display: 'contents' }}>
                            <dt>{d.term}</dt>
                            <dd>{d.def}</dd>
                          </div>
                        ))}
                      </dl>
                      <h4>Examination questions for this topic</h4>
                      <div className="row wrap" style={{ gap: 6, marginBottom: 10 }}>
                        {[3, 4, 5].map((m) => (
                          <span key={m} className="badge lav">
                            {questions.filter((q) => q.marks === m).length} × {m}-mark
                          </span>
                        ))}
                        <span className="badge">{questions.length} total</span>
                      </div>
                      {questions.slice(0, 2).map((q, i) => (
                        <QuestionView key={q.id} question={q} index={i} />
                      ))}
                      <button className="btn primary sm" onClick={() => navigate(`/practice?topic=${topic.id}`)}>
                        Take the topic assessment (needed for MASTERED)
                      </button>
                    </>
                  )}
                </div>
              )}
            </Card>
          </div>

          <Card>
            <CardHead title="Level coverage" sub="How much of this topic you have marked" />
            <Bar percent={status === 'not_started' ? 0 : status === 'in_progress' ? 20 : status === 'learned' ? 55 : status === 'practised' ? 75 : status === 'mastered' ? 100 : 40} tone="em" />
            <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
              {[1, 2, 3, 4, 5].map((l) => (
                <button key={l} className={`btn sm ${level === l ? 'primary' : 'ghost'}`} onClick={() => setLevel(l)}>
                  Level {l}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
