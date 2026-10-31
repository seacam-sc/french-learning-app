# French learning app

A personal, practice-first French app (A1 → B2) for an adult learner. Clean revision-app style, no gamification.

Status: Milestone 3 done — working local app. See PROJECT_STATUS.md.

## Run it
```
npm install
npm run dev      # local app with live reload
npm run build    # static site in dist/
```

## Requirements
Node 22+.

## Commands
- `npm run typecheck` · `npm run test:e2e` (Playwright, mobile + desktop)
- `npm test` — unit tests (validators, review flow).
- `npm run validate:curriculum` — schema, ids, prerequisites, cycles.
- `npm run validate:questions [files] [--promote]` — question checks; --promote sets passing `generated` items to `structurally_validated`.
- `npm run qa` — writes content/QA_REPORT.md.
- `npm run review:sheet` — writes the next small human review sheet (content/review/sheet-NNN.md), flagged items first.
- `npm run review:apply -- content/review/sheet-NNN.md` — applies the human's ok / fix / reject decisions; approved items move to content/questions/<level>.json.

## Folders
- `schemas/` — data formats for objectives and questions
- `curriculum/` — learning objectives A1–B2
- `content/` — question bank (`candidates/` holds unapproved questions)
- `research/` — sources and retrieval notes
- `scripts/` — validators and content pipeline
- `.claude/agents/` — worker definitions for Claude Code
