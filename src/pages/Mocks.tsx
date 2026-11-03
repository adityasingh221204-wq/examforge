// EXAMFORGE — Mock Examinations: four subject environments, 120-minute timer, full-screen mode,
// flagging, autosave, submit confirmation, automatic evaluation and a detailed report.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { SUBJECTS, TOPIC_MAP, unitOf } from '../data/syllabus';
import { ALL_QUESTIONS } from '../data/bank';
import { assembleMock, evaluateAnswer, gradeObjective, isObjective } from '../engine/scoring';
import { mockReport } from '../engine/analytics';
import { ensureRevision } from '../engine/revision';
import { recordAssessment } from '../engine/progress';
import { MOCK_KIND_LABEL } from '../data/labels';
import { Bar, Card, CardHead, Empty, Modal, Tabs } from '../components/ui';
import { LineChart } from '../components/charts';
import { QUESTION_TYPE_LABELS, type MockResult, type Question, type SubjectId } from '../data/types';

interface Draft {
  mockId: string;
  label: string;
  kind: MockResult['kind'];
  subjectId: SubjectId;
  scope: string;
  startedAt: number;
  endsAt: number;
  questionIds: string[];
  answers: Record<string, { selected?: number[]; text?: string }>;
  flags: string[];
}

const DRAFT_KEY = 'examforge.mock.draft.v1';
const byId = (id: string): Question | undefined => ALL_QUESTIONS.find((q) => q.id === id);

