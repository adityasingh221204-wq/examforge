# Material ingest

How EXAMFORGE turns an arbitrary document — lecture notes, a slide export, a chapter, a past paper — into
study material filed under the official syllabus topics.

**Where it lives**

| Piece | File |
|---|---|
| Analysis pipeline (pure, testable) | [`src/engine/ingest.ts`](../src/engine/ingest.ts) |
| File reading (PDF, text, HTML, JSON) | [`src/engine/extract.ts`](../src/engine/extract.ts) |
| UI: import → review → commit, plus the library | [`src/pages/Ingest.tsx`](../src/pages/Ingest.tsx) |
| Per-topic display | [`src/pages/Learn.tsx`](../src/pages/Learn.tsx) (`Your material`) |
| Tests | [`tests/ingest.test.ts`](../tests/ingest.test.ts) |

**Entry points.** Sidebar → *Add Material*; the `⇪ Add material` button in the top bar, present on every page;
and *Add material* on any topic in **Learn**, which preselects that topic.

---

## Principles

1. **The syllabus stays the source of truth.** Material is attached *to* official topics; it never creates,
   renames or merges a topic.
2. **Coverage is not mastery.** Importing material does not change a topic's status. Reading it is study time,
   but only a passed assessment can produce `MASTERED`.
3. **Nothing is uploaded.** PDF text is extracted in the browser with pdf.js; analysis is local TypeScript.
   No model calls, no keys, no server.
4. **Deterministic.** The same document and the same options always yield the same blocks, topics and scores,
   which is what makes the pipeline testable.
5. **Human confirms.** The analyser proposes; the review screen decides. Nothing is written to state until
   the user presses *Add N blocks*.

---

## Supported input

| Format | How it is read |
|---|---|
| `.pdf` | pdf.js text layer, page by page (`pdfjs-dist`, loaded lazily in a separate chunk) |
| `.txt`, `.log`, `.md`, `.markdown`, `.csv`, `.tsv`, `.tex` | read directly as UTF-8 |
| `.html`, `.htm` | scripts/styles stripped, block elements converted to line breaks, entities decoded |
| `.json` | every string value extracted and joined |
| pasted text | read directly from the textarea |

Rejected with an explanation: `.doc`, `.docx`, `.ppt`, `.pptx`, `.odt`, `.rtf`, `.zip`, images. Files above
20 MB are refused; documents above 400,000 characters are truncated with a warning, since a single import
should be one chapter, not a textbook.

Scanned PDFs have no text layer. Rather than producing empty material, the analyser detects the near-empty
extraction and warns that OCR is required.

---

## Pipeline

```
raw text
   │  cleanText
   ▼
normalised text ──► splitSections ──► [block, block, …]
                                        │  classifySection      → definition | formula | example | procedure | comparison | notes
                                        │  matchText            → ranked topics + confidence
                                        │  summariseSentences    → 2–3 sentence extract
                                        │  extractKeyTerms       → ≤ 8 terms
                                        │  findDuplicate         → fingerprint / Jaccard
                                        ▼
                                   review screen
                                        │  addMaterial
                                        ▼
                       AppState.materials + AppState.materialSources
```

### 1. Cleaning (`cleanText`)

- Normalises CRLF, removes soft hyphens, joins words broken across lines (`net-\nwork` → `network`).
- Drops running page markers (`Page 4 of 12`).
- Maps bullet glyphs (`•`, `●`, `▪`, `·`) to `-`, collapses spaces, caps blank runs at one.

### 2. Sectioning (`splitSections`)

A line becomes a heading when it is:

- a Markdown heading (`#`, `##`, …),
- a numbered heading (`2.1`, `3)`, at most 90 characters),
- an upper-case line of at most 12 words,
- or a short line ending in `:` followed by content.

A short, unpunctuated first line followed by a blank line is treated as the document title and is not filed as
material. Bodies over `MAX_SECTION_CHARS` (2,400) are split at sentence boundaries and suffixed `(2)`, `(3)`.

### 3. Classification (`classifySection`)

| Kind | Signal |
|---|---|
| `formula` | contains `= ≈ ∑ √ ∫ ± ≤ ≥`, or the words *formula / equation / derivation of* |
| `procedure` | *algorithm / pseudocode / procedure / steps to / how to*, or ≥ 3 numbered lines |
| `example` | *for example / e.g. / worked example / illustration / numerical* |
| `comparison` | *versus / vs / difference between / comparison / pros and cons* |
| `definition` | *is defined as / refers to / definition / stands for / is a type of* |
| `notes` | none of the above |

The kind is a display label and a hint for revision — it never affects which topic a block is filed under.

### 4. Topic matching (`matchText`)

Every syllabus topic becomes a vector of phrases and weighted terms. A block is scored against all 172 topics:

