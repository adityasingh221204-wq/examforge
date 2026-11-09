# EXAMFORGE — Complete System Guide

**Understand. Apply. Master. Score.**

Live application: https://site-4614cef64bc247a99ee04f648244e176.freebuff.page

EXAMFORGE is a complete, offline-capable examination-preparation system built from the four official
syllabus documents of the current semester. It is not a mockup: every topic, question, numerical,
schedule entry and percentage is computed from real data that ships with the app.

---

## 1. Quick start

1. Open the URL above on any device (phone, tablet, laptop).
2. The first load seeds the seven-day sprint timetable automatically — the planner is never empty.
3. Do the day's sessions from **Dashboard → Today's study schedule**.
4. When a session is finished, press **Mark complete** and the topics become `LEARNED`.
5. Then practise that topic in **Question Bank** or **Practice Tests**, and take a **Unit mock**.
6. Passing the mock (default 70%) is the only path to `MASTERED`.
7. Clear the **Revision queue** daily — it schedules itself.

No account, no sign-up, no network calls after load. All progress is stored in this browser.

---

## 2. What is being prepared (source of truth)

| Subject | Code | Units | Topics | Exam |
|---|---|---|---|---|
| Deep Learning | TE7753 | 5 | 48 | 17 Nov 2026, 09:30–11:30 |
| Computer Networks | T7908 | 5 | 47 | 19 Nov 2026, 09:30–11:30 |
| Natural Language Processing | TEE7101 | 5 | 48 | 24 Nov 2026, 09:30–11:30 |
| Cloud Computing | TE7948 | 5 | 29 | 26 Nov 2026, 09:30–11:30 |
| **Total** | | **20** | **172** | |

Rules baked into the data layer:

- Topic names are **verbatim** from the PDFs. Nothing is renamed, merged, reordered or invented.
- Units carry their official titles, teaching hours, course objectives and prescribed books.
- Subtopics are preserved per topic and displayed in **Syllabus Tracker** and **Learn**.
- Anything added beyond the document (extra examples, supplementary notes) is labelled as such.

---

## 3. Architecture

```
src/
  data/
    types.ts          all TypeScript contracts (topics, content, questions, state)
    syllabus.ts       the official syllabus database (SUBJECTS, ALL_TOPICS, TOPIC_MAP, unitOf)
    content/          172 teaching records, 5 levels each
      base.ts         content builder: fills gaps, guarantees a Level-3 visual
      dl.ts cn.ts nlp.ts cloud.ts
      index.ts        CONTENT, MISSING_CONTENT, ORPHAN_CONTENT, CONTENT_STATS
    bank/
      questions.ts    688 questions, 4 per topic, derived from the authored content
      numericals.ts   27 solved numericals with programmatic solvers
    labels.ts         shared display labels
  engine/
    dates.ts          date keys, ranges, minute maths
    storage.ts        localStorage persistence, export/import, defaults
    progress.ts       statuses, coverage, assessments, mastery gating
    scheduler.ts      timetable generation, reorganisation, session queries
    revision.ts       spaced repetition (stages, grading, question selection)
    scoring.ts        objective grading, rubric evaluator, mock assembly
    analytics.ts      streaks, accuracy series, heatmaps, mock reports
    ingest.ts         material analysis: sectioning, matching, de-duplication
    extract.ts        browser file reading (pdf.js, text, HTML, JSON)
  state/store.tsx     React context store: one AppState, auto-persisted
  pages/              13 pages (Dashboard, Add Material … Settings)
  components/         ui primitives, SVG charts, diagram renderer, QuestionView
  styles.css          neumorphic design system
tests/
  qa.test.ts          28 engine/data assertions
  ingest.test.ts      36 material-ingest assertions
  render.test.tsx     18 page-render smoke tests
worker.js             Cloudflare Worker entrypoint (serves dist/)
deploy.json           deployment manifest
```

Stack: **Vite 8 + React 19 + TypeScript**, `react-router-dom` with **HashRouter** (so any static
host works without server rewrites), **Vitest** for tests. No chart library (custom SVG), no UI kit,
no AI service, no paid API, no backend.

