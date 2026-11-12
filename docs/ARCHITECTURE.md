# Architecture

EXAMFORGE is a static single-page application. Everything it knows is either authored data or computed by
deterministic TypeScript engines in the browser. There is no server, no database and no external API at
runtime; the only network request is the initial bundle.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Build | Vite 8 | Fast dev server, static output, no server runtime |
| UI | React 19 + TypeScript (strict) | Typed data model across 172 topics is the whole point |
| Routing | `react-router-dom` — `HashRouter` | Works on any static host with no rewrite rules |
| Styling | Hand-written CSS (design tokens + neumorphic surfaces) | Full control, zero UI dependencies |
| Charts | Custom SVG components | No chart library, no runtime weight |
| Tests | Vitest + `react-dom/server` | Engine assertions and page render smoke tests |
| Hosting | Cloudflare Worker serving static assets | Edge-cached, free, no build step on the platform |

Runtime dependencies: `react`, `react-dom`, `react-router-dom`. Nothing else ships to the browser.

## Module map

```
src/
├── data/
│   ├── types.ts          all contracts: Topic, Unit, Subject, TopicContent, Question,
│   │                     NumericalSpec, AppState, MockResult, RevisionItem, …
│   ├── syllabus.ts       SUBJECTS (nested), ALL_TOPICS, TOPIC_MAP, unitOf, UNIT_COUNT, TOPIC_COUNT
│   ├── plan.ts           declarative 12–26 November plan: days, slots, topic slices, blocks
│   ├── labels.ts         display strings shared by pages
│   ├── content/
│   │   ├── base.ts       c() builder: fills optional fields, guarantees a Level-3 visual
│   │   ├── dl.ts cn.ts nlp.ts cloud.ts   172 teaching records
│   │   └── index.ts      CONTENT, MISSING_CONTENT, ORPHAN_CONTENT, CONTENT_STATS
│   └── bank/
│       ├── questions.ts  688 questions derived from content, with rubrics
│       ├── numericals.ts 27 solver specs
│       └── index.ts      ALL_QUESTIONS, QUESTIONS_BY_TOPIC, BANK_STATS
├── engine/
│   ├── dates.ts          yyyy-mm-dd keys, ranges, minute conversion
│   ├── storage.ts        load/save/export/import, defaults
│   ├── progress.ts       statuses, coverage, assessments, mastery gating
│   ├── scheduler.ts      timetable generation, reorganisation, queries
│   ├── revision.ts       spaced repetition stages, grading, question selection
│   ├── plan.ts           November plan engine: session building, activation, summary,
│   │                     missed-work redistribution, completion logging
│   ├── reminders.ts      IST reminder windows (daily recall, exam lead, overdue)
│   ├── scoring.ts        objective grading, rubric evaluator, mock assembly
│   ├── analytics.ts      streaks, accuracy series, heatmap, mock reports
│   ├── book.ts           study-book assembly: chapters, sections, word counts, reading time
│   ├── ingest.ts         material analysis: sectioning, classification, topic matching,
│   │                     summarising, de-duplication, commit/remove helpers
│   └── extract.ts        browser file reading: pdf.js text layer, text/HTML/JSON, limits
├── state/store.tsx       StoreProvider / useStore — one AppState, persisted
├── pages/                Dashboard, Ingest, Subjects, Tracker, Planner, Learn, Book, Bank, Lab,
│                         Practice, Mocks, Revision, Analytics, Settings
├── public/               sw.js (offline shell), manifest.webmanifest, icons
├── components/           ui.tsx, charts.tsx, diagram.tsx, QuestionView.tsx
├── styles.css            design system
├── App.tsx               shell: sidebar, topbar, routes
└── main.tsx              mount
```

## Data model

```
Subject ── Unit ── Topic ── subtopics[]
                     │
                     ├── TopicContent (5 levels + diagram/comparison/formulas)
                     ├── Question[] (4 per topic, each with rubric)
                     ├── TopicProgress (status, studyMinutes, assessments[])
                     └── MaterialAttachment[] (imported blocks filed under the topic)

MaterialSource ── 1:N ── MaterialAttachment   (one row per imported file or paste)
```

- `Topic.id` is stable and structured (`dl-u2-t5`), so engines can derive the subject from the id and the
  planner can group by unit without lookups.
- `Topic.numerical` marks topics that carry prescribed problems; the planner gives them a longer pace and
  the Lab lists their solvers.
- `TopicContent` is built through `c()`, which enforces the five-level contract: zero-level
  (`what/why/problem/how/where`), technical (`definition/architecture/components/math/advantages/
  disadvantages/limitations`), visual (`diagram | comparison | formulas`), practical and exam readiness.
  If no diagram is authored, `c()` derives a `flow` spec from the topic's own components, so Level 3 is
  never empty.

### The question bank is generated, but not generic

`questions.ts` composes four questions per topic directly from that topic's authored content — its
objectives, components, formulas, comparisons and common mistakes. The result is a stem that names the
actual topic, a model answer built from its real bullets, and a rubric whose points are the topic's
components. Marks per rubric point sum exactly to the question's marks (asserted in tests).

## State

One object, one key:

```ts
interface AppState {
  version: number;
  progress: Record<string, TopicProgress>;
  sessions: StudySession[];
  timetable: Timetable | null;
  attempts: Attempt[];
  mocks: MockResult[];
  revisions: RevisionItem[];
  studyLog: DailyStudyLog[];
  materials: MaterialAttachment[];
  materialSources: MaterialSource[];
  settings: Settings;
  seeded: boolean;
}
```

