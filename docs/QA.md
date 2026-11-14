# QA report

Everything below was executed against this repository. Where something was **not** verified, it is listed
as such rather than implied to be tested.

## Commands

```bash
npx tsc --noEmit     # type-check, strict mode            → clean
npx vitest run       # 136 tests in 6 files                → 136 passed
npm run build        # tsc + vite build                    → dist/ produced
```

## Automated coverage (`tests/qa.test.ts`, 28 tests)

| Area | Assertion |
|---|---|
| Syllabus integrity | 4 subjects, 20 units, 172 unique topics; every topic belongs to a real unit; every unit has topics |
| Content completeness | All 172 topics have a content record; zero orphans; each record has non-empty Level 1 fields, Level 2 definition/components, a Level 3 visual, Level 4 examples and Level 5 exam notes |
| Question bank | 4 questions per topic; ids unique; rubric marks sum to question marks; MCQ has 4 unique options and one answer |
| Mock assembly | Balanced paper within bounds; no repeated question; **advanced papers draw only difficulty 4–5** |
| Numerical lab | 27 solvers cover all four subjects; each returns ≥2 steps, a non-empty answer and is deterministic across calls |
| Planner | No sessions inside the travel window; none before an exam ends; every session sits inside a study block; no session starts before wake or ends after sleep; a generated day has sessions and respects block ids |
| Progress | `MASTERED` requires a passing assessment; coverage counts learned/practised/mastered only |
| Spaced repetition | Immediate review scheduled on creation; stage advances on correct and resets on wrong; a real bank question is offered per item |
| Evaluation | Objective grading exact; empty/vague answers never get full marks; a complete answer with structure is rewarded |

## Material ingest (`tests/ingest.test.ts`, 36 tests)

| Area | Assertion |
|---|---|
| Cleaning | Hyphenated line breaks rejoined; page markers dropped; bullets normalised; dashes and whitespace collapsed |
| Tokenising | Stopwords removed, light stemming (`networks → network`), word count |
| Sectioning | Markdown, numbered and upper-case headings; headingless document stays one block; oversized bodies chunked with `(2)` suffix; short document title not filed; empty input yields nothing |
| Classification | Formula, definition, example, procedure, comparison and plain-notes blocks detected from wording |
| Topic matching | Backpropagation paragraph → *Backpropagation*; congestion paragraph → *TCP Congestion control*; IaaS matched through its parenthetical/acronym; `NAG` does **not** match inside *manages*; subject prior boosts without hiding a better match; unrelated text yields no matches; at most four matches with signals |
| Subject detection | Each of the four subjects detected from a paragraph of its notes; unrelated text returns `null` instead of guessing |
| Summaries | Bounded extractive summary; ≤ 8 key terms including the topic vocabulary; empty-ish input still returns text |
| De-duplication | Jaccard 1 for identical text, 0 for unrelated; stable fingerprints |
| Analysis | Mixed document: 2 matched, 1 unmatched with a warning; explicit subject honoured; duplicates of existing material flagged and deselected; duplicates inside one document detected; blank input warns |
| Commit | Attachments filed under the matched topic with unit/subject/summary/key terms; source recorded; re-import skipped; deselected blocks left out; block and source removal |
| Library | Summary counts and kind histogram; search over title/summary/key terms/source |
| Migration | A `version: 1` save without `materials` loads as `version: 2` with empty arrays and its progress intact |

## Active plan (`tests/plan.test.ts`, 22 tests)

| Area | Assertion |
|---|---|
| Syllabus distribution | The registered per-unit counts (8/13/9/13/5, 7/9/9/12/10, 15/12/9/5/7, 8/8/6/3/4) and 172 unique topics |
| Structure | 15 days from 12 to 26 November, nothing scheduled before 19:00 on 12 November, every block inside the waking day, an exam session 09:30–11:30 on each paper day, no first-pass or practice before the paper ends |
| Coverage | Exactly one first pass for each of the 172 topics, never after its paper |
| Activation | Sets `plan` and `timetable.mode = 'plan'`, keeps progress/assessments and completed history, idempotent, future-only replacement, routine and 8-hour target applied |
| Completion | Marking a session done logs its minutes without creating or promoting any topic status |
| Redistribution | Missed first-pass topics move into later sessions of the same subject before its exam, never into the night-before first-pass block, are flagged missed rather than completed, and completed sessions are untouched |
| Reminders | Daily recall reminder at the configured time, exam warning inside the 24 h window, overdue-work warning, all with IST clock handling |

## Page render tests (`tests/render.test.tsx`, 18 tests)

