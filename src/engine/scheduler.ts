// Adaptive study planner — generates date-wise, topic-wise timetables.
// Modes: 'sprint' (first-pass syllabus coverage) and 'examwise' (revision + mastery per exam date).
// Never schedules over sleep, meals, breaks or the travel window; missed sessions are reorganized.

import type {
  AppState,
  DayBlock,
  ScheduleMode,
  StudySession,
  SubjectId,
  Timetable,
  Topic,
} from '../data/types';
import { SUBJECTS, TOPIC_MAP } from '../data/syllabus';
import { CONTENT } from '../data/content';
import { QUESTIONS_BY_TOPIC } from '../data/bank';
import { addDays, dateRange, diffDays, nowMinutes, timeToMin, todayKey } from './dates';
import { isCovered } from './progress';
import { dueRevisions } from './revision';

// ---------------------------------------------------------------- helpers

export function examSubjectOn(date: string): SubjectId | null {
  const hit = SUBJECTS.find((s) => s.examDate === date);
  return hit ? hit.id : null;
}

export function isTravelDay(date: string, state: AppState): boolean {
  return date >= state.settings.travelStart && date <= state.settings.travelEnd;
}

function lastExamDate(): string {
  return SUBJECTS.map((s) => s.examDate).sort().slice(-1)[0];
}

export function examCountdown(date: string, examDate: string): number {
  return diffDays(date, examDate);
}

/** first-pass coverage pace per topic (minutes) */
export function topicPace(topic: Topic): number {
  return topic.numerical ? 20 : 15;
}

function studyBlocksForDay(state: AppState, date: string): { block: DayBlock; startMin: number }[] {
  const exam = examSubjectOn(date);
  const examEndMin = exam ? timeToMin(SUBJECTS.find((s) => s.id === exam)!.examEnd) + 30 : 0;
  return state.settings.blocks
    .filter((b) => b.kind === 'study')
    .map((b) => ({ block: b, startMin: timeToMin(b.start) }))
    .filter((b) => b.startMin >= examEndMin) // no study blocks on exam morning for anyone
    .sort((a, b) => a.startMin - b.startMin);
}

function optionalBlocksForDay(state: AppState, date: string): DayBlock[] {
  if (examSubjectOn(date)) return [];
  return state.settings.blocks.filter((b) => b.kind === 'personal');
}

function availableDay(date: string, state: AppState): boolean {
  if (isTravelDay(date, state)) return false;
  return true;
}

/** count of available study days in (from..to] */
function availableDaysBetween(from: string, to: string, state: AppState): number {
  if (to <= from) return 0;
  return dateRange(addDays(from, 1), to).filter((d) => availableDay(d, state)).length;
}

// ---------------------------------------------------------------- session construction

interface TopicPick {
  topic: Topic;
}

function buildSession(
  _state: AppState,
  date: string,
  block: DayBlock,
  picks: TopicPick[],
  kind: StudySession['kind'],
  label?: string,
): StudySession {
  const minutes = timeToMin(block.end) - timeToMin(block.start);
  const topicIds = picks.map((p) => p.topic.id);
  const first = picks[0].topic;
  const objectives: string[] = [];
  for (const p of picks) {
    const content = CONTENT[p.topic.id];
    if (content?.objectives?.length) objectives.push(...content.objectives.slice(0, 3));
    else if (p.topic.subtopics.length) objectives.push(...p.topic.subtopics.slice(0, 3));
  }

  const questionsToSolve: string[] = [];
  for (const p of picks) {
    const bank = QUESTIONS_BY_TOPIC[p.topic.id] ?? [];
    const threeMark = bank.find((q) => q.marks === 3);
    const fiveMark = bank.find((q) => q.marks === 5);
    if (threeMark) questionsToSolve.push(threeMark.id);
    if (fiveMark) questionsToSolve.push(fiveMark.id);
    if (questionsToSolve.length >= 4) break;
  }

  const subjectName = SUBJECTS.find((s) => s.id === first.subjectId)!.name;
  const material = label
    ? label
    : `EXAMFORGE · Learn → ${subjectName} → ${picks.map((p) => p.topic.name).join(', ')} · Levels 1–2 first pass${first.numerical ? ' · Numerical Lab set for this topic' : ''}`;

  const criteria = `Complete Level 1 + Level 2 reading for ${picks
    .map((p) => p.topic.name)
    .join(', ')}, attempt the quick-recall check, and set each topic status (LEARNED minimum). Coverage ≠ mastery — an assessment is still required.`;

  return {
    id: `s_${date}_${block.id}_${kind}`,
    date,
    blockId: block.id,
    start: block.start,
    end: block.end,
    minutes,
    subjectId: first.subjectId,
    unitId: first.unitId,
    topicIds,
    objectives: [...new Set(objectives)].slice(0, 6),
    material,
    questionsToSolve,
    criteria,
    done: false,
    kind,
  };
}

