# CLAUDE.md — French learning app

Personal, adult-oriented, practice-first French app (A1→B2) for an English-speaking learner with inattentive ADHD.

## On every session start
1. Read this file, then PROJECT_STATUS.md.
2. `git status` / `git log --oneline -10`.
3. Continue the first unfinished item in PROJECT_STATUS.md. Do not redo completed research or regenerate approved content.
4. Before stopping: update PROJECT_STATUS.md (done, files changed, tests passed/failed, blockers, next action), commit, push.

## Hard rules
- £0 extra spend. Claude Pro subscription only. Never enable extra usage, API billing or paid services. Ask before adding any paid dependency.
- Max 2 subagents at once. Subagents never launch agents. Max 2 revision attempts per task, then record the problem.
- Prefer scripts and deterministic checks over model calls.
- No gamification: no points, coins, streaks, badges, mascots, leaderboards, celebrations, sound effects, exaggerated praise, penalties for missed days.
- No unexplained grammar terms in learner-facing text. Every term gets a plain-English explanation built from an example (see glossary).
- Questions are data (content/), never hard-coded in app code.
- Question statuses: generated → structurally_validated → ai_reviewed → linguistically_verified → approved. Only the human reviewer sets linguistically_verified/approved. AI agreement is never independent verification.
- Never invent official CEFR/DELF requirements. Cite source IDs from research/sources.md.
- Never report something as working without test evidence. Record known limitations.
- Ask the user before: architecture changes, paid services, public deployment, external accounts, destroying user data, changing educational scope.

## Agents (.claude/agents/)
- curriculum-worker (haiku) — curriculum records.
- question-generator (haiku) — candidate questions into content/candidates/ only.
- question-reviewer (sonnet) — AI review; never sets verified/approved.
- dev-worker (sonnet) — app code and tests.
- senior-reviewer (opus) — sparing use for hard problems.
Give every delegated task: bounded scope, exact output path, acceptance criteria, required test command.

## Commands
- `npm test` — unit tests (validators, review flow).
- `npm run validate:curriculum` — schema, ids, prerequisites, cycles.
- `npm run validate:questions [files] [--promote]` — question checks; --promote sets passing `generated` items to `structurally_validated`.
- `npm run qa` — writes content/QA_REPORT.md.
- `npm run review:sheet` — writes the next small human review sheet (content/review/sheet-NNN.md), flagged items first.
- `npm run review:apply -- content/review/sheet-NNN.md` — applies the human's ok / fix / reject decisions; approved items move to content/questions/<level>.json.

## Layout
schemas/ JSON Schemas · curriculum/ objectives · content/ questions (candidates/ = unapproved) · research/ sources · scripts/ validators and pipeline · app/ (Milestone 3)
