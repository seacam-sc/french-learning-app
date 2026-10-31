import { describe, expect, it } from 'vitest';
import { allProgress, objectiveProgress } from './progress';
import { mkA, NOW } from './testutil';

const P = (a: ReturnType<typeof mkA>[]) => objectiveProgress('O1', a, NOW);

describe('objectiveProgress', () => {
  it('new', () => {
    const p = P([]);
    expect(p.stage).toBe('new');
    expect(p.accuracy).toBeNull();
    expect(p.lastPractised).toBeNull();
  });
  it('exposure when nothing correct', () => {
    expect(P([mkA({ outcome: 'incorrect' })]).stage).toBe('exposure');
  });
  it('guided with a hinted correct', () => {
    const p = P([mkA({ usedHint: true })]);
    expect(p.stage).toBe('guided');
    expect(p.firstTryCorrect).toBe(0);
  });
  it('repeating the same variant group never reaches independent', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      mkA({ questionId: `q${i}`, variantGroup: 'same', at: `2026-01-${String(1 + (i % 28)).padStart(2, '0')}T10:00:00Z` }));
    const p = P(many);
    expect(p.stage).toBe('guided');
    expect(p.distinctGroupsCorrect).toBe(1);
    expect(p.accuracy).toBe(1);
  });
  it('independent with two groups', () => {
    const p = P([mkA({ variantGroup: 'a' }), mkA({ variantGroup: 'b' })]);
    expect(p.stage).toBe('independent');
  });
  it('retained needs clean correct 3+ days later', () => {
    const base = [mkA({ variantGroup: 'a', at: '2026-01-01T10:00:00Z' }), mkA({ variantGroup: 'b', at: '2026-01-03T10:00:00Z' })];
    expect(P(base).stage).toBe('independent');
    expect(P([...base, mkA({ variantGroup: 'a', at: '2026-01-04T08:00:00Z' })]).stage).toBe('retained');
  });
  it('retries and other objectives ignored; accuracy counts first tries', () => {
    const p = P([
      mkA({ outcome: 'incorrect', at: '2026-01-02T00:00:00Z' }),
      mkA({ tryNumber: 2, at: '2026-01-02T00:01:00Z' }),
      mkA({ objectiveId: 'O2' }),
    ]);
    expect(p.attempts).toBe(2);
    expect(p.accuracy).toBe(0);
    expect(p.stage).toBe('guided');
    expect(p.lastPractised).toBe('2026-01-02T00:01:00Z');
  });
  it('allProgress', () => {
    const r = allProgress(['O1', 'O2'], [mkA()], NOW);
    expect(r.O1.stage).toBe('guided');
    expect(r.O2.stage).toBe('new');
  });
});