Runtime dependencies: React, React DOM, React Router. Everything else is the authored dataset.

---

## 4. The data layer

### 4.1 Syllabus
`SUBJECTS` is a nested tree: subject → unit → topic → subtopics. Every topic has a stable id
(`dl-u2-t5`), a `numerical` flag and a `supplementary` flag where applicable. `unitOf(id)` accepts
either a unit id or a topic id, which is why the planner can group sessions by unit without lookups.

### 4.2 Teaching content — five levels, never skipped
Each of the 172 topics has a `TopicContent` record:

1. **Zero level** — `what`, `why` it exists, `problem` it solves, `how` it works, `where` it is used.
2. **Technical** — formal definition, architecture, components, maths where relevant, advantages,
   disadvantages, limitations.
3. **Visual** — a diagram spec (`flow`, `arch`, `sequence` or `compare`), comparison tables and
   formula sheets. Guaranteed present: if no diagram was authored, the builder derives a component
   sequence from the topic's own technical components, so no topic ever shows an empty visual level.
4. **Practical** — worked examples, industry usage, code where relevant.
5. **Exam readiness** — exam-style definitions, objectives, must-know points.

`CONTENT_STATS` and `MISSING_CONTENT` / `ORPHAN_CONTENT` are computed at import time: any topic
without content, or any content without a topic, becomes visible rather than silently ignored. The
QA suite asserts both are zero.

### 4.3 Question bank
688 questions — four per topic:

| Type | Marks | Purpose |
|---|---|---|
| `mcq` | 3 | recall and definition discrimination (4 unique options) |
| `short` | 3 | definition + purpose + example |
| `compare` / `long` | 4 | mechanism, components, relations, outcomes |
| `application` / `long` | 5 | applied reasoning, design, justification |

Each question carries: stem, marks, difficulty 1–5, unit, topic, expected answer **structure**
(ordered steps), model answer, explanation, common mistakes, and a **mark-wise rubric** whose marks
always sum exactly to the question's marks.

### 4.4 Numerical Lab
27 numericals across the four subjects (perceptron output, sigmoid, MSE/cross-entropy, gradient
descent update, convolution and pooling shapes, parameter counts, transmission delay, throughput,
UDP checksum, Go-Back-N, subnetting, parity, CRC, TF-IDF, Naive Bayes, n-gram probability, Laplace
smoothing, cosine similarity, server utilisation, load balancing, availability, cloud cost,
autoscaling).

Each is a **solver**, not a static answer: `solve(params)` returns given → required → formula → why →
substitution → numbered steps → final answer → common mistakes. Practice mode generates new parameter
values and re-solves, so the number changes every attempt.

---

## 5. State and persistence

One object, one key: `examforge.state.v1` in `localStorage`.

```
version, progress{topicId → {status, studyMinutes, assessments[], lastStudiedAt}},
sessions[], timetable{mode, generatedAt, sessions[]}, attempts[], mocks[],
revisions[], studyLog[], settings{}, seeded
```

- Every mutation goes through `set(updater)` in `state/store.tsx`; a debounced save follows each change.
- The in-progress mock paper is a **separate** key (`examforge.mock.draft.v1`) so a refresh or a
  phone call during an exam does not lose answers — the draft survives, timer included.
- `Export progress (JSON)` writes a full snapshot; `Import progress` validates and replaces state.
  This is how you move between devices.
- `Reset all progress` clears everything except your routine/target settings, then regenerates the
  timetable.

---

## 6. Topic lifecycle and the mastery rule

Six states: `NOT STARTED → IN PROGRESS → LEARNED → PRACTISED → MASTERED`, plus `NEEDS REVISION`.

- **Coverage** counts only `LEARNED`, `PRACTISED`, `MASTERED`. Reading a topic does not make it learned.
- **MASTERED is gated**: `recordAssessment()` is the only function that can set it, and only when an
  independent assessment (a mock or practice test on that topic) scores at or above the pass mark
  in Settings (default **70%**). A failed assessment sets `NEEDS REVISION` instead — it never silently
  downgrades an existing `MASTERED` topic.
