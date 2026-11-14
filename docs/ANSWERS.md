# Deep Learning Answer Master

A module inside EXAMFORGE that answers the uploaded Deep Learning question bank and any new
Deep Learning question you ask, in university examination format.

Open it at **Answer Master** in the sidebar (`#/answers`).

## What is imported

The uploaded `Deep_Learning_Question_Bank(2).docx` is embedded verbatim (`src/data/answerMaster/source.ts`)
and parsed at runtime. Nothing is retyped into records, so numbering and wording cannot drift.

| Part of the document | Count | Numbering |
|---|---|---|
| Five standalone numerical problems at the head | 5 | `N1`–`N5` |
| Numbered questions | 234 | `1`–`234` |
| **Total** | **239** | preserved, in document order |

Each question carries its original number, text, unit (from its matched syllabus topic), detected
type, suggested marks and difficulty. The bank documents 234 numbered questions; the five numerical
problems are printed above them without numbers, so they are imported as `N1`–`N5` rather than
invented as question 235.

Unit assignment follows the closest syllabus topic, which is why some early numericals sit in Unit 2
(perceptron work) even though they appear before question 1.

## How an answer is produced

`src/engine/answerMaster.ts` composes answers from three sources only:

1. the question text itself,
2. the authored five-level content of the matched syllabus topic (`src/data/content/`),
3. computed numerical solutions (`src/data/answerMaster/numericals.ts`).

No network call, no language model, no hidden generation. Every answer is reproducible.

### Numerical questions

The mandatory shape is enforced: **GIVEN → TO FIND / TO PROVE → FORMULA USED → SOLUTION →
CONCLUSION**. Each step is computed in TypeScript from the question's own values, and the solver
adds checks (for example “probabilities sum to 1”, “loss decreased”, “all four samples processed”).

Some questions name the operations but omit the numbers (`110`, `161`, `220`, `221`, `228`) or give
only a shape (`225`). For those the module lists exactly what is missing and gives the complete method,
instead of inventing values. `225` additionally shows an explicitly labelled illustrative computation.

### Theory, comparison, application, diagram and long answers

The answered content is the topic's own material, assembled into the structure the question needs:

- **theory** — direct answer, definition and core concept, working principle, maths, comparison table,
  diagram, worked example, advantages/limitations, applications, conclusion;
- **comparison** — introduction, comparison table, differences, conclusion;
- **application** — scenario, underlying concept, methodology, step-by-step application, expected
  result, limitations, conclusion;
- **diagram** — a text diagram rendered from the topic's diagram specification, with components and flow.

Depth follows the marks: 2 marks gets a short answer, 5 marks a structured one, 8–10 a full answer.
You can override the depth on any question, or ask for a simpler/longer/example variant.

## Ask Any Deep Learning Question

The second tab accepts a pasted question, a `.txt`/`.md` file, or a bank question loaded into the box.
It:

1. detects the question type and a suggested marks depth,
2. finds the closest of the 48 DL syllabus topics (term overlap + curated hints),
3. solves numericals it can verify — sigmoid/tanh-style activations, softmax, MSE, perceptron forward
   pass and parameter counts — reading values only from your question,
4. otherwise builds the appropriate answer format from the matched topic,
5. flags a weak/outside-syllabus match and lists missing information.

Follow-ups (“explain more simply”, “longer answer”, “another example”) recompose the answer; you can
also type a follow-up that is solved as a new question with the previous one in context.

PDF question upload is not available in this box (the Add Material module reads PDFs for study notes).

## Statuses and progress

- `UNANSWERED` → `GENERATED` → `CHECKED`, plus `NEEDS CORRECTION` at any time.
- **Checked** requires every verification item to pass; generating an answer never checks it.
- **Revised** is a separate flag you set explicitly — merely opening an answer does not set it.
- Important, difficult and favourite flags are independent.
- Progress is stored per question in `AppState.answers`, which is version-4 state; all earlier data
  (topics, plan, materials, attempts, mocks, revisions) is untouched.

## Limitations

- The answers are grounded in the repository's authored syllabus content. They are not a substitute
  for a lecturer's marking scheme, and the module does not claim guaranteed marks.
- Numerical solvers cover the bank's numerical questions plus a small free-form set. Other numerical
  wording returns the method and a missing-input list rather than a guessed result.
- Free-form topic matching is lexical; an unusual phrasing can match a neighbouring topic, and the
  answer says which topic it used.
- No OCR: scanned question papers must be typed or converted to text first.
