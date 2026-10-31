import type { Attempt, Bank, Domain, Level, Objective, ProgressSnapshot, Question } from './types';

export const NOW = new Date('2026-01-10T12:00:00.000Z');

export function mkQ(id: string, o: Partial<Question> = {}): Question {
  return {
    id, level: 'A1', objective_id: 'O1', format: 'fill_blank', prompt: 'p', answer: 'a',
    acceptable_alternatives: [], hint: 'h', explanation: 'e', difficulty: 1, ...o,
  };
}
export function mkO(id: string, level: Level = 'A1', domain: Domain = 'GRM', prerequisites: string[] = []): Objective {
  return { id, level, domain, skill: 's', description: 'd', prerequisites };
}
export function mkBank(objectives: Objective[], questions: Question[]): Bank {
  return { generated: '2026-01-01', includesUnverified: false, objectives, questions };
}
export function emptySnap(): ProgressSnapshot {
  return { schemaVersion: 1, attempts: [], cards: {}, settings: { accentStrict: false, autoHint: false }, session: {} };
}
export function mkA(o: Partial<Attempt> = {}): Attempt {
  return {
    questionId: 'q1', objectiveId: 'O1', variantGroup: 'g1', at: '2026-01-01T10:00:00.000Z',
    answer: 'x', outcome: 'correct', usedHint: false, tryNumber: 1, ...o,
  };
}
