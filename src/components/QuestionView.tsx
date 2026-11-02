// EXAMFORGE — question renderer + answer evaluator (objective grading and rubric scoring).

import { useState } from 'react';
import { DIFFICULTY_LABELS, QUESTION_TYPE_LABELS, type Question } from '../data/types';
import { evaluateAnswer, gradeObjective, isObjective, type RubricEvaluation } from '../engine/scoring';
import { SUBJECTS } from '../data/syllabus';
import { TYPE_HINT } from '../data/labels';

export function QuestionView({
  question,
  index,
  onGraded,
  compact = false,
}: {
  question: Question;
  index?: number;
  onGraded?: (result: { correct?: boolean; score: number; max: number }) => void;
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [text, setText] = useState('');
  const [checked, setChecked] = useState(false);
  const [evalResult, setEvalResult] = useState<RubricEvaluation | null>(null);
  const [revealed, setRevealed] = useState(false);
  const objective = isObjective(question.type);
  const subject = SUBJECTS.find((s) => s.id === question.subjectId);

  const toggle = (i: number) => {
    if (checked) return;
    setSelected((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : question.type === 'multi' ? [...cur, i] : [i]));
  };

  const check = () => {
    if (objective) {
      const correct = gradeObjective(question, selected);
      setChecked(true);
      onGraded?.({ correct, score: correct ? question.marks : 0, max: question.marks });
    } else {
      const res = evaluateAnswer(question, text);
      setEvalResult(res);
      setChecked(true);
      onGraded?.({ score: res.score, max: res.maxScore });
    }
  };

  return (
    <article className="q-card">
      <div className="row wrap" style={{ gap: 6, marginBottom: 8 }}>
        {index !== undefined && <span className="badge lav">Q{index + 1}</span>}
        <span className="badge">{QUESTION_TYPE_LABELS[question.type]}</span>
        <span className="badge">{question.marks} marks</span>
        <span className="badge" title={`Difficulty ${question.difficulty}`}>
          D{question.difficulty} · {DIFFICULTY_LABELS[question.difficulty]}
        </span>
        <span className="tiny muted" style={{ marginLeft: 'auto' }}>
          {subject?.code} · {question.topicId.toUpperCase()}
        </span>
      </div>

      <p style={{ fontSize: 13.5, color: '#f4f0e8', marginBottom: 10 }}>{question.stem}</p>

      {objective && question.options ? (
        <div>
          {question.options.map((o, i) => {
            const isRight = (question.answerIndex ?? []).includes(i);
            const cls = checked
              ? isRight
                ? 'opt right'
                : selected.includes(i)
                  ? 'opt wrong'
                  : 'opt'
              : selected.includes(i)
                ? 'opt sel'
                : 'opt';
            return (
              <div key={`${question.id}-${i}`} className={cls} onClick={() => toggle(i)} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggle(i); }}>
                <span className="k">{String.fromCharCode(65 + i)}</span>
                <span>{o}</span>
                {checked && isRight && <span style={{ marginLeft: 'auto', color: '#6fd7a4' }}>✓</span>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="col" style={{ gap: 8 }}>
          <span className="tiny muted">{TYPE_HINT[question.type] ?? 'Write a structured answer.'}</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your answer here. The evaluator scores it against the rubric, keywords and structure…"
            aria-label="Your answer"
            disabled={checked}
          />
          <span className="tiny muted">
            {text.trim().split(/\s+/).filter(Boolean).length} words written
          </span>
        </div>
      )}

      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <button className="btn primary sm" onClick={check} disabled={checked || (objective ? selected.length === 0 : text.trim().length < 15)}>
          {objective ? 'Check answer' : 'Evaluate my answer'}
        </button>
        <button className="btn ghost sm" onClick={() => setRevealed((v) => !v)}>
          {revealed ? 'Hide model answer' : 'Show model answer'}
        </button>
        {checked && (
          <button
            className="btn ghost sm"
            onClick={() => {
              setChecked(false);
              setSelected([]);
              setText('');
              setEvalResult(null);
            }}
          >
            Try again
          </button>
        )}
      </div>

      {evalResult && (
        <div style={{ marginTop: 12 }}>
          <div className="row between">
            <b className="small">
              Score {evalResult.score} / {evalResult.maxScore} ({Math.round(evalResult.percent)}%)
            </b>
            <span className={`badge ${evalResult.fullMarks ? 'mastered' : evalResult.percent >= 60 ? 'practised' : 'needs_revision'}`}>
              {evalResult.fullMarks ? 'Full marks' : evalResult.percent >= 60 ? 'Almost there' : 'Needs work'}
            </span>
          </div>
          <div style={{ margin: '8px 0' }}>
            <div className="bar em" style={{ height: 6 }}>
              <i style={{ width: `${Math.min(100, evalResult.percent)}%` }} />
            </div>
          </div>
          <div className="small muted" style={{ marginBottom: 6 }}>
            {evalResult.wordCount} words · ideal {evalResult.idealWords[0]}–{evalResult.idealWords[1]} · structure{' '}
            {evalResult.structureHit}/{evalResult.structureTotal} blocks detected
          </div>
          {evalResult.matched.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span className="stat-label">Credited</span>
              {evalResult.matched.map((m) => (
                <div key={m.point} className="small" style={{ color: '#b7e0c6' }}>
                  ✓ {m.point} (+{m.marks})
                </div>
              ))}
            </div>
          )}
          {evalResult.missed.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span className="stat-label">Missed</span>
              {evalResult.missed.map((m) => (
                <div key={m.point} className="small" style={{ color: '#e8c0a0' }}>
                  ✗ {m.point} (−{m.marks}){m.keywords.length > 0 && <span className="tiny muted"> — expected: {m.keywords.slice(0, 4).join(', ')}</span>}
                </div>
              ))}
            </div>
          )}
          {evalResult.feedback.map((f) => (
            <div key={f} className="tiny muted">
              · {f}
            </div>
          ))}
        </div>
      )}

      {checked && objective && (
        <div className="small" style={{ marginTop: 10, color: '#cfc9bf' }}>
          <b style={{ color: '#f4f0e8' }}>Explanation.</b> {question.explanation}
        </div>
      )}

      {revealed && (
        <div style={{ marginTop: 12, borderTop: '1px solid #34312a', paddingTop: 10 }}>
          <span className="stat-label">Model answer</span>
          <p className="small" style={{ color: '#ded8cc', margin: '4px 0 8px' }}>{question.answerText}</p>
          {!compact && (
            <>
              <span className="stat-label">Answer structure</span>
              <ol className="small muted" style={{ margin: '4px 0 8px', paddingLeft: 18 }}>
                {question.structure.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <span className="stat-label">Mark-wise rubric</span>
              <div className="col" style={{ gap: 3, margin: '4px 0 8px' }}>
                {question.rubric.map((r) => (
                  <div key={r.point} className="row between small">
                    <span className="muted">{r.point}</span>
                    <span className="mono">{r.marks}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <span className="stat-label">Common mistakes</span>
          <ul className="small muted" style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {question.mistakes.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          {question.diagramRequired && <div className="tiny muted" style={{ marginTop: 6 }}>A labelled diagram is expected.</div>}
          <div className="small" style={{ marginTop: 8, color: '#cfc9bf' }}>
            <b style={{ color: '#f4f0e8' }}>Explanation.</b> {question.explanation}
          </div>
        </div>
      )}
    </article>
  );
}