| Signal | Weight |
|---|---|
| Topic title appears as a whole phrase | `16 × specificity` (× 1.6 when in the heading) |
| Subtopic appears as a whole phrase | `8 × specificity` (× 1.75 when in the heading) |
| Topic term appears | `min(weight, 3) × idf × 0.55` (× 1.3 in the heading) |
| Term coverage of the topic vector | `9 × coverage²` |
| Unit-name term overlap | `2.5 × ratio` |
| Subject chosen by the user | `× 1.45` if the same subject, `× 0.5` otherwise |

`specificity` damps generic names: a one-word title that appears in more than four topics scores `0.3`,
so *Applications* can no longer outrank *Backpropagation*. Phrase matching is whole-word on padded text,
so *NAG* cannot match *manages*.

Names and subtopics are also matched without their parenthetical and by acronym, so
*Infrastructure as a Service (IaaS)* matches the full phrase and `IaaS` alone.

**Confidence** converts a raw score into 0–100 with a margin penalty:

```
base   = 100 × (1 − e^(−score / 18))
margin = (best − runnerUp) / best
conf   = clamp(base × (0.55 + 0.45 × margin), 5, 99)
```

A block is filed when its confidence is at least `LOW_CONFIDENCE` (40). At `AUTO_ACCEPT_CONFIDENCE` (55) or
above it is preselected; between 40 and 54 it is filed but flagged *needs a look*; below 40 it goes to the
*Not linked to a topic* bucket with its best suggestion as a one-click fix. Raw scores below
`MATCH_SCORE_FLOOR` (3.5) are discarded. Up to four matches are returned, and the review screen offers the
alternatives per block.

### 5. Subject detection (`detectSubject`)

When the user leaves the subject on *Auto-detect*, the document is sectioned and every block's best matches
are summed per subject. A subject is only accepted when it has at least 8 points of evidence **and** leads the
runner-up by 25%; otherwise the analyser says so instead of guessing, and matching runs without a prior.

### 6. Summary and key terms

- `summariseSentences` scores sentences by key-term density, an early-position bonus and a 8–45 word length
  preference, then keeps the best 2–3 in original order, capped at 340 characters.
- `extractKeyTerms` ranks words by frequency, whether they occur in the topic's own vocabulary (× 2.6),
  capitalisation/acronyms (× 1.25) and length, and returns at most eight — these become the chips on the
  review screen and on the Learn page.

### 7. De-duplication

Two blocks are the same material when their sorted stemmed-token fingerprint matches or their Jaccard
similarity is at least `DUPLICATE_SIMILARITY` (0.85). This is checked twice: against the existing library
during analysis (so the review screen can say *already in your library*), and again inside `addMaterial`
against the live state, which makes a double import from two tabs harmless.

---

## State

```ts
interface MaterialAttachment {
  id, sourceId, sourceName,
  subjectId, unitId, topicId,
  title, kind, body, summary, keyTerms[], confidence, signals[],
  addedAt, words
}

interface MaterialSource {
  id, name, mime, bytes, addedAt,
  subjectId: SubjectId | 'auto',
  sections, attached, words
}
```

Both live in the same `examforge.state.v1` document as progress, attempts and the timetable, so exporting
progress exports your material too. `STATE_VERSION` is now `2`; `loadState` fills the two arrays when an older
save is loaded, which is covered by a migration test.

Deleting a block removes its source record when it was the last block from that source; *Delete source*
removes every block from that file in one action.

---

## Using it well

- **Pick the subject** when importing one subject's notes — the prior sharpens every assignment.
- **Keep syllabus wording in headings** (`# TCP Congestion control`). A title match alone is usually enough.
- **Import in chapters**, not whole textbooks: blocks stay reviewable and confidence stays meaningful.
- **Trust the flag, not the score**: review anything below 55%, especially blocks whose heading was missing.
- **Role of review**: a block that is filed under the wrong topic in the past is harmless — change the select,
  the summary and key terms are kept.

---

## Limits

- Matching is lexical. Synonyms the syllabus never uses will not match; assign those manually.
- Two-column academic PDFs often interleave their text layer; the block will still be readable but its
  sectioning may be coarse.
- Scanned PDFs need OCR (there is no OCR in the browser bundle by design).
- `.docx`/`.pptx` must be exported to PDF or text.
- A single import is capped at 400,000 characters and 20 MB per file.

---

## Extending

- **New file type:** add an extension to `ACCEPTED_EXTENSIONS` in `extract.ts` and handle it in
  `extractTextFromFile`. Anything that yields a string works unchanged downstream.
- **Tune matching:** the constants at the top of `ingest.ts` (`MATCH_SCORE_FLOOR`, `AUTO_ACCEPT_CONFIDENCE`,
  `LOW_CONFIDENCE`, `MAX_SECTION_CHARS`, `DUPLICATE_SIMILARITY`, `MAX_MATCHES`) are the knobs; the weights live
  in `buildIndex` and `matchText`. Re-run `npx vitest run tests/ingest.test.ts` after any change — the suite
  pins the four-subject behaviour.
- **New teaching subject:** the ingest engine reads only `ALL_TOPICS`, so a new subject is matched as soon as
  it exists in `src/data/syllabus.ts`.
