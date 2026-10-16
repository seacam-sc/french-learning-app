# Project status

Last updated: 2026-10-16 · Current milestone: **1 — Research and architecture (awaiting approval)**

## Done
- Environment inspected (see "Environment findings").
- Schemas: `schemas/objective.schema.json`, `schemas/question.schema.json`.
- Zero-dependency validator: `scripts/mini-schema.mjs`, `scripts/validate-curriculum.mjs` (`npm run validate:curriculum`).
- Source research: `research/sources.md` (official sites blocked by network policy; search-result level only).
- Draft skill map: `curriculum/objectives.json` (AI-drafted, unverified).
- Agent definitions: `.claude/agents/` (5 workers).
- Docs: CLAUDE.md, README.md, ARCHITECTURE.md, CURRICULUM.md, DECISIONS.md.

## Environment findings
- Claude Code cloud session (claude.ai, started from iOS). No `ANTHROPIC_API_KEY` in the environment; provider is managed by the host; usage is reported against a five-hour rate-limit window with "overage: not in use". This is consistent with subscription usage, but the plan tier and whether "extra usage" is switched on can't be seen from inside the session — check in claude.ai Settings → Usage.
- Session model: Opus (medium effort), not Sonnet. Subagents run on haiku/sonnet as configured.
- Subagents supported; spawn depth limited to 1 (subagents cannot launch agents).
- Node 22, npm 10, Python 3.13, Chromium for Playwright available.
- Network policy blocks coe.int, rm.coe.int, france-education-international.fr, fli.atilf.fr (HTTP 403 at proxy).

## Tests
- `npm run validate:curriculum` — see latest result in commit message / below.

## Blockers / pending decisions
1. Approve architecture (D-001–D-003).
2. Hosting for iPhone (D-004).
3. Showing AI-reviewed questions before human approval (D-005).
4. Allow official source domains in the environment network settings (optional, needed to verify curriculum).

## Development plan

### Milestone 2 — Question-bank prototype
| Task | Owner | Acceptance criteria |
|---|---|---|
| 2.1 `scripts/validate-questions.mjs`: schema, unique ids, objective exists, level matches objective, mcq answer in choices, gap marker present for fill_blank, tokens rebuild the answer for sentence_order, duplicate prompt detection (normalised text) | supervisor/dev-worker | Unit tests with good and bad fixtures pass; exits non-zero on any error |
| 2.2 Pick ~25 representative objectives (A1–B2, all text domains) | supervisor | List recorded here |
| 2.3 Generate ~100 questions in 4 batches of ~25 | question-generator | All pass 2.1; status `structurally_validated` |
| 2.4 AI review | question-reviewer | Every question `ai_reviewed` or flagged with a specific reason |
| 2.5 QA report: `content/QA_REPORT.md` with counts by status/level/format and unresolved issues | supervisor | Report numbers match the data |
| 2.6 Human review flow: small batches of flagged items, showing only prompt/answer/alternatives/explanation; decisions applied by script | dev-worker | Decisions round-trip into the JSON with tests |

### Milestone 3 — Functional application
| Task | Acceptance criteria |
|---|---|
| 3.1 Vite + Preact + TS scaffold, PWA manifest, service worker | Builds; installs offline in Chromium |
| 3.2 Answer checker | Unit tests: case, spaces, apostrophes, punctuation, accents near-miss, alternatives |
| 3.3 Practice screen (one question; answer; feedback; explanation; hint; retry; another example; next) | Playwright flow passes at 390×844 and desktop; keyboard-only flow passes |
| 3.4 Progress store (IndexedDB) + export/import | Tests: reload mid-session resumes; export → import round-trip identical |
| 3.5 FSRS scheduling + objective stages + selection | Unit tests on due ordering, weak-first weighting, variant-group counting |
| 3.6 Topic picker, Progress view, Glossary panel, Settings | Playwright tests per screen |
| 3.7 Diagnostic (adaptive) | Simulated-answer tests produce expected profiles |

### Milestone 4 — Evaluation
Full test run, mobile check, curriculum coverage report, usability issues list, known issues, next-stage proposal.

## Next recommended action
Wait for user approval of the architecture and decisions D-004/D-005, then start task 2.1.
