# Contributing to EXAMFORGE

Thanks for taking a look. This project is a study tool first, so the rules are simple and the bar is high
on data accuracy.

## Getting set up

```bash
npm ci
npm run dev        # http://localhost:3000
npm run typecheck
npm test
```

No environment variables or external services are needed.

## Ground rules

1. **The syllabus is the source of truth.** Never rename, merge, reorder or invent a topic, unit or
   subtopic. If a topic needs supplementary material, mark it `supplementary` and label it in the UI.
2. **No silent gaps.** Every topic must have all five teaching levels. `CONTENT_STATS`,
   `MISSING_CONTENT` and `ORPHAN_CONTENT` are computed at import time and asserted in the test suite —
   a missing level should fail a test, not show an empty panel.
3. **No fake data.** Analytics are computed from recorded attempts, mocks and study logs. Nothing is
   hard-coded to look good.
4. **No external AI or paid APIs.** The evaluator, planner and mock assembler are deterministic engines,
   and they must stay that way.
5. **Coverage ≠ mastery.** Only `recordAssessment()` may grant `MASTERED`, and only above the pass mark.

## Adding or changing content

- Syllabus changes go in `src/data/syllabus.ts`, with the exact official wording.
- Teaching content goes in `src/data/content/<subject>.ts`, using the `c()` builder in `base.ts`.
  Level 3 gets a diagram, a comparison table or formulas; the builder derives a component flow if you
  omit a diagram, but a bespoke one is preferred for important topics.
- Questions are generated from that content in `src/data/bank/questions.ts`. If you add a rubric point,
  its marks must keep summing to the question's marks — the test suite enforces this.
- Numerical problems in `src/data/bank/numericals.ts` are **solvers**, not static answers. Add the
  parameters and the `solve()` function; practice mode regenerates values and re-solves.

## Pull requests

- Keep a change focused, and say what problem it solves in the commit message.
- Run `npm run typecheck` and `npm test` before opening a PR. CI runs both.
- New behaviour needs a test in `tests/` that would fail without it.
- Screenshots are welcome for UI changes; they live in `docs/assets/`.

## Code style

- TypeScript strict, no `any` unless a library forces it.
- Engines are pure functions over `AppState`; pages never mutate state directly, they call `set()`.
- Material ingest follows the same split: `analyseMaterial()` is pure and testable, `addMaterial()` is the
  only writer, and the review screen is UI state that never reaches the store before confirmation.
- Styling uses the existing design tokens in `src/styles.css` — charcoal, warm off-white, lavender,
  emerald. Match the neumorphic surfaces rather than introducing a second visual language.