function buildRevisionSession(
  state: AppState,
  date: string,
  block: DayBlock,
  revisionTopicIds: string[],
): StudySession {
  if (revisionTopicIds.length === 0) {
    const minutes = timeToMin(block.end) - timeToMin(block.start);
    return {
      id: `s_${date}_${block.id}_rev_light`,
      date,
      blockId: block.id,
      start: block.start,
      end: block.end,
      minutes,
      subjectId: SUBJECTS[0].id,
      topicIds: [],
      objectives: ['Consolidate previously learned topics', 'Clear any revision backlog'],
      material: 'EXAMFORGE · Revision Centre → optional consolidation of earlier topics',
      questionsToSolve: [],
      criteria: 'Optional recall session: revisit one weak topic without notes, then check the model answer.',
      done: false,
      kind: 'revision',
      compulsory: false,
    };
  }
  const base = buildSession(state, date, block, revisionTopicIds.map((id) => ({ topic: TOPIC_MAP[id] })), 'revision');
  return {
    ...base,
    id: `s_${date}_${block.id}_rev`,
    material: `EXAMFORGE · Revision Centre → spaced-recall queue for ${revisionTopicIds
      .map((id) => TOPIC_MAP[id]?.name ?? id)
      .join(', ')} · answer without notes, then check`,
    criteria:
      'Retrieve from memory first (active recall), then verify. Wrong answers trigger re-explanation + easier follow-up automatically.',
  };
}

function buildMockSession(_state: AppState, date: string, block: DayBlock, subjectId: SubjectId): StudySession {
  const subject = SUBJECTS.find((s) => s.id === subjectId)!;
  return {
    id: `s_${date}_${block.id}_mock_${subjectId}`,
    date,
    blockId: block.id,
    start: block.start,
    end: block.end,
    minutes: timeToMin(block.end) - timeToMin(block.start),
    subjectId,
    topicIds: [],
    objectives: [`Sit the full-length ${subject.name} mock under 120-minute timer conditions`],
    material: `EXAMFORGE · Mock Examinations → Full-length mock: ${subject.name} (${subject.code})`,
    questionsToSolve: [],
    criteria:
      'Attempt under exam conditions (timer, no notes). After submission: review the report, flag weak concepts, and let the planner schedule their revision.',
    done: false,
    kind: 'mock',
    compulsory: false,
  };
}

// ---------------------------------------------------------------- core planner

interface SubjectQueue {
  subjectId: SubjectId;
  remaining: Topic[];
  remainingMin: number;
  deadline: string; // coverage should finish by this date (day before exam)
  examDate: string;
}

function buildQueues(state: AppState, _from: string): SubjectQueue[] {
  return SUBJECTS.map((s) => {
    const remaining = s.units
      .flatMap((u) => u.topics)
      .filter((t) => !isCovered(state, t.id));
    return {
      subjectId: s.id,
      remaining,
      remainingMin: remaining.reduce((n, t) => n + topicPace(t), 0),
      deadline: addDays(s.examDate, -1),
      examDate: s.examDate,
    };
  }).sort((a, b) => a.examDate.localeCompare(b.examDate));
}

