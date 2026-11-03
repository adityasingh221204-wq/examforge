// EXAMFORGE — Numerical Solving Lab: given → required → formula → why → substitution → answer → mistakes.

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../state/store';
import { NUMERICALS } from '../data/bank';
import { SUBJECTS, TOPIC_MAP } from '../data/syllabus';
import type { NumericalSpec, SubjectId } from '../data/types';
import { Card, CardHead, Empty } from '../components/ui';

function renderProblem(spec: NumericalSpec, values: Record<string, number>): string {
  return spec.problemTemplate.replace(/\{(\w+)\}/g, (_, key: string) => {
    const param = spec.params.find((p) => p.name === key);
    const v = values[key];
    return param ? String(Number(v.toFixed(param.decimals ?? 0))) : key;
  });
}

export function Lab() {
  const { set, notify } = useStore();
  const [params] = useSearchParams();
  const initialSubject = (params.get('subject') as SubjectId) ?? 'dl';
  const [subject, setSubject] = useState<SubjectId>(initialSubject);
  const [specId, setSpecId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});
  const [showSolution, setShowSolution] = useState(false);
  const [practised, setPractised] = useState(0);

  const specs = useMemo(() => NUMERICALS.filter((n) => n.subjectId === subject), [subject]);
  const spec = specs.find((s) => s.id === specId) ?? null;

  const start = (s: NumericalSpec) => {
    setSpecId(s.id);
    setValues(Object.fromEntries(s.params.map((p) => [p.name, p.value])));
    setShowSolution(false);
  };

  const randomise = (s: NumericalSpec) => {
    const next: Record<string, number> = {};
    for (const p of s.params) {
      const [lo, hi] = p.range;
      const raw = lo + Math.random() * (hi - lo);
      next[p.name] = p.decimals && p.decimals > 0 ? Number(raw.toFixed(p.decimals)) : Math.round(raw);
    }
    setValues(next);
    setShowSolution(false);
    setPractised((n) => n + 1);
  };

  const solved = spec && showSolution ? spec.solve(values) : null;

  return (
    <main className="page">
      <div className="page-head">
        <div className="col">
          <h1>Numerical Solving Lab</h1>
          <p>
            {NUMERICALS.length} worked numericals with full method: given values, required values, formula, why it applies,
            substitution, step-by-step working, final answer and the mistakes examiners penalise.
          </p>
        </div>
        <div className="page-actions">
          <span className="chip">
            Practice sets generated <b>{practised}</b>
          </span>
        </div>
      </div>

      <div className="grid split">
        <Card>
          <CardHead title="Problems" sub={`${specs.length} in ${SUBJECTS.find((s) => s.id === subject)?.code}`} />
          <div className="row wrap" style={{ gap: 4, marginBottom: 10 }}>
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                className={`btn sm ${subject === s.id ? 'primary' : 'ghost'}`}
                onClick={() => {
                  setSubject(s.id);
                  setSpecId(null);
                  setShowSolution(false);
                }}
              >
                {s.code}
              </button>
            ))}
          </div>
          <div style={{ maxHeight: 560, overflow: 'auto' }}>
            {specs.map((s) => (
              <button
                key={s.id}
                className={`level-btn ${s.id === specId ? 'on' : ''}`}
                style={{ width: '100%' }}
                onClick={() => start(s)}
              >
                <span className="level-num">∑</span>
                <span className="col" style={{ gap: 0 }}>
                  <span>{s.category}</span>
                  <span className="tiny muted">{TOPIC_MAP[s.topicId]?.name}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>

        <div className="col" style={{ gap: 14 }}>
          {!spec ? (
            <Card>
              <Empty>Select a numerical from the list to see the worked solution.</Empty>
            </Card>
          ) : (
            <>
              <Card>
                <CardHead
                  title={spec.category}
                  sub={`${SUBJECTS.find((s) => s.id === spec.subjectId)?.code} · ${TOPIC_MAP[spec.topicId]?.name}`}
                  right={
                    <div className="row" style={{ gap: 6 }}>
                      <button className="btn sm ghost" onClick={() => randomise(spec)}>
                        New values (practice)
                      </button>
                      <button className="btn sm primary" onClick={() => {
                        setShowSolution(true);
                        set((cur) => ({
                          ...cur,
                          attempts: [
                            ...cur.attempts,
                            {
                              id: `n_${Date.now()}`,
                              questionId: `numeric:${spec.id}`,
                              at: Date.now(),
                              source: 'practice',
                              correct: true,
                              score: 5,
                              maxScore: 5,
                            },
                          ],
                        }));
                        notify('Solution revealed and logged as a numerical practice attempt.');
                      }}>
                        Solve step by step
                      </button>
                    </div>
                  }
                />

                <p style={{ fontSize: 13.5, color: '#f4f0e8', marginBottom: 12 }}>{renderProblem(spec, values)}</p>

                <div className="grid g2" style={{ marginBottom: 12 }}>
                  <div>
                    <span className="stat-label">Given</span>
                    <div className="col" style={{ gap: 2, marginTop: 4 }}>
                      {spec.params.map((p) => (
                        <div key={p.name} className="row between small">
                          <span className="muted">{p.label}</span>
                          <b className="mono">
                            {values[p.name]} {p.unit}
                          </b>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="stat-label">Required</span>
                    <ul className="small" style={{ margin: '4px 0 0', paddingLeft: 18, color: '#cfc9bf' }}>
                      {spec.required.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="formula">
                  {spec.formula}
                  <small>Why this formula applies: {spec.why}</small>
                </div>

                <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
                  {spec.params.map((p) => (
                    <label key={p.name} className="tiny muted" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {p.name}
                      <input
                        type="number"
                        value={values[p.name]}
                        step={p.decimals ? 1 / 10 ** p.decimals : 1}
                        onChange={(e) => {
                          setValues((v) => ({ ...v, [p.name]: Number(e.target.value) }));
                          setShowSolution(false);
                        }}
                        style={{ width: 92 }}
                        aria-label={p.label}
                      />
                    </label>
                  ))}
                </div>
              </Card>

              {solved && (
                <Card>
                  <CardHead title="Step-by-step solution" sub="Substitution → working → final answer" />
                  <ol style={{ margin: 0, paddingLeft: 18 }}>
                    {solved.steps.map((s) => (
                      <li key={s.title} style={{ marginBottom: 8 }}>
                        <span className="small" style={{ color: '#f4f0e8', fontWeight: 600 }}>{s.title}</span>
                        <div className="formula" style={{ margin: '4px 0 0' }}>
                          {s.expr}
                          {s.note && <small>{s.note}</small>}
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="row between" style={{ marginTop: 12, padding: '10px 12px', border: '1px solid #3f5c46', borderRadius: 10, background: '#22302a' }}>
                    <span className="stat-label">Final answer</span>
                    <b className="mono" style={{ color: '#9be2b8' }}>{solved.answer}</b>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <span className="stat-label">Common mistakes</span>
                    <ul className="small muted" style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                      {spec.mistakes.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
