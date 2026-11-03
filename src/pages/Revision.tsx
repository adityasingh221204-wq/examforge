// EXAMFORGE — Revision Centre: spaced repetition queue with adaptive difficulty.

import { useState } from 'react';
import { useStore } from '../state/store';
import { SUBJECTS, TOPIC_MAP } from '../data/syllabus';
import { dueRevisions, gradeRevision, pickRevisionQuestion, revisionStats, stageLabel, upcomingRevisions, ensureRevision } from '../engine/revision';
import { ALL_TOPICS } from '../data/syllabus';
import { getStatus } from '../engine/progress';
import { prettyDateShort, todayKey } from '../engine/dates';
import { Bar, Card, CardHead, Empty } from '../components/ui';
import { QuestionView } from '../components/QuestionView';
import type { RevisionItem } from '../data/types';

export function Revision() {
  const { state, set, notify } = useStore();
  const today = todayKey();
  const due = dueRevisions(state, today);
  const upcoming = upcomingRevisions(state, today, 7);
  const stats = revisionStats(state, today);
  const recallEvents = state.revisions.flatMap((r) => r.history);
  const recallCorrect = recallEvents.filter((h) => h.correct).length;
  const recallAccuracy = recallEvents.length ? (recallCorrect / recallEvents.length) * 100 : 0;
  const [activeId, setActiveId] = useState<string | null>(due[0]?.id ?? null);

  const active: RevisionItem | undefined = due.find((d) => d.id === activeId) ?? due[0];
  const question = active ? pickRevisionQuestion(active) : undefined;

  const grade = (item: RevisionItem, correct: boolean) => {
    set((cur) => {
      const next = gradeRevision(cur, item.id, question?.id ?? item.topicId, correct, today);
      return {
        ...next,
        attempts: [
          ...next.attempts,
          {
            id: `r_${Date.now()}`,
            questionId: question?.id ?? item.topicId,
            at: Date.now(),
            source: 'revision' as const,
            correct,
            score: correct ? (question?.marks ?? 3) : 0,
            maxScore: question?.marks ?? 3,
          },
        ],
      };
    });
    notify(correct ? 'Correct — stage advanced and next review pushed out.' : 'Wrong — stage reset, topic re-queued for tomorrow.');
  };

  const startRevision = (topicId: string) => {
    set((cur) => ensureRevision(cur, topicId, today));
    notify('Topic added to the spaced-repetition queue.');
  };

  const notScheduled = ALL_TOPICS.filter(
    (t) => getStatus(state, t.id) !== 'not_started' && !state.revisions.some((r) => r.topicId === t.id),
  ).slice(0, 6);

  return (
    <main className="page">
      <div className="page-head">
        <div className="col">
          <h1>Revision Centre</h1>
          <p>
            Spaced repetition at immediate, +1, +3, +7, +14 and +30 days. A wrong answer re-explains, resets the stage and
            re-queues the topic; repeated correct answers raise difficulty and thin the repetition.
          </p>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Card>
          <span className="stat-label">Due today</span>
          <div className="stat-value mono">{due.length}</div>
          <Bar percent={state.revisions.length ? (due.length / state.revisions.length) * 100 : 0} tone="warn" />
        </Card>
        <Card>
          <span className="stat-label">Scheduled</span>
          <div className="stat-value mono">{stats.scheduled}</div>
          <span className="stat-sub">Active in the queue</span>
        </Card>
        <Card>
          <span className="stat-label">Graduated</span>
          <div className="stat-value mono">{stats.graduated}</div>
          <span className="stat-sub">Recalled correctly at stage 5</span>
        </Card>
        <Card>
          <span className="stat-label">Recall accuracy</span>
          <div className="stat-value mono">{Math.round(recallAccuracy)}%</div>
          <span className="stat-sub">
            {recallCorrect}/{recallEvents.length} revision answers
          </span>
        </Card>
      </div>

      <div className="grid g-side">
        <Card>
          <CardHead title="Revision queue" sub={`${due.length} due · hardest first`} />
          {due.length === 0 && <Empty>Nothing due today. Learn a topic to start its spaced-recall schedule.</Empty>}
          <div className="col" style={{ gap: 6, marginBottom: 14 }}>
            {due.slice(0, 12).map((r) => (
              <button
                key={r.id}
                className={`item ${active?.id === r.id ? 'sel' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none' }}
                onClick={() => setActiveId(r.id)}
              >
                <span className={`dot ${r.stage >= 3 ? 'em' : r.wrongStreak > 0 ? 'warn' : ''}`} />
                <div className="col" style={{ gap: 0, flex: 1 }}>
                  <span className="small">{TOPIC_MAP[r.topicId]?.name ?? r.topicId}</span>
                  <span className="tiny muted">
                    {SUBJECTS.find((s) => s.id === r.subjectId)?.code} · {stageLabel(r.stage)} · due {prettyDateShort(r.dueDate)}
                  </span>
                </div>
                {r.wrongStreak > 0 && <span className="badge needs_revision">repeat</span>}
              </button>
            ))}
          </div>

          {active && (
            <>
              <div className="divider" />
              <div className="row between" style={{ marginBottom: 8 }}>
                <b className="small">Recall check · {TOPIC_MAP[active.topicId]?.name}</b>
                <span className="tiny muted">
                  stage {active.stage} · streak {active.correctStreak}
                </span>
              </div>
              {question ? (
                <>
                  <QuestionView
                    question={question}
                    onGraded={(r) => grade(active, Boolean(r.correct) || r.score >= r.max * 0.7)}
                  />
                  <div className="row" style={{ gap: 8, marginTop: 8 }}>
                    <button className="btn em sm" onClick={() => grade(active, true)}>
                      I recalled it correctly
                    </button>
                    <button className="btn danger sm" onClick={() => grade(active, false)}>
                      I got it wrong
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="small muted">
                    No question available for this topic — explain it aloud, then mark your recall honestly.
                  </p>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn em sm" onClick={() => grade(active, true)}>
                      Recalled correctly
                    </button>
                    <button className="btn danger sm" onClick={() => grade(active, false)}>
                      Needs re-explanation
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </Card>

        <div className="col" style={{ gap: 14 }}>
          <Card>
            <CardHead title="Next 7 days" sub={`${upcoming.length} reviews scheduled`} />
            {upcoming.length === 0 ? (
              <Empty>No reviews scheduled yet.</Empty>
            ) : (
              upcoming.slice(0, 10).map((r) => (
                <div key={`${r.id}-up`} className="row between small" style={{ padding: '4px 0' }}>
                  <span>{TOPIC_MAP[r.topicId]?.name}</span>
                  <span className="tiny muted mono">{prettyDateShort(r.dueDate)}</span>
                </div>
              ))
            )}
          </Card>

          <Card>
            <CardHead title="Not yet in the queue" sub="Studied topics without a review schedule" />
            {notScheduled.length === 0 ? (
              <Empty>Every studied topic already has a revision schedule.</Empty>
            ) : (
              notScheduled.map((t) => (
                <div key={t.id} className="row between small" style={{ padding: '4px 0' }}>
                  <span>{t.name}</span>
                  <button className="btn sm ghost" onClick={() => startRevision(t.id)}>
                    Schedule
                  </button>
                </div>
              ))
            )}
          </Card>

          <Card>
            <CardHead title="How the schedule adapts" />
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#cfc9bf' }}>
              <li>Correct → stage +1, next review at the next interval.</li>
              <li>Wrong → stage −1, due tomorrow, topic flagged NEEDS REVISION.</li>
              <li>Stage 5 with a streak of 2 → graduated, no more repetition.</li>
              <li>Question difficulty rises with the stage (3-mark → 4-mark → 5-mark).</li>
            </ul>
          </Card>
        </div>
      </div>
    </main>
  );
}