export function generateSchedule(state: AppState, mode: ScheduleMode, from = todayKey()): Timetable {
  const horizon = lastExamDate();
  const dates = dateRange(from, horizon).filter((d) => availableDay(d, state));
  const queues = buildQueues(state, from);
  const sessions: StudySession[] = [];
  const examwise = mode === 'examwise';

  // mock / practice anchors for exam-wise mode: T-2 full mock, T-1 weak-topic practice
  const mockPlanned = new Set<string>();

  for (const date of dates) {
    const blocks = studyBlocksForDay(state, date);
    if (blocks.length === 0) continue;

    const usedBlocks = new Set<string>();
    let blockIdx = 0;

    // ---- 1. due revisions take the first block (exam-wise: always; sprint: only when backlog is large)
    const due = dueRevisions(state, date);
    const sprintRevisionThreshold = 6;
    if (due.length > 0 && (examwise || due.length >= sprintRevisionThreshold) && blocks.length > 0) {
      const topicIds = [...new Set(due.map((r) => r.topicId))].slice(0, 4).filter((id) => TOPIC_MAP[id]);
      if (topicIds.length > 0) {
        sessions.push(buildRevisionSession(state, date, blocks[0].block, topicIds));
        usedBlocks.add(blocks[0].block.id);
        blockIdx = 1;
      }
    }

    // ---- 2. exam-wise: place full mock at T-2, weak-topic practice at T-1 for each subject
    if (examwise) {
      for (const s of SUBJECTS) {
        const toExam = diffDays(date, s.examDate);
        if ((toExam === 2 || toExam === 1) && !mockPlanned.has(`${s.id}:${toExam}`)) {
          const coverage = subjectCoveragePercent(state, s.id);
          const freeIdx = blocks.findIndex((b) => !usedBlocks.has(b.block.id));
          if (freeIdx >= 0 && (toExam !== 2 || coverage >= 40)) {
            const b = blocks[freeIdx];
            if (toExam === 2) {
              sessions.push(buildMockSession(state, date, b.block, s.id));
              mockPlanned.add(`${s.id}:2`);
            } else {
              const weak = weakTopicIdsForSubject(state, s.id, 6);
              if (weak.length > 0) {
                sessions.push(
                  buildSession(
                    state,
                    date,
                    b.block,
                    weak.slice(0, 3).map((id) => ({ topic: TOPIC_MAP[id] })),
                    'practice',
                    `EXAMFORGE · targeted practice on weak ${s.name} concepts before the exam`,
                  ),
                );
                mockPlanned.add(`${s.id}:1`);
              } else {
                sessions.push(buildRevisionSession(state, date, b.block, revisionTargetsFor(state, s.id, 3)));
                mockPlanned.add(`${s.id}:1`);
              }
            }
            usedBlocks.add(b.block.id);
            if (freeIdx === blockIdx) blockIdx += 1;
          }
        }
      }
    }

    // ---- 3. coverage blocks: least-slack-first across subjects
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (usedBlocks.has(b.block.id)) continue;

      const active = queues.filter(
        (q) => q.remaining.length > 0 && date <= q.deadline && q.examDate > date,
      );
      const fallback = queues.filter((q) => q.remaining.length > 0 && q.examDate > date);

      let chosen: SubjectQueue | undefined;
      if (active.length > 0) {
        // rate = minutes still due per available remaining day → the tightest subject wins
        let best = -Infinity;
        for (const q of active) {
          const days = Math.max(availableDaysBetween(date, q.deadline, state), 1);
          const rate = q.remainingMin / days;
          if (rate > best) {
            best = rate;
            chosen = q;
          }
        }
      } else if (fallback.length > 0) {
        let bestDate = '9999-12-31';
        for (const q of fallback) {
          if (q.examDate < bestDate) {
            bestDate = q.examDate;
            chosen = q;
          }
        }
      }

      if (!chosen) {
        // everything covered → maintenance: weak-topic practice / mixed revision
        const weak = weakestUncoveredTouched(state, 4);
        if (weak.length > 0) {
          sessions.push(
            buildSession(
              state,
              date,
              b.block,
              weak.slice(0, 2).map((id) => ({ topic: TOPIC_MAP[id] })),
              'practice',
              'EXAMFORGE · weak-topic repair session',
            ),
          );
          usedBlocks.add(b.block.id);
          continue;
        }
        const revTargets = revisionTargetsFor(state, undefined, 4);
        if (revTargets.length > 0) {
          sessions.push(buildRevisionSession(state, date, b.block, revTargets));
          usedBlocks.add(b.block.id);
          continue;
        }
        // nothing left: light mixed revision of the subject nearest its exam
        const upcoming = SUBJECTS.filter((s) => s.examDate >= date).sort((a, b2) =>
          a.examDate.localeCompare(b2.examDate),
        )[0];
        if (upcoming) {
          const sample = upcoming.units
            .flatMap((u) => u.topics)
            .filter((t) => isCovered(state, t.id))
            .slice(0, 2);
          if (sample.length > 0) {
            sessions.push(
              buildSession(
                state,
                date,
                b.block,
                sample.map((t) => ({ topic: t })),
                'revision',
                `EXAMFORGE · mixed revision sweep — ${upcoming.name}`,
              ),
            );
            usedBlocks.add(b.block.id);
            continue;
          }
        }
        break; // no work left at all
      }

      // pick 1–2 topics that fit the block
      const blockMin = timeToMin(b.block.end) - timeToMin(b.block.start);
      const picks: Topic[] = [];
      let used = 0;
      while (chosen.remaining.length > 0 && picks.length < 2) {
        const t = chosen.remaining[0];
        const pace = topicPace(t);
        if (picks.length > 0 && used + pace > blockMin) break;
        if (picks.length === 0 && pace > blockMin) {
          // single topic too large — still take it, session spans the block
        }
        picks.push(chosen.remaining.shift()!);
        used += pace;
        if (used >= blockMin * 0.85) break;
      }
      chosen.remainingMin = chosen.remaining.reduce((n, t) => n + topicPace(t), 0);

      if (picks.length > 0) {
        sessions.push(
          buildSession(state, date, b.block, picks.map((t) => ({ topic: t })), 'sprint'),
        );
        usedBlocks.add(b.block.id);
      }
    }

    // ---- 4. exam eve: optional final-revision block on the evening before an exam
    const tomorrow = addDays(date, 1);
    const examTomorrow = examSubjectOn(tomorrow);
    if (examTomorrow) {
      const opt = optionalBlocksForDay(state, date);
      const already = sessions.find((s) => s.date === date && s.id.endsWith('_eve'));
      if (opt.length > 0 && !already) {
        const block = opt[0];
        const targets = revisionTargetsFor(state, examTomorrow, 4);
        const subject = SUBJECTS.find((s) => s.id === examTomorrow)!;
        const s = buildRevisionSession(state, date, block, targets.length > 0 ? targets : []);
        sessions.push({
          ...s,
          id: `s_${date}_${block.id}_eve`,
          kind: 'revision',
          compulsory: false,
          material: `EXAMFORGE · Final revision — ${subject.name} (${subject.code}) · tomorrow ${subject.examStart}`,
          criteria: 'Light final pass only: definitions, formulas, diagrams. Sleep 8 hours — do not trade sleep for study.',
        });
      }
    }
  }

  // de-duplicate by id (last wins) and sort
  const map = new Map<string, StudySession>();
  for (const s of sessions) map.set(s.id, s);
  const finalSessions = [...map.values()].sort((a, b) =>
    a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date),
  );

  return { mode, generatedAt: Date.now(), sessions: finalSessions };
}