export function Mocks() {
  const { state, set, notify } = useStore();
  const [subject, setSubject] = useState<SubjectId>('dl');
  const [kind, setKind] = useState<MockResult['kind']>('full');
  const [unitId, setUnitId] = useState(SUBJECTS[0].units[0].id);
  const [draft, setDraft] = useState<Draft | null>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Draft;
      return parsed.endsAt > Date.now() ? parsed : null;
    } catch {
      return null;
    }
  });
  const [current, setCurrent] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [report, setReport] = useState<MockResult | null>(null);
  const [now, setNow] = useState(Date.now());
  const submittedRef = useRef(false);

  const subjectObj = SUBJECTS.find((s) => s.id === subject)!;
  const remaining = draft ? Math.max(0, Math.floor((draft.endsAt - now) / 1000)) : 0;

  const persist = useCallback((d: Draft | null) => {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY);
  }, []);

  const startExam = () => {
    const qs = assembleMock({
      label: `${subjectObj.code} · ${MOCK_KIND_LABEL[kind]}`,
      kind,
      subjectId: kind === 'mixed' ? undefined : subject,
      unitIds: kind === 'unit' ? [unitId] : undefined,
      objectiveCount: kind === 'full' ? 10 : 5,
      subjectiveCount: kind === 'full' ? 6 : 3,
      durationSec: 120 * 60,
      seed: Date.now() % 99991,
      minDifficulty: kind === 'advanced' ? 4 : undefined,
    });
    if (qs.length === 0) {
      notify('No questions available for that configuration.');
      return;
    }
    const d: Draft = {
      mockId: `mock_${Date.now()}`,
      label: `${subjectObj.code} · ${MOCK_KIND_LABEL[kind]}`,
      kind,
      subjectId: subject,
      scope: kind === 'unit' ? (unitOf(unitId)?.name ?? unitId) : subjectObj.name,
      startedAt: Date.now(),
      endsAt: Date.now() + 120 * 60 * 1000,
      questionIds: qs.map((q) => q.id),
      answers: {},
      flags: [],
    };
    submittedRef.current = false;
    setDraft(d);
    persist(d);
    setCurrent(0);
    setReport(null);
  };

  const submit = useCallback(
    (auto = false) => {
      if (!draft || submittedRef.current) return;
      submittedRef.current = true;

      const perQuestion = draft.questionIds.map((id) => {
        const q = byId(id);
        const ans = draft.answers[id];
        if (!q) return { questionId: id, awarded: 0, max: 0, timeSec: 0 };
        if (isObjective(q.type)) {
          const correct = gradeObjective(q, ans?.selected ?? []);
          return { questionId: id, awarded: correct ? q.marks : 0, max: q.marks, correct, timeSec: 0 };
        }
        const res = evaluateAnswer(q, ans?.text ?? '');
        return { questionId: id, awarded: res.score, max: res.maxScore, timeSec: 0 };
      });

      const totalMarks = perQuestion.reduce((n, r) => n + r.max, 0);
      const score = perQuestion.reduce((n, r) => n + r.awarded, 0);
      const objectiveScore = perQuestion.reduce((n, r) => {
        const q = byId(r.questionId);
        return q && isObjective(q.type) ? n + r.awarded : n;
      }, 0);
      const subjectiveScore = score - objectiveScore;

      const byTopic: Record<string, { score: number; max: number }> = {};
      for (const r of perQuestion) {
        const q = byId(r.questionId);
        if (!q) continue;
        byTopic[q.topicId] ??= { score: 0, max: 0 };
        byTopic[q.topicId].score += r.awarded;
        byTopic[q.topicId].max += r.max;
      }
      const ranked = Object.entries(byTopic)
        .map(([topicId, v]) => ({ topicId, pct: (v.score / Math.max(v.max, 1)) * 100 }))
        .sort((a, b) => a.pct - b.pct);

      const result: MockResult = {
        id: draft.mockId,
        label: draft.label,
        kind: draft.kind,
        subjectId: draft.subjectId,
        scope: draft.scope,
        startedAt: draft.startedAt,
        submittedAt: Date.now(),
        durationSec: Math.round((Date.now() - draft.startedAt) / 1000),
        totalMarks,
        score,
        objectiveScore,
        subjectiveScore,
        perQuestion,
        weakTopics: ranked.slice(0, 4).map((r) => r.topicId),
        strongTopics: ranked.slice(-3).reverse().map((r) => r.topicId),
        autoSubmitted: auto,
      };

      set((cur) => {
        let next = cur;
        for (const [tid, v] of Object.entries(byTopic)) {
          next = recordAssessment(next, tid, v.score, v.max);
          if ((v.score / Math.max(v.max, 1)) * 100 < next.settings.passPercent) next = ensureRevision(next, tid);
        }
        return {
          ...next,
          mocks: [result, ...next.mocks],
          attempts: [
            ...next.attempts,
            ...perQuestion.map((r) => ({
              id: `m_${draft.mockId}_${r.questionId}`,
              questionId: r.questionId,
              at: Date.now(),
              source: 'mock' as const,
              mockId: draft.mockId,
              correct: r.correct,
              score: r.awarded,
              maxScore: r.max,
            })),
          ],
        };
      });

      setReport(result);
      setDraft(null);
      persist(null);
      notify(auto ? 'Time expired — the paper was submitted automatically.' : 'Paper submitted and evaluated.');
    },
    [draft, set, notify, persist],
  );

  useEffect(() => {
    if (!draft) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [draft]);

  useEffect(() => {
    if (draft && remaining <= 0) submit(true);
  }, [draft, remaining, submit]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const history = state.mocks;

  const answeredCount = draft
    ? Object.values(draft.answers).filter((a) => (a.selected?.length ?? 0) > 0 || (a.text ?? '').trim().length > 0).length
    : 0;

  return (
    <main className="page">
      <div className="page-head">
        <div className="col">
          <h1>Mock Examinations</h1>
          <p>
            120-minute examination environments for each subject: unit, full-length, advanced application and mixed papers.
            Answers and solutions are revealed only after submission.
          </p>
        </div>
      </div>

      {draft && (
        <div className="exam-shell">
          <div className="exam-top">
            <b style={{ fontFamily: 'Manrope' }}>{draft.label}</b>
            <span className="tiny muted">{draft.scope}</span>
            <div style={{ flex: 1 }} />
            <span className="tiny muted">
              {answeredCount}/{draft.questionIds.length} answered
            </span>
            <span className={`timer ${remaining < 300 ? 'low' : ''}`}>
              {mm}:{ss}
            </span>
            <button className="btn sm ghost" onClick={() => setShowConfirm(true)}>
              Submit paper
            </button>
          </div>
          <div className="exam-body">
            <aside className="exam-nav">
              <div className="stat-label" style={{ marginBottom: 8 }}>
                Questions · {draft.questionIds.length}
              </div>
              <div className="qgrid">
                {draft.questionIds.map((id, i) => {
                  const a = draft.answers[id];
                  const answered = (a?.selected?.length ?? 0) > 0 || (a?.text ?? '').trim().length > 0;
                  return (
                    <button
                      key={id}
                      className={`${answered ? 'answered' : ''} ${draft.flags.includes(id) ? 'flagged' : ''} ${i === current ? 'cur' : ''}`}
                      onClick={() => setCurrent(i)}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="divider" />
              <div className="tiny muted">
                <span className="dot em" style={{ display: 'inline-block', marginRight: 6 }} />
                answered
              </div>
              <div className="tiny muted" style={{ marginTop: 4 }}>
                <span style={{ color: '#d9a566' }}>■</span> flagged
              </div>
              <div className="divider" />
              <div className="tiny muted">Every change autosaves locally. Refreshing keeps the paper.</div>
            </aside>
            <div className="exam-main">
              <ExamQuestion
                key={draft.questionIds[current]}
                questionId={draft.questionIds[current]}
                answer={draft.answers[draft.questionIds[current]]}
                onChange={(a) => {
                  const next = { ...draft, answers: { ...draft.answers, [draft.questionIds[current]]: a } };
                  setDraft(next);
                  persist(next);
                }}
                flagged={draft.flags.includes(draft.questionIds[current])}
                onFlag={() => {
                  const id = draft.questionIds[current];
                  const flags = draft.flags.includes(id) ? draft.flags.filter((f) => f !== id) : [...draft.flags, id];
                  const next = { ...draft, flags };
                  setDraft(next);
                  persist(next);
                }}
                index={current}
                total={draft.questionIds.length}
                onNav={(d) => setCurrent((c) => Math.max(0, Math.min(draft.questionIds.length - 1, c + d)))}
              />
            </div>
          </div>
        </div>
      )}

      {draft && showConfirm && (
        <Modal
          title="Submit examination?"
          onClose={() => setShowConfirm(false)}
          actions={
            <>
              <button className="btn ghost" onClick={() => setShowConfirm(false)}>
                Continue paper
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  setShowConfirm(false);
                  submit(false);
                }}
              >
                Submit now
              </button>
            </>
          }
        >
          <p className="muted">
            {answeredCount} of {draft.questionIds.length} questions answered. After submission the paper is scored and model
            solutions become available.
          </p>
        </Modal>
      )}

      {report && <MockReportView mock={report} onClose={() => setReport(null)} />}

      <div className="grid g-side" style={{ marginBottom: 14 }}>
        <Card>
          <CardHead title="Start an examination" sub="Choose a subject environment and paper type" />
          <div className="grid g2" style={{ marginBottom: 12 }}>
            <div className="col" style={{ gap: 5 }}>
              <label className="stat-label">Subject environment</label>
              <div className="row wrap" style={{ gap: 6 }}>
                {SUBJECTS.map((s) => (
                  <button
                    key={s.id}
                    className={`btn sm ${subject === s.id ? 'primary' : 'ghost'}`}
                    onClick={() => {
                      setSubject(s.id);
                      setUnitId(s.units[0].id);
                    }}
                  >
                    {s.code}
                  </button>
                ))}
              </div>
            </div>
            <div className="col" style={{ gap: 5 }}>
              <label className="stat-label">Paper type</label>
              <Tabs
                options={[
                  { id: 'unit', label: 'Unit' },
                  { id: 'full', label: 'Full' },
                  { id: 'advanced', label: 'Advanced' },
                  { id: 'mixed', label: 'Mixed' },
                ]}
                value={kind as 'unit' | 'full' | 'advanced' | 'mixed'}
                onChange={(k) => setKind(k as MockResult['kind'])}
              />
            </div>
          </div>
          {kind === 'unit' && (
            <div className="col" style={{ gap: 5, marginBottom: 12 }}>
              <label className="stat-label">Unit</label>
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                {subjectObj.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    U{u.order} {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="row wrap" style={{ gap: 8 }}>
            <button className="btn primary" onClick={startExam} disabled={Boolean(draft)}>
              Enter examination mode
            </button>
            <span className="tiny muted">
              {MOCK_KIND_LABEL[kind]} · 120 min · full-screen · autosave · flagging
              {kind === 'advanced' ? ' · difficulty 4–5 only' : ''}
            </span>
          </div>
        </Card>

        <Card>
          <CardHead title="Mock progress" sub={`${history.length} papers submitted`} />
          {history.length === 0 ? (
            <Empty>No papers yet. Your first mock will appear here with a full report.</Empty>
          ) : (
            <LineChart
              series={[
                {
                  label: 'Mock %',
                  points: [...history]
                    .reverse()
                    .map((m, i) => ({ x: `P${i + 1}`, y: (m.score / Math.max(m.totalMarks, 1)) * 100 })),
                },
              ]}
              height={140}
            />
          )}
        </Card>
      </div>

      <Card>
        <CardHead title="Examination log" sub="Every submitted paper with its score" />
        {history.length === 0 ? (
          <Empty>Nothing submitted yet.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Paper</th>
                  <th>Type</th>
                  <th>Score</th>
                  <th>Objective</th>
                  <th>Written</th>
                  <th>Time</th>
                  <th>Weak topics</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {history.map((m) => (
                  <tr key={m.id}>
                    <td>{m.label}</td>
                    <td className="muted">{MOCK_KIND_LABEL[m.kind]}</td>
                    <td className="mono">
                      {m.score}/{m.totalMarks}
                    </td>
                    <td className="muted mono">{m.objectiveScore}</td>
                    <td className="muted mono">{m.subjectiveScore}</td>
                    <td className="muted small">{Math.floor(m.durationSec / 60)} min</td>
                    <td className="small muted">{m.weakTopics.slice(0, 2).map((t) => TOPIC_MAP[t]?.name).join(', ')}</td>
                    <td>
                      <button className="btn sm ghost" onClick={() => setReport(m)}>
                        Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}

function ExamQuestion({
  questionId,
  answer,
  onChange,
  flagged,
  onFlag,
  index,
  total,
  onNav,
}: {
  questionId: string;
  answer?: { selected?: number[]; text?: string };
  onChange: (a: { selected?: number[]; text?: string }) => void;
  flagged: boolean;
  onFlag: () => void;
  index: number;
  total: number;
  onNav: (delta: number) => void;
}) {
  const q = useMemo(() => byId(questionId), [questionId]);
  if (!q) return <div className="muted">Question unavailable.</div>;
  const objective = isObjective(q.type);

  return (
    <div>
      <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
        <span className="badge lav">
          Question {index + 1} of {total}
        </span>
        <span className="badge">{QUESTION_TYPE_LABELS[q.type]}</span>
        <span className="badge">{q.marks} marks</span>
        <span className="tiny muted">{TOPIC_MAP[q.topicId]?.name}</span>
        <div style={{ flex: 1 }} />
        <button className={`btn sm ${flagged ? 'em' : 'ghost'}`} onClick={onFlag}>
          {flagged ? 'Flagged ★' : 'Flag for review'}
        </button>
      </div>
      <p style={{ fontSize: 14.5, color: '#f4f0e8', marginBottom: 16, lineHeight: 1.6 }}>{q.stem}</p>

      {objective && q.options ? (
        <div>
          {q.options.map((o, i) => (
            <div
              key={`${q.id}-${i}`}
              className={`opt ${answer?.selected?.includes(i) ? 'sel' : ''}`}
              onClick={() =>
                onChange({
                  ...answer,
                  selected:
                    q.type === 'multi'
                      ? answer?.selected?.includes(i)
                        ? answer.selected.filter((x) => x !== i)
                        : [...(answer?.selected ?? []), i]
                      : [i],
                })
              }
            >
              <span className="k">{String.fromCharCode(65 + i)}</span>
              <span>{o}</span>
            </div>
          ))}
        </div>
      ) : (
        <textarea
          value={answer?.text ?? ''}
          onChange={(e) => onChange({ ...answer, text: e.target.value })}
          placeholder="Write your answer…"
          style={{ minHeight: 260 }}
          aria-label="Answer"
        />
      )}

      <div className="row" style={{ justifyContent: 'space-between', marginTop: 16 }}>
        <button className="btn ghost sm" onClick={() => onNav(-1)} disabled={index === 0}>
          ← Previous
        </button>
        <span className="tiny muted">Answers autosaved</span>
        <button className="btn ghost sm" onClick={() => onNav(1)} disabled={index === total - 1}>
          Next →
        </button>
      </div>
    </div>
  );
}

function MockReportView({ mock, onClose }: { mock: MockResult; onClose: () => void }) {
  const report = mockReport(mock);
  const percent = Math.round((mock.score / Math.max(mock.totalMarks, 1)) * 100);
  const objectiveQs = mock.perQuestion.filter((r) => {
    const q = byId(r.questionId);
    return q && isObjective(q.type);
  });
  const accuracy = objectiveQs.length
    ? (objectiveQs.filter((r) => r.awarded === r.max).length / objectiveQs.length) * 100
    : 0;

  return (
    <Modal title="Examination report" onClose={onClose}>
      <div className="row between" style={{ marginBottom: 10 }}>
        <b>{mock.label}</b>
        <span className="badge lav">
          {mock.score}/{mock.totalMarks} · {percent}%
        </span>
      </div>

      <div className="grid g4" style={{ marginBottom: 12 }}>
        <div>
          <span className="stat-label">Accuracy</span>
          <div className="mono">{Math.round(accuracy)}%</div>
        </div>
        <div>
          <span className="stat-label">Objective</span>
          <div className="mono">{mock.objectiveScore}</div>
        </div>
        <div>
          <span className="stat-label">Written</span>
          <div className="mono">{mock.subjectiveScore}</div>
        </div>
        <div>
          <span className="stat-label">Time</span>
          <div className="mono">{Math.floor(mock.durationSec / 60)} min</div>
        </div>
      </div>

      <span className="stat-label">Unit-wise performance</span>
      <div className="col" style={{ gap: 6, margin: '6px 0 12px' }}>
        {report.perUnit.map((u) => (
          <div key={u.unitId}>
            <div className="row between small">
              <span className="muted">U{unitOf(u.unitId)?.order} · {unitOf(u.unitId)?.name}</span>
              <span className="mono">
                {u.scored}/{u.total} ({u.percent}%)
              </span>
            </div>
            <Bar percent={u.percent} tone={u.percent >= 60 ? 'em' : 'warn'} />
          </div>
        ))}
      </div>

      <span className="stat-label">Weak concepts</span>
      <ul className="small" style={{ margin: '4px 0 10px', paddingLeft: 18, color: '#e8c0a0' }}>
        {report.perTopic
          .filter((t) => t.percent < 100)
          .slice(0, 5)
          .map((t) => (
            <li key={t.topicId}>
              {TOPIC_MAP[t.topicId]?.name ?? t.topicId} — {t.percent}%
            </li>
          ))}
        {report.perTopic.every((t) => t.percent === 100) && <li className="muted">No weak concepts in this paper.</li>}
      </ul>

      <span className="stat-label">Suggested revision</span>
      <p className="small muted" style={{ marginTop: 4 }}>
        {report.perTopic.filter((t) => t.percent < 60).length > 0
          ? `Re-read Levels 1–3 and redo the 5-mark questions for: ${report.perTopic
              .filter((t) => t.percent < 60)
              .slice(0, 3)
              .map((t) => TOPIC_MAP[t.topicId]?.name)
              .join(', ')}. These topics are now in the revision queue.`
          : 'Consolidate with a full-length mock and spaced revision on your weakest units.'}
      </p>

      <div className="divider" />
      <span className="stat-label">Question breakdown</span>
      <div className="table-wrap" style={{ maxHeight: 220 }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Topic</th>
              <th>Marks</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {mock.perQuestion.map((r, i) => (
              <tr key={r.questionId}>
                <td className="muted">{i + 1}</td>
                <td className="small">{TOPIC_MAP[byId(r.questionId)?.topicId ?? '']?.name ?? '—'}</td>
                <td className="mono">
                  {r.awarded}/{r.max}
                </td>
                <td style={{ color: r.awarded === r.max ? '#6fd7a4' : r.awarded === 0 ? '#d5796c' : '#d9a566' }}>
                  {r.awarded === r.max ? 'Full' : r.awarded === 0 ? 'Lost' : 'Partial'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
