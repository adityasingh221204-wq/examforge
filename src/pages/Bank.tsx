// EXAMFORGE — Question Bank: every topic's 3/4/5-mark questions, filterable and practisable.

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../state/store';
import { ALL_QUESTIONS } from '../data/bank';
import { SUBJECTS, TOPIC_MAP, unitOf } from '../data/syllabus';
import { QUESTION_TYPE_LABELS, type SubjectId } from '../data/types';
import { Card, CardHead, Empty, Tabs } from '../components/ui';
import { QuestionView } from '../components/QuestionView';

export function Bank() {
  const { state, set } = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [subject, setSubject] = useState<'all' | SubjectId>((params.get('subject') as SubjectId) ?? 'all');
  const [unit, setUnit] = useState('all');
  const [marks, setMarks] = useState<'all' | '3' | '4' | '5'>('all');
  const [difficulty, setDifficulty] = useState('all');
  const [type, setType] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const topicFilter = params.get('topic');

  const units = subject === 'all' ? [] : SUBJECTS.find((s) => s.id === subject)?.units ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_QUESTIONS.filter((x) => {
      if (topicFilter && x.topicId !== topicFilter) return false;
      if (subject !== 'all' && x.subjectId !== subject) return false;
      if (unit !== 'all' && x.unitId !== unit) return false;
      if (marks !== 'all' && x.marks !== Number(marks)) return false;
      if (difficulty !== 'all' && x.difficulty !== Number(difficulty)) return false;
      if (type !== 'all' && x.type !== type) return false;
      if (q) {
        const topicName = TOPIC_MAP[x.topicId]?.name ?? '';
        if (!`${x.stem} ${topicName}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [subject, unit, marks, difficulty, type, query, topicFilter]);

  const pageSize = 8;
  const shown = filtered.slice(page * pageSize, page * pageSize + pageSize);

  const record = (questionId: string, r: { correct?: boolean; score: number; max: number }) => {
    set((cur) => ({
      ...cur,
      attempts: [
        ...cur.attempts,
        {
          id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          questionId,
          at: Date.now(),
          source: 'bank',
          correct: r.correct,
          score: r.score,
          maxScore: r.max,
        },
      ],
    }));
  };

  const attempts = state.attempts.length;

  return (
    <main className="page">
      <div className="page-head">
        <div className="col">
          <h1>Question Bank</h1>
          <p>
            {ALL_QUESTIONS.length} questions across 172 topics — every topic carries an MCQ, a 3-mark, a 4-mark and a 5-mark
            question with model answers, rubrics and common mistakes.
          </p>
        </div>
        <div className="page-actions">
          <span className="chip">
            Attempted <b>{attempts}</b>
          </span>
          <button className="btn ghost" onClick={() => navigate('/practice')}>
            Timed practice tests
          </button>
        </div>
      </div>

      <Card>
        <CardHead
          title={topicFilter ? `Questions · ${TOPIC_MAP[topicFilter]?.name ?? topicFilter}` : 'Filter the bank'}
          sub={`${filtered.length} matching questions`}
          right={
            topicFilter ? (
              <button className="btn sm ghost" onClick={() => navigate('/bank')}>
                Clear topic filter
              </button>
            ) : undefined
          }
        />
        <div className="grid g4" style={{ marginBottom: 12 }}>
          <select value={subject} onChange={(e) => { setSubject(e.target.value as 'all' | SubjectId); setUnit('all'); setPage(0); }} aria-label="Subject">
            <option value="all">All subjects</option>
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
            ))}
          </select>
          <select value={unit} onChange={(e) => { setUnit(e.target.value); setPage(0); }} aria-label="Unit" disabled={subject === 'all'}>
            <option value="all">All units</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>U{u.order} {u.name}</option>
            ))}
          </select>
          <select value={marks} onChange={(e) => { setMarks(e.target.value as 'all' | '3' | '4' | '5'); setPage(0); }} aria-label="Marks">
            <option value="all">Any marks</option>
            <option value="3">3 marks</option>
            <option value="4">4 marks</option>
            <option value="5">5 marks</option>
          </select>
          <select value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setPage(0); }} aria-label="Difficulty">
            <option value="all">Any difficulty</option>
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>D{d}</option>
            ))}
          </select>
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(0); }} aria-label="Question type">
            <option value="all">Any type</option>
            {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search question or topic…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            aria-label="Search questions"
          />
          <div className="row" style={{ gap: 6 }}>
            <Tabs
              options={[
                { id: 'all', label: 'All' },
                { id: 'subj', label: 'By subject' },
              ]}
              value={subject === 'all' ? 'all' : 'subj'}
              onChange={(v) => { if (v === 'all') { setSubject('all'); setUnit('all'); } }}
            />
          </div>
        </div>

        {filtered.length === 0 && <Empty>No questions match these filters.</Empty>}

        {shown.map((q, i) => (
          <div key={q.id} style={{ marginBottom: 12 }}>
            <div className="row between" style={{ marginBottom: 4 }}>
              <span className="tiny muted">
                {SUBJECTS.find((s) => s.id === q.subjectId)?.code} · U{unitOf(q.unitId)?.order} · {TOPIC_MAP[q.topicId]?.name}
              </span>
              <button className="btn sm ghost" onClick={() => navigate(`/learn?topic=${q.topicId}`)}>
                Learn this topic
              </button>
            </div>
            <QuestionView question={q} index={page * pageSize + i} onGraded={(r) => record(q.id, r)} />
          </div>
        ))}

        {filtered.length > pageSize && (
          <div className="row" style={{ justifyContent: 'center', gap: 8, marginTop: 10 }}>
            <button className="btn sm ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              ← Previous
            </button>
            <span className="small muted">
              Page {page + 1} of {Math.ceil(filtered.length / pageSize)}
            </span>
            <button
              className="btn sm ghost"
              disabled={(page + 1) * pageSize >= filtered.length}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </Card>
    </main>
  );
}