- A wrong answer in practice or revision flags the topic `NEEDS REVISION` — except when it was already
  mastered, which is left alone.
- Status changes are monotonic upwards: you cannot fall from `PRACTISED` back to `LEARNED` by marking
  a session complete; only `NEEDS REVISION` moves a topic backwards, and it is explicit.
- Coverage ≠ mastery is stated plainly on the Dashboard and in Analytics, which report both numbers
  separately.

---

## 7. The planner

`generateSchedule(state, mode, from)` produces date-wise sessions that respect every constraint.

### Hard rules (never violated)
1. **Sleep is untouchable.** No session may start before `wake` (07:30) or end after `sleep` (22:30).
2. **Travel window** (4–11 Nov by default, editable) is excluded from compulsory study. No sessions are
   generated on those dates at all.
3. **Exam mornings are reserved.** On an exam day, no study block may start before that exam ends + 30
   minutes. The subject being examined is not scheduled that morning either.
4. **Blocks are the only slots.** Sessions exist only inside blocks whose `kind === 'study'`
   (default four: 08:30–10:30, 10:50–12:50, 14:00–16:00, 16:45–18:45 — eight focused hours).
5. **Constant duration.** A session's length equals its block's length; nothing overruns.

### Mode A — Seven-day syllabus sprint
Prioritises *coverage*: the subject with the earliest exam and the lowest covered percentage is
served first, then the next, and so on. Topics with a `numerical` flag get more minutes of the block
(20 vs 15-minute pacing units), so numerical-heavy topics are not starved. Each session names the
topics, the material to read (Learn → subject → topic → Levels 1–2) and the specific bank questions
to solve afterwards.

### Mode B — Examination-wise revision and mastery
Prioritises *mastery before each exam*: work is allocated by least slack (days remaining minus work
remaining), so the nearest exam dominates but no subject is abandoned. Sessions mix three kinds —
new coverage, practice on `LEARNED`-but-unassessed topics, and due revisions — and each session is
labelled `first pass`, `practice`, `revision` or `mock`, so you always know which it is.

### Missed sessions
`reorganize()` marks every past, unfinished session `missed`, keeps completed history intact, and
regenerates all future sessions from current progress. Nothing is deleted and sleep/travel are
untouched. Triggered manually from **Planner → Rebalance** (and available on the Dashboard prompt).

### Reading the output
`sessionsForDate(state, date)` returns the day's sessions in time order; `nextSession()` gives the
imminent one; `missedCount()` drives the reschedule banner.

---

## 8. The fourteen pages

**1. Dashboard** — exam countdowns, overall coverage vs mastery, today's schedule with complete/skip,
today's learning objectives drawn from the scheduled topics, the revision queue snapshot, subject
progress bars, this week's consistency chart, and the weakest topics ranked by real attempt accuracy.

**2. Subjects** — one card per subject: objectives, prescribed books, per-unit topic audit, progress,
and a jump into any unit.

**3. Syllabus Tracker (audit page)** — the full `Subject · Unit · Topic · Subtopics · Status` table
for all 172 topics. Filter by subject, unit or status; every status is editable inline; progress
counters and per-subject coverage are computed live. This is the page that proves nothing is missing.

**4. Study Planner** — mode switch (sprint / exam-wise), the editable daily routine, the generated
timetable grouped by date with each session's topics, objectives, questions and status, plus the
explanation of how allocation works, rebalance and regenerate.

**5. Learn** — a subject switcher (Deep Learning · Computer Networks · NLP · Cloud Computing) above the
syllabus browser on the left; on the right the five levels as numbered tabs, learning
objectives, the diagram or comparison table for Level 3, formula cards, a level-completion tracker that
records which of the five levels you have actually covered, and a **Your material** card holding every
imported block filed under the topic (summary, key terms, full text, remove).

**6. Question Bank** — all 688 questions, filterable by subject, unit, type, marks and difficulty,
paginated, each expandable to model answer, explanation, common mistakes and rubric. Answering a
question records an attempt against its topic.

