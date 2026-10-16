# French learning app

A personal, practice-first French app (A1 → B2) for an adult learner. Clean revision-app style, no gamification.

Status: Milestone 1 (research and architecture). No app yet — see PROJECT_STATUS.md.

## Requirements
Node 22+.

## Commands
```
npm run validate:curriculum   # check curriculum/objectives.json
```

## Folders
- `schemas/` — data formats for objectives and questions
- `curriculum/` — learning objectives A1–B2
- `content/` — question bank (`candidates/` holds unapproved questions)
- `research/` — sources and retrieval notes
- `scripts/` — validators and content pipeline
- `.claude/agents/` — worker definitions for Claude Code