function subjectCoveragePercent(state: AppState, subjectId: SubjectId): number {
  const subject = SUBJECTS.find((s) => s.id === subjectId)!;
  const topics = subject.units.flatMap((u) => u.topics);
  const covered = topics.filter((t) => isCovered(state, t.id)).length;
  return topics.length ? Math.round((covered / topics.length) * 100) : 0;
}

function weakTopicIdsForSubject(state: AppState, subjectId: SubjectId, limit: number): string[] {
  const subject = SUBJECTS.find((s) => s.id === subjectId)!;
  const out: string[] = [];
  for (const unit of subject.units) {
    for (const t of unit.topics) {
      const p = state.progress[t.id];
      if (!p) continue;
      if (p.status === 'needs_revision') out.push(t.id);
      else if (p.assessments.length > 0) {
        const last = p.assessments[p.assessments.length - 1];
        if (last.score / Math.max(1, last.total) < state.settings.passPercent / 100) out.push(t.id);
      }
    }
  }
  return out.slice(0, limit);
}

function weakestUncoveredTouched(state: AppState, limit: number): string[] {
  const out: { id: string; rank: number }[] = [];
  for (const subject of SUBJECTS) {
    for (const unit of subject.units) {
      for (const t of unit.topics) {
        const p = state.progress[t.id];
        if (!p) continue;
        if (p.status === 'needs_revision') out.push({ id: t.id, rank: 0 });
        else if (p.status === 'in_progress') out.push({ id: t.id, rank: 1 });
        else if (p.status === 'learned' && p.assessments.length === 0) out.push({ id: t.id, rank: 2 });
      }
    }
  }
  out.sort((a, b) => a.rank - b.rank);
  return out.slice(0, limit).map((o) => o.id);
}