**7. Numerical Lab** — problem list by subject, the parameter form, the solved step-by-step output,
and practice mode with fresh values.

**8. Practice Tests** — build a test by topic, unit or mixed scope, choose the number of questions;
answering is immediate-feedback, and finishing writes an attempt history plus per-topic assessment
data.

**9. Mock Examinations** — four subject environments. Paper types: **Unit test**, **Full-length**,
**Advanced** (difficulty 4–5 only), **Mixed**. Each paper has a 120-minute countdown, full-screen exam
mode, question navigation grid with answered/flagged states, flag-for-review, autosave, a submit
confirmation that reports unanswered counts, then automatic evaluation and a full report: total and
percentage, per-subject, per-unit and per-topic breakdown, every incorrect question with what was
awarded, and model answers. Nothing is revealed before submission.

**10. Revision Centre** — the queue (due today, overdue, upcoming 7 days), each item showing topic,
stage and due date. Answering picks a bank question matched to the stage: objective questions early,
harder subjective questions later. A wrong answer demands re-reading the topic before retry.

**11. Analytics** — overall preparation, subject performance, accuracy over time, weekly study
consistency, mock progress trend, topic mastery heatmap by unit, strongest and weakest topics. Every
number is computed from attempts, study logs and mock results — no invented statistics.

**12. Settings** — the daily routine (every block editable, study/personal/break), wake and sleep,
travel window, daily target, mastery pass mark, data counters, export/import, reset.

**13. Add Material** — import and file your own notes (full walkthrough below).

**14. Study Book** — the whole subject as one continuous book rather than a page of tabs: chapters in
syllabus order, each topic written out as a section (what it is, why it exists, the problem it solves,
how it works, formal definition, building blocks, formulas, diagram, comparison table, worked example,
where it is used, strengths and limits, exam vocabulary). It shows chapters, topics, word count and an
estimated reading time, offers a chapter range and a table of contents, remembers the section you
stopped at, saves the whole subject as one self-contained `.html` file (opens with no signal on any phone) and prints to a clean black-on-white PDF. This is the page for a train with no signal: the
app registers a service worker, so once it has been opened online the book — and every other page —
opens from cache. The badge in the header says **Available offline** once the cache is in place.

### Adding your own material (page 13)

1. Open **Add Material** — sidebar, the `⇪ Add material` button in the top bar (always visible), or
   *Add material* on a topic in Learn.
2. Drop PDFs/text/Markdown/CSV/JSON/HTML, or paste text. Multiple files in one go are fine. Pick the
   subject if you know it; leave *Auto-detect* otherwise.
3. Press **Analyse material**. You land on the review screen, nothing has been saved yet.
4. Each block shows its inferred kind, a confidence score, the matched topic and its key terms. Use the
   subject filter or *Only needs a look* to work through the uncertain ones; change a topic with the
   select, accept an alternative match, or untick a block to leave it out. Duplicates are unticked for
   you and listed at the end.
5. Press **Add N blocks to study material**. They are now attached to their topics and appear in the
   **Your material** card on the Learn page.
6. The same page lists your library: search it, remove a single block, or delete a whole source file.

Importing material never changes a topic's status — reading is coverage, and mastery still requires a
passed assessment. The algorithm and its thresholds are documented in [INGEST.md](INGEST.md).

---

## 9. Answer evaluation (how a 5-mark answer is scored)

Deterministic, local, rubric-driven — no external model.

1. The answer is normalised (lower-case, punctuation stripped, whitespace collapsed).
2. For each rubric point, its keywords are checked. A point is awarded when **all** keywords match
   (for points with ≤2 keywords) or **at least half** (for points with more).
3. The awarded marks are the sum of matched points, capped at the question's marks.
4. **Full marks require every rubric point to match.** A single missing point prevents 100%.
5. Feedback adds: word-count guidance against the expected range (3 marks ≈ 60–130 words, 4 marks ≈
   110–180, 5 marks ≈ 170–280), the exact missing points with their marks, and whether the expected
   structure (e.g. definition → mechanism → example → limitation) was followed.
