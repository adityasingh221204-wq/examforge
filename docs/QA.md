# QA report

Everything below was executed against this repository. Where something was **not** verified, it is listed
as such rather than implied to be tested.

## Commands

```bash
npx tsc --noEmit     # type-check, strict mode            → clean
npx vitest run       # 42 tests in 2 files                 → 42 passed
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

## Page render tests (`tests/render.test.tsx`, 14 tests)

Every one of the 12 pages is server-rendered inside the real store and router, asserting substantial markup
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

Screenshots in `docs/assets/` were captured from the running build with headless Chromium at 1440×900, plus
one at 414×896 for the mobile layout. They exercised every major page against a seeded demo profile
(82 topics covered, 8 mastered, 168 attempts, 3 mock papers, 12 revision items, 88 scheduled sessions);
the numbers on screen were cross-checked against the engine return values printed during seeding.

## Not verified

- **Interactive flows in an automated browser.** Timer countdown, autosave-on-reload, submit confirmation
  and typed-answer submission were not driven by an automated test. The logic is unit-tested at the engine
  level and the pages render, but the click-through is a manual check.
- **Real exam-device behaviour.** Screen-lock, app switching and low-power modes on a phone are untested.
- **Print/PDF export.** Not implemented; export is JSON.
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