`version` is `2`: older saves have no `materials`/`materialSources`, and `loadState` fills them with empty
arrays, so importing progress from a previous release keeps working.

- `StoreProvider` loads once, seeds a timetable if none exists, and saves debounced on every change.
- `set(updater)` is the only mutation entry point; pages never touch `localStorage`.
- The in-progress mock paper lives under a separate key (`examforge.mock.draft.v1`) so a reload mid-exam
  restores answers *and* the deadline.
- Export writes the whole `AppState` as JSON; import validates and replaces it.

## Engines

### Material ingest (`ingest.ts`, `extract.ts`)

A document is cleaned, split into heading/paragraph blocks, classified by wording and scored against every
syllabus topic: whole-phrase hits on titles and subtopics (weighted by how specific the phrase is) plus
IDF-weighted term overlap and term coverage, with a subject prior when the user picks one. The raw score is
mapped to a 0–100 confidence with a margin penalty against the runner-up, so an ambiguous block is offered
for review instead of being filed silently.

Analysis is a pure function of `(text, options, existing material)`; `addMaterial` is the only writer, and it
re-checks duplicates against live state. The review screen is a projection of `IngestAnalysis` plus local
overrides, so nothing reaches the store until the user confirms. Full algorithm, thresholds and extension
points: [INGEST.md](INGEST.md).

### Scheduling (`scheduler.ts`)

`generateSchedule(state, mode, from)` walks day by day from `from` to the last exam and places sessions
into study blocks only.

Constraints, applied in order:

1. Travel window (`settings.travelStart … travelEnd`) — no sessions generated.
2. Exam days — blocks starting before `examEnd + 30 min` are dropped, and the examined subject is excluded
   from that day's picks.
3. Blocks — only `kind === 'study'`; session duration is exactly the block duration.
4. Wake/sleep — every block must fall inside `wake … sleep`; the defaults are 07:30 / 22:30.

Topic selection differs by mode:

- **sprint** — subject ordered by exam date, then lowest coverage; topics are drained in syllabus order,
  with numerical topics consuming more of the block.
- **examwise** — least-slack ordering across subjects (`daysRemaining − workRemaining`), mixing first-pass,
  practice on unassessed `LEARNED` topics, due revisions and periodic mock slots.

Each session carries the topics, three learning objectives taken from content, two bank question ids to
solve afterwards, and a completion criterion — so the planner produces a work order, not a calendar entry.

`reorganize(state)` marks unfinished past sessions `missed`, keeps completed history, regenerates the
future, and merges the two sets. Sleep, meals, travel and blocks are never modified.

### Progress and mastery (`progress.ts`)

Statuses are ranked (`not_started < in_progress < learned < practised < mastered`). `setStatus()` is
monotonic except for an explicit `needs_revision`. `recordAssessment(state, topicId, score, total)` is the
only function that can write `mastered`, and it does so only when `score / total ≥ settings.passPercent`.
Coverage counts `learned`, `practised`, `mastered`; mastery counts `mastered` only.

### Spaced repetition (`revision.ts`)

Stages map to intervals `[0, 1, 3, 7, 14, 30]` days. `gradeRevision()` moves a stage up on a correct
answer (two consecutive correct at stage 5 graduates the item), and down on a wrong one, rescheduling for
tomorrow. `pickRevisionQuestion()` bounds difficulty by stage and prefers objective formats early, written
formats late.

### Evaluation (`scoring.ts`)

- Objective questions: exact match on the answer set.
- Written answers: normalise, then per rubric point award its marks when all keywords appear (≤2 keywords)
  or at least half do. Full marks require every point. Feedback reports missing points, word count against
  the mark band and whether the expected structure was followed.
- `assembleMock()` filters by subject/unit/topic and optional `minDifficulty`, de-duplicates, then orders by
  ascending difficulty. Seeded with `mulberry32`, so a paper is reproducible from its seed.

### Analytics (`analytics.ts`)

Derived, never stored twice: streaks from `studyLog` and completed sessions, accuracy series from
`attempts`, per-topic accuracy for weak/strong lists, unit heatmap from `progress`, and `mockReport()`
recomputed from a stored `MockResult.perQuestion` so old reports stay accurate.

## Rendering

- `App.tsx` owns the shell: 12-item sidebar, topbar with global topic search, due-revision badge and
  countdown; routes render the pages.
- Charts are plain SVG components (`components/charts.tsx`); diagrams render `DiagramSpec` variants
  (`flow`, `arch`, `sequence`, `compare`) in `components/diagram.tsx`.
- Styling is token-driven (`styles.css`): charcoal surfaces, warm off-white type, lavender primary,
  emerald success, soft neumorphic shadows, responsive down to 414 px.

## Deployment topology

```
Browser ── HTTPS ──▶ Cloudflare edge (Worker)
                        │
                        ├── /            → dist/index.html
                        ├── /assets/*    → hashed JS/CSS (immutable)
                        └── unknown path → index.html (SPA fallback)
```

`worker.js` is ten lines and `deploy.json` describes module + assets. Because the app uses hash routing,
any static host works unchanged.

## Design trade-offs

| Decision | Cost | Benefit |
|---|---|---|
| Local-only state | No cross-device sync | Zero backend, zero accounts, fully offline, private |
| Generated question bank | 4 per topic, not thousands | Every question is topic-accurate with a real rubric |
| Keyword rubric evaluator | Cannot judge prose quality | Deterministic, instant, explainable, free |
| Hash routing | Uglier URLs | Deploys anywhere without server config |
| Custom SVG charts | No library features | No bundle weight, exact visual match |
