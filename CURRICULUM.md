# Curriculum

## Structure
Each CEFR level (A1, A2, B1, B2) is broken into individual learning objectives in `curriculum/objectives.json` (format: `schemas/objective.schema.json`). Progress is tracked per objective, so the learner can be at different levels in different skills.

ID format: `FR-<level>-<domain>-<nnn>`, e.g. `FR-A2-GRM-003`.

| Code | Domain |
|---|---|
| GRM | Grammar and sentence building |
| VOC | Vocabulary |
| REA | Reading |
| LIS | Listening |
| WRI | Writing |
| SPK | Speaking |
| PRA | Practical communication (family, work, school, housing, travel, health, French administration) |
| ADV | Advanced communication (opinions, argument, abstract topics) — B1/B2 only |

Each objective holds: id, level, domain, skill, plain-English description, terms introduced (with plain explanations), examples, prerequisites, question types, source references, provenance, verification status.

## What kind of information each source gives
Kept separate, as required:
1. **Official proficiency descriptors** — what a learner can do at each level: CEFR 2001, CEFR Companion Volume 2020 (CEFR-CV-2020), CoE descriptor database.
2. **Published linguistic content inventories** — which grammar and vocabulary belong at each level for French: the *Niveau A1/A2/B1/B2 pour le français* reference volumes (RLD-FR, Didier). Not freely available; copyrighted.
3. **Exam specifications** — how DELF tests each level (FEI-DELF).
4. **Recommended teaching sequence** — the order of grammar inside each level. **The current objectives use a common teaching sequence drafted by AI**; level placements are not yet checked against RLD-FR.
5. **AI-generated instructional material** — all descriptions, examples and explanations in the objectives file (`provenance: "ai-drafted"`).

Full source records, URLs, retrieval dates and confidence: `research/sources.md`.

## Verification state (2026-10-16)
- The environment's network policy blocks coe.int, rm.coe.int, france-education-international.fr and fli.atilf.fr, so no official document has been read directly. Source details come from search results and are marked confirmed / partly confirmed / unconfirmed.
- All objectives are `verification_status: "ai-drafted"`. None is claimed as an official requirement.
- To move objectives to `checked-against-source`: allow those hosts (or supply the documents), then check CEFR-CV-2020 descriptor scales for REA/LIS/WRI/SPK/PRA/ADV, and RLD-FR inventories for GRM/VOC placement.

## Copyright
CEFR-CV-2020 reportedly carries an "all rights reserved" notice (unconfirmed). Descriptors are used only to set objectives, never reproduced in bulk in the app. DELF sample papers and textbook exercises are never copied; all questions are original.

## Glossary
Every grammar term that appears in `terms_introduced` feeds the in-app glossary, with its plain-English explanation and example.
