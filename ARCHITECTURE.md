# Architecture (approved 2026-10-31)

## Summary
A local-first Progressive Web App. Static files only, no server, no accounts, no analytics. Questions are JSON files in the repo; progress lives in the browser (IndexedDB) and can be exported/imported as a JSON file.

## Stack
| Part | Choice | Why |
|---|---|---|
| Language | TypeScript | Catches data/logic errors early |
| UI | Preact (~4 KB) | Component model without React's weight |
| Build/dev | Vite | One tool for dev server and static build |
| Offline/install | Hand-written service worker + web manifest | Avoids a plugin dependency; "Add to Home Screen" on iPhone |
| Progress storage | IndexedDB (thin wrapper written in-house) | Survives reloads; works offline |
| Scheduling | FSRS via `ts-fsrs` (MIT licence, free) | Current, documented open spaced-repetition algorithm; see below |
| Unit tests | Vitest | Same config as Vite |
| UI/flow tests | Playwright with pre-installed Chromium, iPhone-sized viewport | Tests real practice flow on mobile size |
| Content validation | Zero-dependency Node scripts (scripts/) | Runs anywhere, no model calls |

All dependencies are free, open-source npm packages. Nothing paid.

## Data flow
```
curriculum/objectives.json ──► content/candidates/*.json (generated)
                                   │ validate (script) → structurally_validated
                                   │ question-reviewer agent → ai_reviewed / flagged
                                   │ human review screen → linguistically_verified → approved
                                   ▼
                          content/questions/*.json (bank)
                                   │ build step copies approved items only
                                   ▼
                          app bundle (public/bank.json) ──► browser ──► IndexedDB progress
```

## Answer checking (deterministic, no AI)
- Normalise: Unicode NFC, lower-case, trim, collapse spaces, curly → straight apostrophes, ignore final punctuation.
- Match against `answer` + `acceptable_alternatives`.
- If correct apart from accents → "Almost — check the accents" (shown, not counted as correct).
- sentence_order: compare token sequence. mcq: compare choice.
- Open-ended writing/speaking (later): model-assessed only when explicitly requested; never for routine items.

## Learning engine
- **Per question:** FSRS card (stability, difficulty, due date) updated after each attempt. Grade: wrong=Again, right with hint/retry=Hard, right=Good.
- **Per objective:** stage = exposure → guided (correct with hint) → independent (correct without hint) → retained (correct without hint on a later day after an interval ≥ 3 days). Evidence counts **distinct variant_groups**, so seeing the same question again isn't counted as separate mastery.
- **Selection:** due reviews first, weighted towards weaker objectives; then new questions from objectives whose prerequisites are at least "guided"; interleave objectives so no long block of one topic. Topic picker overrides this.
- **Session:** no timer, no length requirement. Every answer saved immediately; closing the tab loses nothing.
- **Progress view:** accuracy, stage and last-practised date per objective; weakest areas listed. No scores-as-rewards.
- Question accuracy is shown as question accuracy only — never as a CEFR level.

## Diagnostic (Milestone 3–4)
Adaptive: start at A1 easy items per domain, step up a level after 3 correct in a row, step down after 2 wrong; stop a domain when two adjacent levels give mixed results. Output a provisional per-domain profile and seed objective stages. Re-runnable.

## Screens
Practice (one question, answer, feedback, explanation, hint, another example, retry, next) · Topics · Progress · Glossary (opens as a panel over the exercise) · Settings (accent strictness, show hints automatically, export/import progress) · Review (for approving questions; phone-friendly).

## Hosting (needs a decision — see DECISIONS.md D-004)
Local `npm run dev` works on desktop. Using it on the iPhone needs the static build hosted somewhere.

## Speech (later, not built now)
Browser Web Speech API (free, built in) for text-to-speech and recognition is the first option to investigate; quality varies by device. No paid speech APIs without approval.