Every one of the 14 pages is server-rendered inside the real store and router, asserting substantial markup
and no `undefined`/`NaN` leaking into the output. Learn is additionally checked for a known topic's content
(Backpropagation, zero-level sections), and the tracker for its 172-topic table.

## Live deployment checks

Against the production URL, over HTTP:

| Check | Result |
|---|---|
| `GET /` | `200 text/html`, app shell with correct title |
| `GET /assets/*.js` | `200 text/javascript`, full byte size |
| `GET /assets/*.css` | `200 text/css` |
| Unknown path (`/tracker`) | `200 text/html` (SPA fallback) |
| CDN | served from Cloudflare edge cache |

## Visual verification

Screenshots in `docs/assets/` were captured from the running build at 1440×900, plus one at 414×896 for the
mobile layout. They exercised every major page against a seeded demo profile (82 topics covered, 8 mastered,
168 attempts, 3 mock papers, 12 revision items, 88 scheduled sessions); the numbers on screen were
cross-checked against the engine return values printed during seeding.

The material ingest flow was additionally driven end-to-end in a cloud Chromium session against the dev
server: paste a five-section handout → `dl` subject → *Analyse material* → 5 blocks, 4 topics, 3 flagged for
review, lab logistics correctly unmatched → confirm → `localStorage` held 5 attachments and 1 source → the
Learn page for `dl-u2-t5` rendered the Backpropagation block with its summary and 87% match, and topic
status counters were unchanged.

## Deep Learning Answer Master (`tests/answerMaster.test.ts`, 27 tests)

| Area | Assertion |
|---|---|
| Import | 239 questions parse; the five head problems are `N1`–`N5`; numbered questions 1–234 are present exactly once, in document order |
| Fidelity | Question text is not rewritten; the first and last questions match the document; unit assignment covers all five units |
| Type detection | Comparison, derivation/proof, diagram and application wording route to their formats; marks are suggested from wording |
| Numerical answers | N1 z = −0.8 → 0; N2 weights [0.3, −0.2] and b = 0.2; Q69 σ(−2) = 0.1192; Q73 softmax [0.6652, 0.2447, 0.0900]; Q84 MSE 0.08; Q94 ∂L/∂w = −0.2115; Q95 ∂L/∂w2 = −4.5; Q109 −0.5781; Q136 final 3.6893; Q219 0.7063 — each asserted against the section text |
| Numerical format | The five mandatory headings appear in order for every solved numerical |
| Missing data | Q110, Q161, Q220, Q221, Q228 list the exact missing values and never invent a result; Q225 gives the method plus a labelled illustrative run |
| Theory answers | Structured exam sections, a glossary, a diagram, and depth that follows the marks |
| Free-form solver | New theory question matches the right topic; a pasted perceptron and MSE are computed from the question's own numbers; an unmatched question is labelled as outside the syllabus |
| Status model | Generate marks `generated`, never `checked`; a failed check keeps the answer out of `checked`; revision and favourites are independent flags |
| Progress | Unit, type and marks progress is derived from stored statuses |
| Migration | A v3 save without `answers` loads as v4 with defaults and intact progress |

## Not verified

- **Exam interactive flows in an automated browser.** Timer countdown, autosave-on-reload, submit
  confirmation and typed-answer submission were not driven by an automated test. The logic is unit-tested at
  the engine level and the pages render, but the click-through is a manual check. (The ingest flow — paste,
  analyse, review and commit — *was* driven end-to-end; see above.)
- **PDF extraction.** The pdf.js path is exercised manually; the automated suite covers the analysis
  pipeline, not the browser PDF parser.
- **Real exam-device behaviour.** Screen-lock, app switching and low-power modes on a phone are untested.
- **Print/PDF export.** Not implemented; export is JSON.
- **Answer Master click-through.** The bank list, filters, answer rendering, generate-all, mark-checked,
  the ask-any-question tab and its topic matching were exercised in the Cloud browser during development;
  they are not part of the automated suite, which covers the engine and a render smoke test.
- **Accessibility audit.** Semantic landmarks, labels and focus states exist; no screen-reader pass or
  automated a11y scan has been run.
- **Cross-browser.** Verified in Chromium only.

## Manual checklist (5 minutes, recommended before an exam day)

1. Open the app, confirm the countdown and today's sessions are correct.
2. Start a Unit mock, answer two questions, refresh the page — the paper and timer must survive.
3. Submit with unanswered questions — the confirmation must show the count.
4. Read the report: totals, per-topic breakdown and model answers must appear.
5. Export progress, reset, import — the state must return exactly.
6. Open on a phone: sidebar collapses, pages scroll, no horizontal overflow.
