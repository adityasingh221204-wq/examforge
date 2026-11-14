<div align="center">

# EXAMFORGE

**Understand. Apply. Master. Score.**

An examination-preparation system built from four official university syllabi — 172 topics, 688 questions,
27 numerical solvers, an active date-wise examination planner, spaced repetition and full mock examinations. Import your
own notes, slides or past papers and they are analysed and filed under the matching syllabus topics.

[![Live app](https://img.shields.io/badge/live-app-8b7cf6?style=for-the-badge)](https://site-4614cef64bc247a99ee04f648244e176.freebuff.page)
[![Tests](https://img.shields.io/badge/tests-136%20passing-10b981?style=flat-square)](#testing)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?style=flat-square)](https://react.dev/)
[![Vite 8](https://img.shields.io/badge/Vite-8-646cff?style=flat-square)](https://vite.dev/)
[![License MIT](https://img.shields.io/badge/license-MIT-a3a3a3?style=flat-square)](LICENSE)

[Live application](https://site-4614cef64bc247a99ee04f648244e176.freebuff.page) · [User guide](docs/GUIDE.md) · [Architecture](docs/ARCHITECTURE.md) · [Material ingest](docs/INGEST.md) · [QA report](docs/QA.md)

</div>

---

![EXAMFORGE dashboard](docs/assets/dashboard.png)

## Why this exists

Most revision tools give you a list of chapters and a checkbox. That answers "have I looked at it?" — not
"can I pass an exam on it in twelve days?".

EXAMFORGE was built around one distinction that drives every screen: **coverage is not mastery**. Reading a
topic moves it to `LEARNED`. Only passing an independent assessment at or above your pass mark can move it to
`MASTERED`. Everything else — the planner, the revision queue, the analytics — is organised around that gap.

It runs entirely in the browser. No account, no backend, no paid API, no model calls: the syllabus, teaching
content, question bank and evaluation engines are all deterministic code and authored data.

## What it does

| | |
|---|---|
| **Syllabus audit** | Every topic from the four official documents, verbatim, with subtopics preserved. Six states, tracked per topic, with a live completeness report. |
| **Five-level teaching** | Every topic teaches zero-level intuition → technical detail → visual model → practical application → exam readiness. No level can be skipped or empty. |
| **Question bank** | 688 questions (3/4/5 marks, difficulty 1–5) each with expected answer structure, model answer, explanation, common mistakes and a mark-wise rubric. |
| **Deep Learning Answer Master** | The uploaded 239-question DL bank (234 numbered + 5 standalone numericals) answered in exam format — computed numerical walkthroughs, topic-grounded theory answers, per-question status, verification checklist, unit progress and an "ask any question" solver. |
| **Numerical lab** | 27 solvers across DL, CN, NLP and Cloud. Given → required → formula → why → substitution → steps → answer → mistakes, with re-solving practice mode. |
| **Answer evaluator** | Scores typed answers against the rubric, names the missed marks and checks length and structure. Incomplete answers cannot receive full marks. |
| **Active examination plan** | A real date-wise plan for 12–26 November 2026: 15 days, 61 sessions, four papers, one first pass of every topic before its exam, daily recall, practice and a mock per paper. Activation keeps all progress; missed work is redistributed into later capacity, never past the paper and never in place of sleep. Sprint and exam-wise modes remain available. |
| **Reminders** | Local browser notifications for the daily recall block, an exam inside 24 h or 3 h, and overdue work — while the app is open, each fired once per day. |
| **Spaced repetition** | 0 / 1 / 3 / 7 / 14 / 30-day stages; a wrong answer demotes and re-explains, a correct one lengthens the interval and raises difficulty. |
| **Mock examinations** | 120-minute timer, full-screen mode, flagging, autosave, submit confirmation, automatic marking and a detailed per-topic report. |
| **Analytics** | Coverage, mastery, accuracy, streaks, heatmaps and mock trends — all computed from recorded attempts and study logs. |
| **Material ingest** | Drop a PDF, Markdown, CSV or pasted chapter: it is split into blocks, matched against all 172 topics with a confidence score, de-duplicated, reviewed by you, then filed under the topic and shown on the Learn page. |
| **Offline study book** | Each subject as one continuous, printable book in syllabus order — chapters, definitions, diagrams, worked examples and exam vocabulary on one page, with reading time and a saved position. The app installs to the home screen and opens with no signal after one online visit. |

## Screenshots

| Active plan — dashboard | Active plan — planner and exam mornings |
| --- | --- |
| ![Dashboard](docs/assets/plan-dashboard.png) | ![Planner](docs/assets/plan-planner.png) |

| Deep Learning Answer Master | Answer with a verification checklist |
| --- | --- |
| ![Answer Master bank](docs/assets/answer-master-bank.png) | ![Answer with verification](docs/assets/answer-master.png) |

| Syllabus tracker (all 172 topics) | Learn — five levels per topic |
| --- | --- |
| ![Tracker](docs/assets/tracker.png) | ![Learn](docs/assets/learn.png) |

| Study book — offline, one page per subject | Study planner |
| --- | --- |
| ![Study book](docs/assets/book.png) | ![Planner](docs/assets/planner.png) |

| Revision centre |
| --- |
| ![Revision](docs/assets/revision.png) |

| Numerical lab | Mock examinations |
| --- | --- |
| ![Lab](docs/assets/lab.png) | ![Mocks](docs/assets/mocks.png) |

| Question bank | Performance analytics |
| --- | --- |
| ![Bank](docs/assets/bank.png) | ![Analytics](docs/assets/analytics.png) |

| Add material — drop, paste, choose a subject | Review — topic assignment and confidence, before anything is saved |
| --- | --- |
| ![Add material](docs/assets/ingest.png) | ![Material review](docs/assets/ingest-review.png) |

<div align="center">
<img src="docs/assets/mobile.png" width="320" alt="EXAMFORGE on a phone" />
</div>

> Screenshots use a demo profile with seeded progress so the charts and queues are populated.

## Adding your own material

Reach **Add material** from the sidebar, the top bar on every page, or the *Your material* card on any topic in
Learn. Drop files (PDF, `.txt`, `.md`, `.csv`, `.json`, `.html`) or paste text, pick a subject or let it detect
one, and press **Analyse material**. Nothing is saved yet: every block is shown with its inferred kind
(definition / formula / example / procedure / comparison / notes), a confidence score, the matched topic and a
one-click alternative. Fix a topic, untick what you do not want, then confirm.

- Matching is deterministic and local: weighted topic-title and subtopic phrases plus IDF-weighted terms, with
a subject prior when you pick one. Thresholds and scoring live in
[`src/engine/ingest.ts`](src/engine/ingest.ts) and are documented in [docs/INGEST.md](docs/INGEST.md).
- Duplicates are detected against your existing library (fingerprint + Jaccard similarity) and skipped.
- Importing material never marks a topic `LEARNED` or `MASTERED` — coverage is still not mastery.
- Everything stays in your browser; PDFs are parsed with pdf.js and never uploaded.

## Quick start

```bash
git clone <this-repository>
cd examforge
npm ci
npm run dev          # http://localhost:3000
```

No environment variables, API keys or services are required.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on `0.0.0.0:3000` |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npx tsc --noEmit` | Type-check only |
| `npx vitest run` | Run the 136-test suite |

## Data in the repository

| Metric | Count |
|---|---|
| Subjects | 4 (Deep Learning, Computer Networks, NLP, Cloud Computing) |
| Units | 20 |
| Syllabus topics | 172 (48 / 47 / 48 / 29) |
| Teaching records (5 levels each) | 172 |
| Questions with rubrics | 688 |
| Numerical solvers | 27 |
| Hand-authored diagrams | 54 (+118 derived component flows) |
| Automated tests | 136 |

The syllabus is the source of truth. Topic names are never rewritten, merged or invented, and a build-time
audit (`MISSING_CONTENT`, `ORPHAN_CONTENT`) fails the test suite if the data ever drifts out of sync.

## Architecture

```
src/
  data/      syllabus database, five-level teaching content, question bank, numerical specs
  engine/    dates, storage, progress, scheduler, revision, scoring, analytics — pure TypeScript
             ingest (material analysis), extract (PDF/text reading)
  state/     single React context store, auto-persisted
  pages/     15 pages
  components/ ui primitives, SVG charts, diagram renderer, question view
tests/       engine/data QA suite + page render suite
worker.js    Cloudflare Worker entrypoint serving the built SPA
```

- **Single source of state** (`examforge.state.v1` in `localStorage`), updated through typed helpers.
- **Deterministic engines.** No randomness without a seed; mock papers are reproducible, evaluation is
  rubric-based, numerical answers are computed rather than stored.
- **Hash routing**, so the same `dist/` deploys to any static host with no server rewrites.

Full detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Testing

```bash
npx vitest run
```

136 tests covering syllabus integrity, content completeness (all five levels present for all 172
topics), bank invariants (rubrics sum to marks, MCQ options unique), numerical determinism, planner
constraints (no sessions on travel days or exam mornings, sleep never violated, sessions inside study
blocks), mastery gating, spaced-repetition behaviour, evaluator fairness, material ingest (sectioning,
classification, topic matching, subject detection, de-duplication, state migration), the active
November plan (one first pass per topic before its paper, protected exam mornings, activation that preserves
progress, redistribution, reminders) and a render smoke test for all fifteen pages. See [docs/QA.md](docs/QA.md).

## Deployment

The build is a static SPA plus a five-line Worker that serves `dist/` and falls back to `index.html`.
Because routing is hash-based, no rewrites are needed:

- **Current deployment:** Cloudflare Workers (Sites) — `npm run build`, then upload `dist/` with
  `worker.js` and `deploy.json`.
- **Any static host:** Vercel, Netlify, GitHub Pages, S3 or nginx serve `dist/` unchanged.

## Limitations

- Progress is stored per browser. There is no account or sync; export/import JSON moves it between devices.
- The evaluator scores rubric coverage, length and structure — not prose quality. It rewards the syllabus's
  terminology, and it cannot credit a correct point phrased with none of the rubric's vocabulary.
- Four questions per topic is enough to practise and to sit mocks, but it is not a past-paper archive.
- Material matching is lexical, not semantic: it reads headings and vocabulary, so a block that never names
  its topic or uses different terminology needs a manual assignment. Scanned PDFs need OCR first, and
  `.docx`/`.pptx` are not parsed — export to PDF or text. See [docs/INGEST.md](docs/INGEST.md) for the exact
  algorithm and its thresholds.
- All papers run the real 120-minute clock regardless of paper length.

## Documentation

- [User guide](docs/GUIDE.md) — every page, every engine rule, and a day-by-day study playbook.
- [Architecture](docs/ARCHITECTURE.md) — data model, state shape, engine algorithms.
- [QA report](docs/QA.md) — what is verified, how, and what is not.
- [Contributing](CONTRIBUTING.md)

## Author

**Aditya Singh** — [@adityasingh221204-wq](https://github.com/adityasingh221204-wq)

Built as a study system for four university examinations (Deep Learning, Computer Networks, Natural Language
Processing and Cloud Computing), then opened up as a reusable template for any syllabus-driven course.

## License

[MIT](LICENSE) — © 2026 Aditya Singh