6. Empty or vague answers cannot pass: with no keyword hits, the score is zero, and the tests assert
   that a vague answer never receives full marks.

Objective questions are graded exactly (single choice, or exact set match for multi-select).

---

## 10. Spaced repetition

Stages and intervals: **0 → immediate, 1 → +1 day, 2 → +3 days, 3 → +7 days, 4 → +14, 5 → +30**.

- Correct answer: stage +1, longer interval, harder question next time. Two consecutive correct
  answers at stage 5 **graduate** the item out of the queue.
- Wrong answer: stage −1, streak reset, retry scheduled for tomorrow, easier question selected, and
  the topic is flagged `NEEDS REVISION`.
- Question difficulty tracks the stage (`≤2` at stages 0–1, up to 5 at stages ≥4); early stages prefer
  objective formats, later stages prefer written answers.
- The Revision Centre also lists `LEARNED` topics with no assessment yet — "not yet in the queue" — so
  nothing that was read is forgotten before it is ever tested.

---

## 11. Mock assembly and grading

- Pool is filtered by subject, unit and (for advanced) minimum difficulty; a seeded PRNG
  (`mulberry32`) makes each paper reproducible from its seed yet different each time.
- Questions are de-duplicated, ordered by ascending difficulty (easier first, exam-like gradient),
  then presented with the 120-minute clock.
- On submit, objective items are graded exactly and written answers through the rubric evaluator; the
  result is stored as a `MockResult` with per-question awarded/max.
- `mockReport()` computes totals, subject/unit/topic breakdowns and the incorrect list from that
  stored paper — so a report can be reopened later and still be correct.
- A mock score above the pass mark on a topic's questions records an assessment for that topic, which
  is what can promote it to `MASTERED`.

---

## 12. Analytics definitions

- **Coverage** = covered topics ÷ 172, where covered ∈ {learned, practised, mastered}.
- **Mastery** = mastered ÷ 172 — always shown separately from coverage.
- **Accuracy** = correct attempts ÷ attempts, bucketed by day for the trend line.
- **Streak** = consecutive days with a completed session or study log entry, counted back from today.
- **Weekly consistency** = study minutes per day against the daily target, last 7 days.
- **Mastery heatmap** = per unit, the share of its topics in each state.
- **Weakest/strongest topics** = topics with attempts, ranked by accuracy, with a minimum attempt
  count so a single lucky answer does not top the list.
- **Mock report** = score ÷ total marks, plus the same ratio per subject, unit and topic.

---

## 13. Daily operating playbook (13 days to the first exam)

Assumption: today is 4 Nov, the travel window 4–11 Nov is free of compulsory study, and the first
paper is Deep Learning on 17 Nov. Adjust in Settings if your dates differ.

**4–11 Nov (travel)** — nothing compulsory. Optional: read one Learn topic a day, or clear the revision
queue if it is short. Sleep 8–9 hours; the plan already protects it.

**12–13 Nov (2 days)** — Mode A sprint, four blocks/day. Remaining Deep Learning units in exam order,
weighting the numerical topics (convolutions, optimisers, backpropagation). Mark sessions complete as
you go so coverage is real.

**14–15 Nov** — Deep Learning consolidation: Practice Tests per unit, then two Full mocks. Anything
scored below 70% becomes `NEEDS REVISION` and enters the queue immediately. Answer written questions
by hand and type them into the evaluator to train structure and length.

**16 Nov** — No new topics. Revision queue only, plus one Advanced mock in the morning. Stop by 18:45.

**17 Nov** — Deep Learning exam, 09:30–11:30. The planner schedules nothing before it. After 12:00 the
plan switches to Computer Networks.

**18 Nov** — CN consolidation: unit practice plus one full mock; revision queue for CN.

**19 Nov** — CN exam. Afternoon switches to NLP.

**20–23 Nov** — NLP: sprint remaining units, practice per unit, two mocks, revision queue daily.

**24 Nov** — NLP exam. Afternoon switches to Cloud.

**25 Nov** — Cloud consolidation: units, one full mock, revision queue. Sleep by 22:30 — no cramming.

