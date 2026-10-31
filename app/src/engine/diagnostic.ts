import type { Bank, Level, Outcome, Question } from './types';

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2'];
const MAX_PER_DOMAIN = 12;

interface DomState {
  level: number;       // index into LEVELS currently being tested
  run: number;         // correct in a row at this level
  wrong: number;       // incorrect at this level
  answered: number;
  passed: number;      // highest level index passed (-1 none)
  done: boolean;
}

export interface DiagState {
  domains: string[];
  objectiveDomain: Record<string, string>;
  /** question ids per domain per level, easiest first */
  pool: Record<string, Record<Level, string[]>>;
  asked: string[];
  per: Record<string, DomState>;
}

export function startDiagnostic(bank: Bank): DiagState {
  const objectiveDomain: Record<string, string> = {};
  for (const o of bank.objectives) objectiveDomain[o.id] = o.domain;
  const pool: DiagState['pool'] = {};
  const sorted = [...bank.questions].sort((a, b) => a.difficulty - b.difficulty || (a.id < b.id ? -1 : 1));
  for (const q of sorted) {
    const d = objectiveDomain[q.objective_id];
    if (!d) continue;
    pool[d] ??= { A1: [], A2: [], B1: [], B2: [] };
    pool[d][q.level].push(q.id);
  }
  const domains = Object.keys(pool).sort();
  const per: Record<string, DomState> = {};
  for (const d of domains) per[d] = { level: 0, run: 0, wrong: 0, answered: 0, passed: -1, done: false };
  return { domains, objectiveDomain, pool, asked: [], per };
}

function available(state: DiagState, d: string): string | undefined {
  const p = state.per[d];
  if (p.done) return undefined;
  return state.pool[d][LEVELS[p.level]].find((id) => !state.asked.includes(id));
}

export function nextDiagnosticQuestion(bank: Bank, state: DiagState): Question | null {
  let best: { d: string; id: string } | null = null;
  for (const d of state.domains) {
    const id = available(state, d);
    if (id === undefined) continue;
    if (!best || state.per[d].answered < state.per[best.d].answered) best = { d, id };
  }
  return best ? bank.questions.find((q) => q.id === best!.id) ?? null : null;
}

export function recordDiagnosticAnswer(state: DiagState, q: Question, outcome: Outcome): DiagState {
  const d = state.objectiveDomain[q.objective_id];
  const cur = d ? state.per[d] : undefined;
  if (!d || !cur || cur.done) return state;
  const p = { ...cur, answered: cur.answered + 1 };
  if (outcome === 'incorrect') {
    p.run = 0;
    p.wrong += 1;
    if (p.wrong >= 2) p.done = true;
  } else {
    p.run += 1;
    if (p.run >= 3) {
      p.passed = p.level;
      if (p.level === LEVELS.length - 1) p.done = true;
      else { p.level += 1; p.run = 0; p.wrong = 0; }
    }
  }
  if (p.answered >= MAX_PER_DOMAIN) p.done = true;
  return { ...state, asked: [...state.asked, q.id], per: { ...state.per, [d]: p } };
}

export function diagnosticProfile(
  state: DiagState,
): Record<string, { estimate: Level | 'below A1' | null; answered: number; finished: boolean }> {
  const out: Record<string, { estimate: Level | 'below A1' | null; answered: number; finished: boolean }> = {};
  for (const d of state.domains) {
    const p = state.per[d];
    const finished = p.done || available(state, d) === undefined;
    let estimate: Level | 'below A1' | null;
    if (p.passed >= 0) estimate = LEVELS[p.passed];
    else if (p.answered === 0) estimate = null;
    else if (finished) estimate = 'below A1';
    else estimate = null;
    out[d] = { estimate, answered: p.answered, finished };
  }
  return out;
}
