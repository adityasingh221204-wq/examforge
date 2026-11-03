// EXAMFORGE — Practice Tests: topic/unit/mixed tests that feed assessments (the only route to MASTERED).

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../state/store';
import { SUBJECTS, TOPIC_MAP, unitOf } from '../data/syllabus';
import { assembleMock, totalMarksOf } from '../engine/scoring';
import { recordAssessment } from '../engine/progress';
import { ensureRevision } from '../engine/revision';
import type { Question, SubjectId } from '../data/types';
import { Bar, Card, CardHead, Empty, Tabs } from '../components/ui';
import { QuestionView } from '../components/QuestionView';

type Scope = 'topic' | 'unit' | 'mixed' | 'advanced';

export function Practice() {
  const { state, set, notify } = useStore();
  const [params] = useSearchParams();
  const [scope, setScope] = useState<Scope>('unit');
  const [subject, setSubject] = useState<SubjectId>((params.get('subject') as SubjectId) ?? 'dl');
  const [unitId, setUnitId] = useState<string>(SUBJECTS.find((s) => s.id === subject)?.units[0].id ?? 'dl-u1');
  const [topicId, setTopicId] = useState<string>(params.get('topic') ?? '');
  const [count, setCount] = useState(8);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [graded, setGraded] = useState<Record<string, { correct?: boolean; score: number; max: number }>>({});

  const units = SUBJECTS.find((s) => s.id === subject)?.units ?? [];
  const topics = unitOf(unitId)?.topics ?? [];

  const start = () => {
    const qs = assembleMock({
      label: 'Practice',
      kind: scope === 'topic' ? 'topic' : scope === 'unit' ? 'unit' : scope === 'mixed' ? 'mixed' : 'advanced',
      subjectId: scope === 'mixed' ? undefined : subject,
      unitIds: scope === 'unit' ? [unitId] : undefined,
      topicIds: scope === 'topic' && topicId ? [topicId] : undefined,
      objectiveCount: Math.max(1, Math.round(count * 0.35)),
      subjectiveCount: Math.max(1, Math.round(count * 0.65)),
      durationSec: count * 120,
      seed: Date.now() % 100000,
    });
    if (qs.length === 0) {
      notify('No questions found for that scope.');
      return;
    }
    setQuestions(qs);
    setGraded({});
  };

  const recorded = useMemo(() => Object.values(graded), [graded]);
  const score = recorded.reduce((n, g) => n + g.score, 0);
  const max = recorded.reduce((n, g) => n + g.max, 0);
  const finished = questions !== null && recorded.length === questions.length;

  const finish = () => {
    if (!questions) return;
    const perTopic: Record<string, { score: number; max: number }> = {};
    for (const q of questions) {
      const g = graded[q.id];
      if (!g) continue;
      perTopic[q.topicId] ??= { score: 0, max: 0 };
      perTopic[q.topicId].score += g.score;
      perTopic[q.topicId].max += g.max;
    }
    set((cur) => {
      let next = cur;
      for (const [tid, r] of Object.entries(perTopic)) {
        next = recordAssessment(next, tid, r.score, r.max);
        if (r.score / Math.max(r.max, 1) < next.settings.passPercent / 100) next = ensureRevision(next, tid);
      }
      next = {
        ...next,
        attempts: [
          ...next.attempts,
          ...questions.map((q) => ({
            id: `p_${q.id}_${Date.now()}`,
            questionId: q.id,
            at: Date.now(),
            source: 'practice' as const,
            correct: graded[q.id]?.correct,
            score: graded[q.id]?.score ?? 0,
            maxScore: graded[q.id]?.max ?? q.marks,
            answerGiven: undefined,
          })),
        ],
      };
      return next;
    });
    notify('Practice submitted. Topic assessments recorded — 70%+ promotes a topic to MASTERED.');
  };

  return (
    <main className="page">
      <div className="page-head">
        <div className="col">
          <h1>Practice Tests</h1>
          <p>
            Topic, unit and mixed tests with instant evaluation. Passing an assessment ({state.settings.passPercent}%+) is the only
            way a topic becomes MASTERED.
          </p>
        </div>
        <div className="page-actions">
          {questions && (
            <button className="btn ghost" onClick={() => { setQuestions(null); setGraded({}); }}>
              New test
            </button>
          )}
        </div>
      </div>

      {!questions ? (
        <Card>
          <CardHead title="Build a practice test" sub="Questions are drawn from the topic bank with a difficulty gradient" />
          <div className="grid g4" style={{ marginBottom: 14 }}>
            <div className="col" style={{ gap: 5 }}>
              <label className="stat-label">Scope</label>
              <Tabs
                options={[
                  { id: 'topic', label: 'Topic' },
                  { id: 'unit', label: 'Unit' },
                  { id: 'mixed', label: 'Mixed' },
                  { id: 'advanced', label: 'Advanced' },
                ]}
                value={scope}
                onChange={(s) => setScope(s as Scope)}
              />
            </div>
            <div className="col" style={{ gap: 5 }}>
              <label className="stat-label">Subject</label>
              <select
                value={subject}
                onChange={(e) => {
                  const id = e.target.value as SubjectId;
                  setSubject(id);
                  setUnitId(SUBJECTS.find((s) => s.id === id)?.units[0].id ?? '');
                  setTopicId('');
                }}
                disabled={scope === 'mixed'}
              >
                {SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                ))}
              </select>
            </div>
            <div className="col" style={{ gap: 5 }}>
              <label className="stat-label">Unit</label>
              <select value={unitId} onChange={(e) => { setUnitId(e.target.value); setTopicId(''); }} disabled={scope === 'mixed'}>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>U{u.order} {u.name}</option>
                ))}
              </select>
            </div>
            <div className="col" style={{ gap: 5 }}>
              <label className="stat-label">Questions</label>
              <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[4, 6, 8, 12, 16].map((n) => (
                  <option key={n} value={n}>{n} questions</option>
                ))}
              </select>
            </div>
          </div>
          {scope === 'topic' && (
            <div className="col" style={{ gap: 5, marginBottom: 12 }}>
              <label className="stat-label">Topic</label>
              <select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                <option value="">Choose a topic…</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="row" style={{ gap: 8 }}>
            <button className="btn primary" onClick={start} disabled={scope === 'topic' && !topicId}>
              Start test
            </button>
            <span className="tiny muted">Objective questions are auto-graded; written answers are scored against the rubric.</span>
          </div>
        </Card>
      ) : (
        <div className="col" style={{ gap: 14 }}>
          <Card>
            <CardHead
              title="In progress"
              sub={`${recorded.length} of ${questions.length} answered · ${score}/${totalMarksOf(questions)} marks so far`}
              right={
                <button className="btn primary sm" onClick={finish} disabled={recorded.length === 0}>
                  Submit test
                </button>
              }
            />
            <Bar percent={(recorded.length / questions.length) * 100} />
            {finished && (
              <div className="row between" style={{ marginTop: 10 }}>
                <b>
                  Score {score} / {max} ({Math.round((score / Math.max(max, 1)) * 100)}%)
                </b>
                <span className={`badge ${score / Math.max(max, 1) >= state.settings.passPercent / 100 ? 'mastered' : 'needs_revision'}`}>
                  {score / Math.max(max, 1) >= state.settings.passPercent / 100 ? 'Pass — topics promoted' : 'Below pass mark'}
                </span>
              </div>
            )}
          </Card>

          {questions.map((q, i) => (
            <div key={q.id}>
              <div className="tiny muted" style={{ marginBottom: 4 }}>
                {SUBJECTS.find((s) => s.id === q.subjectId)?.code} · {TOPIC_MAP[q.topicId]?.name}
              </div>
              <QuestionView
                question={q}
                index={i}
                onGraded={(r) => setGraded((g) => ({ ...g, [q.id]: r }))}
              />
            </div>
          ))}

          {questions.length === 0 && <Empty>No questions available for this scope.</Empty>}
        </div>
      )}
    </main>
  );
}