**26 Nov** — Cloud exam. Done.

Every day: open **Dashboard**, do the sessions in order, complete them, clear **Revision**, and only
then look at Analytics. If a day collapses, press **Rebalance** — the plan rebuilds itself.

---

## 14. Data portability

Progress lives in the browser, per device and per browser. To use a second device:

1. On the first: **Settings → Export progress (JSON)**.
2. Move the file (AirDrop, Drive, email to yourself).
3. On the second: **Settings → Import progress**, pick the file.

Import is validated; a malformed file is rejected with a message rather than corrupting state.
Clearing browser site data deletes progress — export first if it matters.

---

## 15. Build, test, deploy

```bash
npm ci                # install (lockfile is authoritative)
npm run dev           # http://localhost:3000
npx tsc --noEmit      # typecheck
npx vitest run        # 85 tests
npm run build         # production build into dist/
```

Deployment is a static SPA plus a 5-line Worker that serves `dist/` and falls back to `index.html`
(`worker.js` + `deploy.json`). Because routing is hash-based, no server rewrites are needed anywhere —
the same `dist/` works on Vercel, Netlify, GitHub Pages, S3 or any static host.

---

## 16. Verification record

- `tsc --noEmit` clean.
- **85/85 tests passing**: syllabus integrity (20 units, 172 unique topics), all 172 content records
  with five non-empty levels, zero missing/orphan content, four questions per topic with rubrics
  summing to marks and unique MCQ options, 27 numericals solving deterministically, planner rules
  (no travel days, no exam-morning sessions, sleep boundaries respected, sessions inside study blocks),
  mastery gating, revision stage advance/reset/rotation, evaluator fairness (no full marks for vague
  answers), advanced mocks restricted to difficulty ≥4, material ingest (cleaning, sectioning,
  classification, four-subject matching, subject detection, de-duplication, commit/remove, v1→v2 state
  migration), and a render smoke test for all 13 pages.
- Production build succeeds; deployed HTML, JS and CSS verified over HTTP with correct content types,
  and unknown paths fall back to the app shell.

---

## 17. Known limits

- **Per-browser storage.** No accounts and no server, so there is no automatic sync between devices —
  export/import is the mechanism. Nothing is sent anywhere.
- **Evaluator scope.** It scores rubric coverage, keyword presence, length and structure. It cannot
  judge elegance of prose or reward a correct point phrased with none of the rubric's vocabulary;
  write in the subject's terminology and it behaves predictably.
- **Bank size.** Four questions per topic is enough for practice and mocks, but it is not a past-paper
  archive; repeated mocks will eventually reuse questions.
- **Visuals.** 54 topics have a hand-authored diagram; the other 118 render a component-sequence flow
  derived from their own technical content. Accurate, but less bespoke.
- **Timer.** All paper types run the full 120-minute clock, matching the real exam duration rather than
  scaling to paper length.
- **Material matching is lexical.** It reads headings and vocabulary, so a block that never names its
  topic, or uses terminology the syllabus does not, needs a manual assignment on the review screen.
  Scanned PDFs need OCR before import; `.docx`/`.pptx` must be exported to PDF or text.
- **No browser-based UI test.** Pages are verified by server-rendering and by HTTP against the deployed
  build; interactive behaviour (typing, timer countdown) has not been driven by an automated browser.

---

## 18. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Planner looks empty | You are inside the travel window, or all sessions are done. Check Settings → travel dates, or Planner → Regenerate. |
| A status will not become MASTERED | By design: pass an assessment (mock/practice) at or above the pass mark in Settings. |
| Timetable did not change after editing blocks | Press **Rebalance** or **Regenerate**; saving settings does not silently rewrite history. |
| Progress gone after clearing cookies | Expected — localStorage was cleared. Restore from an exported JSON. |
| Mock timer already running on reload | Intended: the draft and its end time survive refresh; the paper auto-submits when the clock reaches zero. |
| Numbers look stale in Numerical Lab | Press **New values** in practice mode to regenerate parameters and re-solve. |