function revisionTargetsFor(state: AppState, subjectId: SubjectId | undefined, limit: number): string[] {
  const due = dueRevisions(state).map((r) => r.topicId);
  const touched = state.revisions.map((r) => r.topicId);
  const pool = [...new Set([...due, ...touched])].filter((id) => {
    if (!TOPIC_MAP[id]) return false;
    if (subjectId && TOPIC_MAP[id].subjectId !== subjectId) return false;
    return true;
  });
  return pool.slice(0, limit);
}

// ---------------------------------------------------------------- reorganization

/**
 * Missed sessions are marked and all future sessions are regenerated from current
 * progress. Sleep, meals and travel are never touched (they are settings, not sessions).
 */
export function reorganize(state: AppState, mode?: ScheduleMode, now = todayKey()): AppState {
  const today = now;
  const nowMin = nowMinutes();
  const sessions = state.sessions.map((s) => {
    if (s.done || s.date > today) return s;
    if (s.date < today) return s.missed ? s : { ...s, missed: true };
    // today, past its end time and not done → missed
    if (timeToMin(s.end) < nowMin) return s.missed ? s : { ...s, missed: true };
    return s;
  });

  const activeMode: ScheduleMode = mode ?? state.timetable?.mode ?? 'sprint';
  const futureFrom = today;
  const fresh = generateSchedule(state, activeMode, futureFrom);

  // keep completed/past-done sessions from history; merge fresh future sessions
  const pastDone = sessions.filter((s) => s.done);
  const todayOrFuture = fresh.sessions;
  const mergedMap = new Map<string, StudySession>();
  for (const s of pastDone) mergedMap.set(s.id, s);
  for (const s of sessions.filter((s) => s.missed && !s.done)) mergedMap.set(s.id, s);
  for (const s of todayOrFuture) if (!mergedMap.has(s.id)) mergedMap.set(s.id, s);

  const merged = [...mergedMap.values()].sort((a, b) =>
    a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date),
  );

  return { ...state, sessions: merged, timetable: { ...fresh, sessions: merged } };
}

/** Generate a timetable and materialise its sessions into the state (the store's single entry point). */
export function applySchedule(state: AppState, mode: ScheduleMode, from = todayKey()): AppState {
  const timetable = generateSchedule(state, mode, from);
  return { ...state, timetable, sessions: timetable.sessions };
}

export function sessionsForDate(state: AppState, date: string): StudySession[] {
  return state.sessions.filter((s) => s.date === date).sort((a, b) => a.start.localeCompare(b.start));
}

export function nextSession(state: AppState, now = new Date()): StudySession | undefined {
  const date = todayKey(now);
  const nowMin = nowMinutes(now);
  const today = sessionsForDate(state, date);
  return today.find((s) => !s.done && !s.missed && timeToMin(s.start) >= nowMin) ?? today.find((s) => !s.done && !s.missed);
}

export function missedCount(state: AppState): number {
  return state.sessions.filter((s) => s.missed && !s.done).length;
}
