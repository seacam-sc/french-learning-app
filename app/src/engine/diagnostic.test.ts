import { describe, expect, it } from 'vitest';
import { diagnosticProfile, nextDiagnosticQuestion, recordDiagnosticAnswer, startDiagnostic } from './diagnostic';
import { mkBank, mkO, mkQ } from './testutil';
import type { Bank, Level, Outcome, Question } from './types';

function bigBank(domains: Array<'GRM' | 'VOC'>, perLevel = 5): Bank {
  const qs: Question[] = [];
  const levels: Level[] = ['A1', 'A2', 'B1', 'B2'];
  for (const d of domains) for (const l of levels) for (let i = 0; i < perLevel; i++)
    qs.push(mkQ(`${d}-${l}-${i}`, { objective_id: `O-${d}`, level: l, difficulty: i }));
  return mkBank(domains.map((d) => mkO(`O-${d}`, 'A1', d)), qs);
}

function run(bank: Bank, answer: (q: Question) => Outcome) {
  let s = startDiagnostic(bank);
  const asked: string[] = [];
  for (let i = 0; i < 200; i++) {
    const q = nextDiagnosticQuestion(bank, s);
    if (!q) break;
    asked.push(q.id);
    s = recordDiagnosticAnswer(s, q, answer(q));
  }
  return { s, asked, profile: diagnosticProfile(s) };
}

describe('diagnostic', () => {
  it('all right -> B2, 12 questions each', () => {
    const { profile } = run(bigBank(['GRM', 'VOC']), () => 'correct');
    expect(profile.GRM).toEqual({ estimate: 'B2', answered: 12, finished: true });
    expect(profile.VOC.estimate).toBe('B2');
  });
  it('all wrong -> below A1 after 2 questions', () => {
    const { profile } = run(bigBank(['GRM']), () => 'incorrect');
    expect(profile.GRM).toEqual({ estimate: 'below A1', answered: 2, finished: true });
  });
  it('right at A1/A2 then wrong at B1 -> A2', () => {
    const { profile } = run(bigBank(['GRM']), (q) => (q.level === 'B1' || q.level === 'B2' ? 'incorrect' : 'correct'));
    expect(profile.GRM).toEqual({ estimate: 'A2', answered: 8, finished: true });
  });
  it('near_miss counts as correct', () => {
    expect(run(bigBank(['GRM']), () => 'near_miss').profile.GRM.estimate).toBe('B2');
  });
  it('correct run resets on a wrong answer; wrong count is per level', () => {
    let k = 0;
    const pattern: Outcome[] = ['correct', 'correct', 'incorrect', 'correct', 'correct', 'correct'];
    const { profile } = run(bigBank(['GRM'], 8), () => pattern[k++] ?? 'incorrect');
    // A1 passed after 6 answers (1 wrong), then A2 two wrong -> stop at A1
    expect(profile.GRM.estimate).toBe('A1');
  });
  it('round-robins domains and never repeats', () => {
    const bank = bigBank(['GRM', 'VOC']);
    const { asked } = run(bank, () => 'correct');
    expect(new Set(asked).size).toBe(asked.length);
    expect(asked[0].startsWith('GRM')).toBe(true);
    expect(asked[1].startsWith('VOC')).toBe(true);
    expect(asked[2].startsWith('GRM')).toBe(true);
  });
  it('domain running out of questions finishes at current evidence', () => {
    const bank = bigBank(['GRM'], 3); // 3 per level
    const { profile } = run(bank, (q) => (q.level === 'A1' ? 'correct' : 'incorrect'));
    // A1 passed, A2 two wrong -> A1
    expect(profile.GRM.estimate).toBe('A1');
    const bank2 = mkBank([mkO('O-GRM', 'A1', 'GRM')], [
      mkQ('x1', { objective_id: 'O-GRM' }), mkQ('x2', { objective_id: 'O-GRM' }),
    ]);
    const r = run(bank2, () => 'correct');
    expect(r.asked).toEqual(['x1', 'x2']);
    expect(r.profile.GRM.finished).toBe(true);
    expect(r.profile.GRM.estimate).toBe('below A1');
  });
  it('immutable, and fresh state has null estimates', () => {
    const bank = bigBank(['GRM']);
    const s = startDiagnostic(bank);
    const before = JSON.stringify(s);
    recordDiagnosticAnswer(s, bank.questions[0], 'correct');
    expect(JSON.stringify(s)).toBe(before);
    expect(diagnosticProfile(s).GRM).toEqual({ estimate: null, answered: 0, finished: false });
  });
});
