// EXAMFORGE — Deep Learning Answer Master.
// A question bank of the uploaded 239 questions (234 numbered + 5 standalone numericals),
// exam-structured answers built from the authored DL material, verified numerical solutions
// and a free-form "ask any question" solver.

import { useMemo, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { AM_BY_ID, AM_QUESTIONS, DL_UNITS, FORMAT_LABELS, unitLabel } from '../data/answerMaster';
import type { AMQuestion, AnswerProgress, AnswerSection, GeneratedAnswer } from '../data/answerMaster/types';
import { answerFor, answerStats, refine, solveFreeform } from '../engine/answerMaster';
import { Bar, Card, CardHead, Empty, Tabs } from '../components/ui';
import { prettyDate } from '../engine/dates';

const STATUS_LABEL: Record<string, string> = {
  unanswered: 'UNANSWERED',
  generated: 'GENERATED',
  checked: 'CHECKED',
  needs_correction: 'NEEDS CORRECTION',
};

const STATUS_TONE: Record<string, string> = {
  unanswered: 'not_started',
  generated: 'in_progress',
  checked: 'mastered',
  needs_correction: 'needs_revision',
};

function plainAnswer(a: GeneratedAnswer, q: AMQuestion): string {
  const out: string[] = [`Q${q.number}. ${q.text}`, `${FORMAT_LABELS[a.format]} · suggested ${a.marks} marks`, ''];
  for (const s of a.sections) {
    out.push(s.heading, '');
    if (s.body) out.push(s.body, '');
    if (s.bullets?.length) out.push(...s.bullets.map((b) => `• ${b}`), '');
    if (s.formula) out.push(`Formula: ${s.formula}`, '');
    if (s.diagram) out.push(s.diagram, '');
    if (s.table) {
      out.push(s.table.columns.join(' | '));
      out.push(...s.table.rows.map((r) => r.join(' | ')));
      out.push('');
    }
    if (s.note) out.push(s.note, '');
  }
  if (a.assumptions.length) out.push('Assumptions:', ...a.assumptions.map((x) => `- ${x}`), '');
  if (a.missing?.length) out.push('Missing information:', ...a.missing.map((x) => `- ${x}`), '');
  return out.join('\n');
}

export function AnswerMaster() {
  const { state, set, notify } = useStore();
  const [tab, setTab] = useState<'bank' | 'ask'>('bank');
  const [unit, setUnit] = useState<string>('all');
  const [format, setFormat] = useState<string>('all');
  const [marks, setMarks] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(AM_QUESTIONS[0].id);
  const [detail, setDetail] = useState<'auto' | 'brief' | 'standard' | 'detailed'>('auto');
  const [emphasis, setEmphasis] = useState<'example' | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const stats = answerStats(state);

  const progressFor = (id: string): AnswerProgress => state.answers?.[id] ?? { status: 'unanswered' };
  const patch = (id: string, p: Partial<AnswerProgress>) =>
    set((cur) => ({
      ...cur,
      answers: {
        ...cur.answers,
        [id]: { ...(cur.answers?.[id] ?? { status: 'unanswered' }), ...p },
      },
    }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AM_QUESTIONS.filter((x) => {
      if (unit !== 'all' && x.unitId !== unit) return false;
      if (format !== 'all' && x.format !== format) return false;
      if (marks !== 'all' && String(x.marks) !== marks) return false;
      if (status !== 'all' && progressFor(x.id).status !== status) return false;
      if (!q) return true;
      return (
        x.text.toLowerCase().includes(q) ||
        x.number.toLowerCase() === q.replace(/^q/, '') ||
        (AM_BY_ID[x.id] && unitLabel(x.unitId).toLowerCase().includes(q))
      );
    });
  }, [unit, format, marks, status, query, state.answers]);

  const question = AM_BY_ID[selectedId] ?? AM_QUESTIONS[0];
  const progress = progressFor(question.id);
  const answer = useMemo(
    () => answerFor(question, { detail: detail === 'auto' ? undefined : detail, emphasis }),
    [question, detail, emphasis],
  );
  const allPass = answer.verification.every((v) => v.pass);

  const generate = (q: AMQuestion = question) => {
    patch(q.id, {
      status: 'generated',
      generatedAt: Date.now(),
      views: (progressFor(q.id).views ?? 0) + 1,
    });
    notify(`Answer generated for Q${q.number}. Mark it checked only after reviewing it.`);
  };

  const generateAll = () => {
    set((cur) => {
      const answers = { ...cur.answers };
      for (const q of AM_QUESTIONS) {
        if (!answers[q.id] || answers[q.id].status === 'unanswered') {
          answers[q.id] = { ...(answers[q.id] ?? { status: 'unanswered' }), status: 'generated', generatedAt: Date.now() };
        }
      }
      return { ...cur, answers };
    });
    notify('All 239 answers generated. None is marked checked or revised.');
  };

  const check = () => {
    if (!allPass) {
      patch(question.id, { status: 'needs_correction', checkedAt: Date.now() });
      notify('Verification found an item to fix — answer marked needs correction.');
      return;
    }
    patch(question.id, { status: 'checked', checkedAt: Date.now() });
    notify('Verification passed. Answer marked checked.');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plainAnswer(answer, question));
      notify('Answer copied as plain text.');
    } catch {
      notify('Clipboard blocked by the browser — select the text manually.');
    }
  };

  const toggleSection = (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  const collapseAll = (open: boolean) =>
    setCollapsed((c) => {
      const next = { ...c };
      answer.sections.forEach((_, i) => {
        next[`${question.id}:${i}`] = !open;
      });
      return next;
    });

  return (
    <main className="page answers-page">
      <div className="page-head">
        <div className="col">
          <h1>Deep Learning Answer Master</h1>
          <p>
            {stats.total} questions from your uploaded bank ({stats.numbered} numbered + {stats.standalone} standalone
            numerical problems), answered from the authored DL material and computed numerical solutions. Marking an
            answer checked never happens automatically.
          </p>
        </div>
        <div className="page-actions">
          <Tabs
            options={[
              { id: 'bank', label: `Question bank (${stats.total})` },
              { id: 'ask', label: 'Ask any question' },
            ]}
            value={tab}
            onChange={(v) => setTab(v as 'bank' | 'ask')}
          />
          <button className="btn" onClick={generateAll}>
            Generate all answers
          </button>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Card>
          <span className="stat-label">Answered</span>
          <div className="stat-value mono">
            {stats.answered}
            <small>/{stats.total}</small>
          </div>
          <div style={{ marginTop: 8 }}>
            <Bar percent={(stats.answered / stats.total) * 100} tone="em" />
          </div>
        </Card>
        <Card>
          <span className="stat-label">Checked</span>
          <div className="stat-value mono">
            {stats.checked}
            <small>/{stats.total}</small>
          </div>
          <span className="stat-sub">Verification passed after review</span>
        </Card>
        <Card>
          <span className="stat-label">Revised</span>
          <div className="stat-value mono">{stats.revised}</div>
          <span className="stat-sub">Counted only when you mark it revised</span>
        </Card>
        <Card>
          <span className="stat-label">Needs correction</span>
          <div className="stat-value mono">{stats.needsCorrection}</div>
          <span className="stat-sub">Numerical {stats.numerical.answered}/{stats.numerical.total} · theory {stats.theory.answered}/{stats.theory.total}</span>
        </Card>
      </div>

      {tab === 'ask' ? (
        <AskAnyQuestion onCopy={copy} />
      ) : (
        <div className="grid g-side">
          <div className="col" style={{ gap: 14 }}>
            <Card>
              <CardHead
                title="Questions, unit by unit"
                sub={`${filtered.length} shown · original numbering preserved`}
                right={
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn sm ghost" onClick={() => collapseAll(true)}>
                      Collapse answer
                    </button>
                    <button className="btn sm ghost" onClick={() => collapseAll(false)}>
                      Expand answer
                    </button>
                  </div>
                }
              />
              <div className="row wrap" style={{ gap: 6, marginBottom: 10 }}>
                <button className={`btn sm ${unit === 'all' ? 'primary' : 'ghost'}`} onClick={() => setUnit('all')}>
                  All units
                </button>
                {DL_UNITS.map((u) => (
                  <button
                    key={u.id}
                    className={`btn sm ${unit === u.id ? 'primary' : 'ghost'}`}
                    onClick={() => setUnit(u.id)}
                  >
                    U{u.order}
                  </button>
                ))}
              </div>
              <div className="row wrap" style={{ gap: 8, marginBottom: 10 }}>
                <input
                  placeholder="Search questions or Q-number…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{ flex: '1 1 220px', minWidth: 180, width: 'auto' }}
                  aria-label="Search questions"
                />
                <select value={format} onChange={(e) => setFormat(e.target.value)} aria-label="Filter by type" style={{ width: 'auto', maxWidth: 190 }}>
                  <option value="all">All types</option>
                  {Object.entries(FORMAT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select value={marks} onChange={(e) => setMarks(e.target.value)} aria-label="Filter by marks" style={{ width: 'auto', maxWidth: 140 }}>
                  <option value="all">All marks</option>
                  {[2, 3, 5, 8, 10].map((m) => (
                    <option key={m} value={String(m)}>
                      {m} marks
                    </option>
                  ))}
                </select>
                <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" style={{ width: 'auto', maxWidth: 170 }}>
                  <option value="all">All statuses</option>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col" style={{ gap: 4, maxHeight: 520, overflow: 'auto' }}>
                {filtered.length === 0 && <Empty>No question matches these filters.</Empty>}
                {filtered.map((x) => {
                  const p = progressFor(x.id);
                  const active = x.id === question.id;
                  return (
                    <button
                      key={x.id}
                      onClick={() => setSelectedId(x.id)}
                      className="item"
                      style={{
                        textAlign: 'left',
                        border: active ? '1px solid #6d5fa8' : '1px solid transparent',
                        background: active ? 'rgba(125, 105, 190, 0.12)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <b className="mono tiny" style={{ minWidth: 34 }}>
                        {x.number}
                      </b>
                      <div className="col" style={{ gap: 2, flex: 1 }}>
                        <span className="small">{x.text.length > 110 ? `${x.text.slice(0, 110)}…` : x.text}</span>
                        <span className="tiny muted">
                          {FORMAT_LABELS[x.format]} · {x.marks} marks · {unitLabel(x.unitId).slice(0, 24)}
                        </span>
                      </div>
                      <span className="col" style={{ gap: 3, alignItems: 'flex-end' }}>
                        <span className={`badge ${STATUS_TONE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                        {p.revised && <span className="badge learned">revised</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card>
              <CardHead
                title={`Q${question.number} · ${FORMAT_LABELS[question.format]}`}
                sub={`${unitLabel(question.unitId)} · suggested ${question.marks} marks · difficulty ${question.difficulty}/5`}
                right={
                  <span className={`badge ${STATUS_TONE[progress.status]}`}>{STATUS_LABEL[progress.status]}</span>
                }
              />
              <p className="small" style={{ color: '#ded8cc', marginTop: 0 }}>
                {question.text}
              </p>
              <div className="row wrap" style={{ gap: 6, marginBottom: 10 }}>
                <button className="btn sm primary" onClick={() => generate()}>
                  {progress.status === 'unanswered' ? 'Generate answer' : 'Regenerate answer'}
                </button>
                <button className="btn sm" onClick={check}>
                  Mark checked
                </button>
                <button className="btn sm ghost" onClick={() => patch(question.id, { revised: !progress.revised, revisedAt: Date.now() })}>
                  {progress.revised ? 'Revised ✓' : 'Mark revised'}
                </button>
                <button className="btn sm ghost" onClick={() => patch(question.id, { important: !progress.important })}>
                  {progress.important ? 'Important ★' : 'Mark important'}
                </button>
                <button className="btn sm ghost" onClick={() => patch(question.id, { difficult: !progress.difficult })}>
                  {progress.difficult ? 'Difficult ✓' : 'Mark difficult'}
                </button>
                <button className="btn sm ghost" onClick={() => patch(question.id, { favourite: !progress.favourite })}>
                  {progress.favourite ? 'Favourite ♥' : 'Favourite'}
                </button>
                <button className="btn sm ghost" onClick={copy}>
                  Copy
                </button>
                <button
                  className="btn sm ghost"
                  onClick={() => patch(question.id, { status: 'needs_correction', checkedAt: Date.now() })}
                >
                  Needs correction
                </button>
              </div>
              <div className="row wrap" style={{ gap: 6, marginBottom: 12 }}>
                <span className="tiny muted">Depth:</span>
                <button
                  className={`btn sm ${detail === 'auto' ? 'primary' : 'ghost'}`}
                  onClick={() => {
                    setDetail('auto');
                    setEmphasis(null);
                  }}
                >
                  Auto ({question.marks} marks)
                </button>
                {(['brief', 'standard', 'detailed'] as const).map((d) => (
                  <button
                    key={d}
                    className={`btn sm ${detail === d ? 'primary' : 'ghost'}`}
                    onClick={() => {
                      setDetail(d);
                      setEmphasis(null);
                    }}
                  >
                    {d === 'brief' ? 'Short' : d === 'standard' ? 'Structured' : 'Full'}
                  </button>
                ))}
                <button
                  className={`btn sm ${emphasis === 'example' ? 'primary' : 'ghost'}`}
                  onClick={() => setEmphasis(emphasis === 'example' ? null : 'example')}
                >
                  Emphasise examples
                </button>
              </div>

              <AnswerView
                answer={answer}
                collapsed={collapsed}
                onToggle={toggleSection}
                id={question.id}
              />

              <div className="divider" />
              <div className="row between small" style={{ marginBottom: 6 }}>
                <b>Verification checklist</b>
                <span className={`badge ${allPass ? 'mastered' : 'needs_revision'}`}>
                  {allPass ? 'ALL CHECKS PASS' : 'ITEMS TO REVIEW'}
                </span>
              </div>
              <div className="col" style={{ gap: 4 }}>
                {answer.verification.map((v, i) => (
                  <div key={i} className="row" style={{ gap: 8 }}>
                    <span className={`dot ${v.pass ? 'em' : 'warn'}`} />
                    <span className="small" style={{ flex: 1 }}>
                      {v.check}
                    </span>
                    <span className="tiny muted" style={{ maxWidth: 260, textAlign: 'right' }}>
                      {v.detail}
                    </span>
                  </div>
                ))}
              </div>
              <div className="divider" />
              <div className="tiny muted">
                <b>Assumptions:</b> {answer.assumptions.join(' ')}
              </div>
              <div className="tiny muted" style={{ marginTop: 4 }}>
                <b>Sources:</b> {answer.sources.join(' · ')}
              </div>
              {answer.missing?.length ? (
                <div className="small" style={{ marginTop: 8, color: '#e0b48a' }}>
                  Missing from the question: {answer.missing.join(', ')}.
                </div>
              ) : null}
              <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
                {answer.followUps.map((f) => (
                  <button
                    key={f}
                    className="btn sm ghost"
                    onClick={() => {
                      setDetail(f.toLowerCase().includes('simpl') ? 'brief' : f.toLowerCase().includes('longer') || f.toLowerCase().includes('detailed') ? 'detailed' : detail);
                      setEmphasis(f.toLowerCase().includes('example') ? 'example' : null);
                      if (f.toLowerCase().includes('diagram')) {
                        notify('The diagram section is already included when the topic has one.');
                      }
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <div className="col" style={{ gap: 14 }}>
            <Card>
              <CardHead title="Progress" sub="Answers, checks and revisions are tracked separately" />
              <div className="col" style={{ gap: 10 }}>
                {stats.perUnit.map((u) => (
                  <div key={u.unitId}>
                    <div className="row between tiny">
                      <span className="muted">{u.name}</span>
                      <span className="mono">
                        {u.answered}/{u.total} · {u.percent}%
                      </span>
                    </div>
                    <Bar percent={u.percent} tone="em" />
                  </div>
                ))}
              </div>
              <div className="divider" />
              <div className="col small" style={{ gap: 4 }}>
                <div className="row between">
                  <span className="muted">Numerical</span>
                  <b className="mono">
                    {stats.numerical.answered}/{stats.numerical.total}
                  </b>
                </div>
                <div className="row between">
                  <span className="muted">Theory / derivation</span>
                  <b className="mono">
                    {stats.theory.answered}/{stats.theory.total}
                  </b>
                </div>
                <div className="row between">
                  <span className="muted">Application / long answer</span>
                  <b className="mono">
                    {stats.application.answered}/{stats.application.total}
                  </b>
                </div>
                <div className="row between">
                  <span className="muted">Important · difficult · favourite</span>
                  <b className="mono">
                    {stats.important} · {stats.difficult} · {stats.favourite}
                  </b>
                </div>
              </div>
            </Card>

            <Card>
              <CardHead title="How this module answers" />
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.6, color: '#e6e0d5' }}>
                <li>Every question keeps its original number and wording from the uploaded document.</li>
                <li>Theory answers are assembled from the authored five-level content of the matched syllabus topic.</li>
                <li>Numerical answers are computed in code, step by step, with a verification checklist.</li>
                <li>If a numerical question omits its values, the module lists exactly what is missing instead of inventing numbers.</li>
                <li>An answer is never marked checked automatically — generate, review, then check.</li>
              </ul>
              <div className="divider" />
              <div className="tiny muted">
                Last checked answer:{' '}
                {stats.checked > 0
                  ? prettyDate(new Date(Math.max(...Object.values(state.answers ?? {}).map((a) => a.checkedAt ?? 0))).toISOString().slice(0, 10))
                  : 'none yet'}
              </div>
            </Card>
          </div>
        </div>
      )}
    </main>
  );
}

function AnswerView({
  answer,
  collapsed,
  onToggle,
  id,
}: {
  answer: GeneratedAnswer;
  collapsed: Record<string, boolean>;
  onToggle: (key: string) => void;
  id: string;
}) {
  return (
    <div className="col" style={{ gap: 8 }}>
      {answer.sections.map((s, i) => {
        const key = `${id}:${i}`;
        const open = !collapsed[key];
        return (
          <div key={key} className="card" style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}>
            <button
              className="row between"
              onClick={() => onToggle(key)}
              style={{ background: 'none', border: 0, width: '100%', cursor: 'pointer', color: '#f4f0e8' }}
              aria-expanded={open}
            >
              <b className="small">{s.heading}</b>
              <span className="tiny muted">{open ? '−' : '+'}</span>
            </button>
            {open && <SectionBody section={s} />}
          </div>
        );
      })}
    </div>
  );
}

function SectionBody({ section: s }: { section: AnswerSection }) {
  return (
    <div className="col" style={{ gap: 6, marginTop: 6 }}>
      {s.body && <p className="small" style={{ margin: 0, color: '#ece6db', lineHeight: 1.65 }}>{s.body}</p>}
      {s.bullets?.length ? (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.6, color: '#e6e0d5' }}>
          {s.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
      {s.formula && (
        <pre
          className="mono small"
          style={{ margin: 0, padding: 10, background: 'rgba(0,0,0,0.25)', borderRadius: 8, whiteSpace: 'pre-wrap' }}
        >
          {s.formula}
        </pre>
      )}
      {s.diagram && (
        <pre
          className="mono tiny"
          style={{ margin: 0, padding: 10, background: 'rgba(0,0,0,0.25)', borderRadius: 8, whiteSpace: 'pre-wrap', color: '#d8d2c6' }}
        >
          {s.diagram}
        </pre>
      )}
      {s.table && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {s.table.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {s.note && <span className="tiny muted">{s.note}</span>}
    </div>
  );
}

interface ThreadEntry {
  kind: 'question' | 'answer';
  text?: string;
  answer?: GeneratedAnswer;
  question?: AMQuestion;
}

function AskAnyQuestion({ onCopy }: { onCopy: () => void }) {
  const { notify } = useStore();
  const [text, setText] = useState('');
  const [thread, setThread] = useState<ThreadEntry[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const solve = (input: string) => {
    const clean = input.trim();
    if (clean.length < 8) {
      notify('Type the whole question first.');
      return;
    }
    const result = solveFreeform(clean);
    setThread((t) => [
      ...t,
      { kind: 'question', text: clean },
      { kind: 'answer', answer: result.answer, question: result.question },
    ]);
    setText('');
  };

  const lastAnswer = [...thread].reverse().find((t) => t.answer)?.answer;
  const lastQuestionText = [...thread].reverse().find((t) => t.text && t.kind === 'question')?.text ?? '';

  return (
    <div className="grid g-side">
      <div className="col" style={{ gap: 14 }}>
        <Card>
          <CardHead
            title="Ask Any Deep Learning Question"
            sub="Paste a theory question, a numerical problem or a follow-up — outside the 239-bank is fine"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="e.g. Explain why ReLU reduces vanishing gradients, or: A perceptron has w=[0.5,-0.2], b=0.1, x=[2,3] — compute the output."
            style={{ width: '100%', resize: 'vertical' }}
            aria-label="Your Deep Learning question"
          />
          <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
            <button className="btn primary" onClick={() => solve(text)}>
              Solve question
            </button>
            <button className="btn ghost" onClick={() => fileRef.current?.click()}>
              Upload .txt / .md
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const content = await file.text();
                setText(content.slice(0, 4000));
                notify('Question text loaded from the file. Review it, then solve.');
                e.target.value = '';
              }}
            />
            <select
              aria-label="Load a bank question"
              value=""
              onChange={(e) => {
                const q = AM_BY_ID[e.target.value];
                if (q) setText(q.text);
              }}
              style={{ maxWidth: 260 }}
            >
              <option value="">Load a question from the bank…</option>
              {AM_QUESTIONS.slice(0, 60).map((q) => (
                <option key={q.id} value={q.id}>
                  Q{q.number} — {q.text.slice(0, 60)}
                </option>
              ))}
            </select>
            {lastAnswer && (
              <button
                className="btn ghost"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      plainAnswer(lastAnswer, syntheticQuestion(lastQuestionText)),
                    );
                    notify('Copied.');
                  } catch {
                    notify('Clipboard blocked.');
                  }
                }}
              >
                Copy last answer
              </button>
            )}
          </div>
          <p className="tiny muted" style={{ marginBottom: 0 }}>
            PDF pasting is not supported in this box — the existing Add Material page reads PDFs for syllabus notes. A
            numerical question with missing values will be returned with the exact missing list, not invented numbers.
          </p>
        </Card>

        {thread.length === 0 ? (
          <Card>
            <CardHead title="Solved questions appear here" />
            <Empty>Ask anything — the module first identifies the topic, question type and suggested marks depth.</Empty>
          </Card>
        ) : (
          thread.map((entry, i) =>
            entry.kind === 'question' ? (
              <Card key={i}>
                <div className="row between">
                  <b className="small">Your question</b>
                  <span className="tiny muted">#{Math.floor(i / 2) + 1}</span>
                </div>
                <p className="small" style={{ marginBottom: 0, color: '#ded8cc' }}>{entry.text}</p>
              </Card>
            ) : (
              <Card key={i}>
                <div className="row between" style={{ marginBottom: 8 }}>
                  <span className="badge lav">{FORMAT_LABELS[entry.answer!.format]}</span>
                  <span className="tiny muted">{entry.answer!.depth}</span>
                </div>
                <AnswerView
                  answer={entry.answer!}
                  collapsed={collapsed}
                  onToggle={(k) => setCollapsed((c) => ({ ...c, [k]: !c[k] }))}
                  id={`ask-${i}`}
                />
                <div className="row between tiny muted" style={{ marginTop: 8 }}>
                  <span>
                    Verification: {entry.answer!.verification.filter((v) => v.pass).length}/
                    {entry.answer!.verification.length} checks pass
                  </span>
                  <span>{entry.answer!.sources[1] ?? entry.answer!.sources[0]}</span>
                </div>
                <div className="divider" />
                <div className="row wrap" style={{ gap: 6 }}>
                  <button
                    className="btn sm ghost"
                    onClick={() => {
                      const q = entry.question!;
                      const simpler = refine(entry.answer!, q, 'simpler');
                      setThread((t) => [...t, { kind: 'question', text: 'Explain it more simply.' }, { kind: 'answer', answer: simpler, question: q }]);
                    }}
                  >
                    Explain more simply
                  </button>
                  <button
                    className="btn sm ghost"
                    onClick={() => {
                      const q = entry.question!;
                      const longer = refine(entry.answer!, q, 'detailed');
                      setThread((t) => [...t, { kind: 'question', text: 'Give a fuller examination answer.' }, { kind: 'answer', answer: longer, question: q }]);
                    }}
                  >
                    Longer answer
                  </button>
                  <button
                    className="btn sm ghost"
                    onClick={() => {
                      const q = entry.question!;
                      const ex = refine(entry.answer!, q, 'example');
                      setThread((t) => [...t, { kind: 'question', text: 'Give another example.' }, { kind: 'answer', answer: ex, question: q }]);
                    }}
                  >
                    Another example
                  </button>
                  <button
                    className="btn sm ghost"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(plainAnswer(entry.answer!, syntheticQuestion(entry.question?.text ?? '')));
                        notify('Copied.');
                      } catch {
                        notify('Clipboard blocked.');
                      }
                    }}
                  >
                    Copy
                  </button>
                </div>
              </Card>
            ),
          )
        )}

        {lastAnswer && (
          <Card>
            <CardHead title="Ask a follow-up" sub="The follow-up is solved as its own question with the previous one in mind" />
            <div className="row" style={{ gap: 8 }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. What happens if the learning rate is 1.0?"
                style={{ flex: 1 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') solve(`${lastQuestionText} Follow-up: ${text}`);
                }}
                aria-label="Follow-up question"
              />
              <button className="btn primary" onClick={() => solve(`${lastQuestionText} Follow-up: ${text}`)}>
                Ask
              </button>
            </div>
          </Card>
        )}
      </div>

      <div className="col" style={{ gap: 14 }}>
        <Card>
          <CardHead title="What the solver does" />
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.6, color: '#e6e0d5' }}>
            <li>Classifies the question: numerical, theory, comparison, application, derivation or diagram.</li>
            <li>Finds the closest of the 48 Deep Learning syllabus topics by term overlap.</li>
            <li>Suggests a marks-based depth, then builds the matching answer format.</li>
            <li>Computes numerical answers only from values present in your question.</li>
            <li>Discloses weak topic matches and missing data instead of guessing.</li>
          </ul>
        </Card>
        <Card>
          <CardHead title="Answer formats used" />
          <div className="col small" style={{ gap: 4 }}>
            <span><b>Numerical</b> — GIVEN → TO FIND → FORMULA → SOLUTION → CONCLUSION.</span>
            <span><b>Theory</b> — definition, concept, working, example, limits, conclusion.</span>
            <span><b>Comparison</b> — intro, table, differences, conclusion.</span>
            <span><b>Application</b> — scenario, concept, method, result, limitations.</span>
            <span><b>Diagram</b> — text diagram, components, flow, limits.</span>
          </div>
          <div className="divider" />
          <button className="btn sm ghost" onClick={onCopy}>
            Copy the open bank answer
          </button>
        </Card>
      </div>
    </div>
  );
}

function syntheticQuestion(text: string): AMQuestion {
  return {
    id: 'freeform',
    number: '—',
    order: 0,
    text,
    format: 'theory',
    marks: 5,
    difficulty: 3,
    topicId: 'dl-u1-t3',
    unitId: 'dl-u1',
    focus: '',
  };
}
