// Shared contract between engine (pure logic), store (persistence) and UI.
// Change only with supervisor approval.

export type Level = 'A1' | 'A2' | 'B1' | 'B2';
export type Domain = 'GRM' | 'VOC' | 'REA' | 'LIS' | 'WRI' | 'SPK' | 'PRA' | 'ADV';
export type Format =
  | 'mcq' | 'fill_blank' | 'sentence_completion' | 'sentence_order' | 'translate_en_fr' | 'translate_fr_en'
  | 'error_correction' | 'reading_comprehension' | 'listening_comprehension' | 'spoken_response' | 'extended_writing';

export interface Term { term: string; plain_explanation: string }

export interface Objective {
  id: string; level: Level; domain: Domain; skill: string; description: string;
  terms_introduced?: Term[]; examples?: string[]; prerequisites: string[];
}

export interface Question {
  id: string; level: Level; objective_id: string; variant_group?: string; format: Format;
  instruction?: string; passage?: string; prompt: string; choices?: string[]; tokens?: string[];
  answer: string; acceptable_alternatives: string[];
  answer_check?: { mode?: 'exact' | 'normalised' | 'model_assessed'; accent_policy?: 'strict' | 'near_miss' };
  hint: string; explanation: string; wrong_answer_feedback?: Record<string, string>;
  difficulty: number;
  /** true when the question is not human-approved (only present in builds made with --include-unverified) */
  unverified?: boolean;
}

/** Shape of app/public/bank.json, produced by scripts/build-bank.mjs */
export interface Bank {
  generated: string;            // ISO date
  includesUnverified: boolean;
  objectives: Objective[];      // only objectives that have at least one question
  questions: Question[];
}

export type Outcome = 'correct' | 'near_miss' | 'incorrect';

export interface CheckResult {
  outcome: Outcome;
  /** the accepted answer the input matched (or nearly matched) */
  matched?: string;
  /** targeted feedback from wrong_answer_feedback, if the input matched a known wrong answer */
  feedback?: string;
}

export interface Settings {
  /** true: an answer right apart from accents counts as incorrect; false: shown as near miss (never counted correct) */
  accentStrict: boolean;
  /** show the hint automatically before answering */
  autoHint: boolean;
}
export const DEFAULT_SETTINGS: Settings = { accentStrict: false, autoHint: false };

export interface Attempt {
  questionId: string;
  objectiveId: string;
  variantGroup: string;          // question.variant_group ?? question.id
  at: string;                    // ISO timestamp
  answer: string;
  outcome: Outcome;
  usedHint: boolean;
  /** 1 for first try at this question in this sitting, 2+ for retries */
  tryNumber: number;
}

/** Serialisable FSRS card (ts-fsrs Card with dates as ISO strings) */
export interface CardState {
  due: string; stability: number; difficulty: number; elapsed_days: number; scheduled_days: number;
  learning_steps: number; reps: number; lapses: number; state: number; last_review?: string;
}

export type Stage = 'new' | 'exposure' | 'guided' | 'independent' | 'retained';

export interface ObjectiveProgress {
  objectiveId: string;
  stage: Stage;
  attempts: number;
  firstTryCorrect: number;       // first-try correct answers without hint
  accuracy: number | null;       // firstTryCorrect / first tries, null if none
  distinctGroupsCorrect: number; // distinct variant groups answered correctly first try without hint
  lastPractised: string | null;
}

/** Everything persisted for one learner. Export/import uses exactly this JSON. */
export interface ProgressSnapshot {
  schemaVersion: 1;
  attempts: Attempt[];
  cards: Record<string, CardState>;   // by question id
  settings: Settings;
  session: { currentQuestionId?: string; topic?: string } ;
  diagnostic?: unknown;               // engine-owned diagnostic state
}

/** Topic filter: an objective id ("FR-A1-GRM-007"), a level ("A1"), a domain ("GRM"), or undefined for automatic */
export type Topic = string | undefined;
