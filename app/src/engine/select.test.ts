import { describe, expect, it } from 'vitest';
import { anotherExample, selectNext } from './select';
import { updateCard } from './schedule';
import { emptySnap, mkA, mkBank, mkO, mkQ, NOW } from './testutil';

const past = new Date('2025-12-01T00:00:00Z');
const seenCard = (qid: string, outcome: 'correct' | 'incorrect' = 'correct', at = past) =>
  updateCard(undefined, mkA({ questionId: qid, outcome }), at);

describe('selectNext', () => {
  const bank = mkBank(
    [mkO('O1', 'A1', 'GRM'), mkO('O2', 'A1', 'VOC'), mkO('O3', 'A2', 'GRM', ['O1'])],
    [
      mkQ('a1', { objective_id: 'O1', variant_group: 'g1' }),
      mkQ('a2', { objective_id: 'O1', variant_group: 'g2', difficulty: 2 }),
      mkQ('b1', { objective_id: 'O2' }),
      mkQ('c1', { objective_id: 'O3', level: 'A2' }),
    ],
  );

  it('returns null for empty topic', () => expect(selectNext(bank, emptySnap(), NOW, 'B2', [])).toBeNull());

  it('topic filters: objective, level, domain', () => {
    expect(selectNext(bank, emptySnap(), NOW, 'O2', [])!.id).toBe('b1');
    expect(selectNext(bank, emptySnap(), NOW, 'A2', [])!.objective_id).toBe('O3');
    expect(selectNext(bank, emptySnap(), NOW, 'VOC', [])!.id).toBe('b1');
  });

  it('unseen ordered by level, difficulty, id; gated prereqs skipped', () => {
    expect(selectNext(bank, emptySnap(), NOW, undefined, [])!.id).toBe('a1');
    // c1 needs O1 at guided: not selectable while unseen alternatives exist
    const snap = emptySnap();
    snap.cards.a1 = seenCard('a1'); snap.cards.a2 = seenCard('a2'); snap.cards.b1 = seenCard('b1');
    snap.cards.a1 = updateCard(undefined, mkA({ questionId: 'a1' }), NOW); // not due
    snap.cards.a2 = snap.cards.a1; snap.cards.b1 = snap.cards.a1;
    // all seen & not due, c1 locked: fallback picks seen over locked
    expect(selectNext(bank, snap, NOW, undefined, [])!.id).not.toBe('c1');
  });

  it('unlocks unseen when prerequisite is guided', () => {
    const snap = emptySnap();
    snap.attempts = [mkA({ questionId: 'a1', objectiveId: 'O1' })];
    snap.cards.a1 = updateCard(undefined, snap.attempts[0], NOW);
    const q = selectNext(bank, snap, NOW, 'A2', []);
    expect(q!.id).toBe('c1');
  });

  it('ignores prerequisites not in the bank', () => {
    const b = mkBank([mkO('X', 'A1', 'GRM', ['MISSING'])], [mkQ('x1', { objective_id: 'X' })]);
    expect(selectNext(b, emptySnap(), NOW, undefined, [])!.id).toBe('x1');
  });

  it('due cards come before unseen, weakest objective first', () => {
    const snap = emptySnap();
    snap.attempts = [
      mkA({ questionId: 'a1', objectiveId: 'O1', variantGroup: 'g1' }),
      mkA({ questionId: 'a2', objectiveId: 'O1', variantGroup: 'g2' }),
      mkA({ questionId: 'b1', objectiveId: 'O2', outcome: 'incorrect', variantGroup: 'b1' }),
    ];
    for (const a of snap.attempts) snap.cards[a.questionId] = updateCard(undefined, a, past);
    // O2 (exposure) weaker than O1 (independent)
    expect(selectNext(bank, snap, NOW, undefined, [])!.id).toBe('b1');
  });

  it('among equal weakness, most overdue first', () => {
    const snap = emptySnap();
    const a = mkA({ questionId: 'a1' }), b = mkA({ questionId: 'a2' });
    snap.attempts = [a, b];
    snap.cards.a1 = updateCard(undefined, a, new Date('2025-12-10T00:00:00Z'));
    snap.cards.a2 = updateCard(undefined, b, new Date('2025-11-01T00:00:00Z'));
    expect(selectNext(bank, snap, NOW, 'O1', [])!.id).toBe('a2');
  });

  it('falls back to soonest-due seen question', () => {
    const snap = emptySnap();
    const b = mkBank([mkO('O1')], [mkQ('a1'), mkQ('a2')]);
    snap.cards.a1 = updateCard(undefined, mkA({ questionId: 'a1' }), NOW);
    snap.cards.a2 = updateCard(undefined, mkA({ questionId: 'a2', outcome: 'incorrect' }), NOW);
    expect(selectNext(b, snap, NOW, undefined, [])!.id).toBe('a2');
  });

  it('excludes recent ids and avoids same objective when possible', () => {
    expect(selectNext(bank, emptySnap(), NOW, undefined, ['a1'])!.id).toBe('b1');
    expect(selectNext(bank, emptySnap(), NOW, 'O1', ['a1'])!.id).toBe('a2');
    // only one question: still returned
    expect(selectNext(bank, emptySnap(), NOW, 'O2', ['b1'])!.id).toBe('b1');
  });

  it('is deterministic', () => {
    expect(selectNext(bank, emptySnap(), NOW, undefined, [])).toEqual(selectNext(bank, emptySnap(), NOW, undefined, []));
  });
});

describe('anotherExample', () => {
  const bank = mkBank([mkO('O1'), mkO('O2')], [
    mkQ('a1', { variant_group: 'g1' }),
    mkQ('a2', { variant_group: 'g1' }),
    mkQ('a3', { variant_group: 'g2' }),
    mkQ('a4', { variant_group: 'g3' }),
    mkQ('b1', { objective_id: 'O2' }),
  ]);
  it('prefers different group, then unseen', () => {
    const snap = emptySnap();
    snap.cards.a3 = updateCard(undefined, mkA({ questionId: 'a3' }), NOW);
    expect(anotherExample(bank, bank.questions[0], snap, [])!.id).toBe('a4');
  });
  it('never returns same id or other objective', () => {
    const r = anotherExample(bank, bank.questions[0], emptySnap(), [])!;
    expect(r.id).not.toBe('a1');
    expect(r.objective_id).toBe('O1');
  });
  it('falls back to same group, different id', () => {
    const b = mkBank([mkO('O1')], [mkQ('a1', { variant_group: 'g' }), mkQ('a2', { variant_group: 'g' })]);
    expect(anotherExample(b, b.questions[0], emptySnap(), [])!.id).toBe('a2');
  });
  it('null when none', () => {
    expect(anotherExample(bank, bank.questions[4], emptySnap(), [])).toBeNull();
  });
});
