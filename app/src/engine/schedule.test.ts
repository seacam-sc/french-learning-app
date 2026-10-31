import { describe, expect, it } from 'vitest';
import { isDue, ratingFor, updateCard } from './schedule';
import { mkA, NOW } from './testutil';
import { Rating } from 'ts-fsrs';

describe('ratingFor', () => {
  it('maps outcomes', () => {
    expect(ratingFor(mkA({ outcome: 'incorrect' }))).toBe(Rating.Again);
    expect(ratingFor(mkA({ outcome: 'near_miss' }))).toBe(Rating.Hard);
    expect(ratingFor(mkA({ usedHint: true }))).toBe(Rating.Hard);
    expect(ratingFor(mkA({ tryNumber: 2 }))).toBe(Rating.Hard);
    expect(ratingFor(mkA())).toBe(Rating.Good);
  });
});

describe('updateCard', () => {
  it('creates a card for a new question', () => {
    const c = updateCard(undefined, mkA(), NOW);
    expect(c.reps).toBe(1);
    expect(c.last_review).toBe(NOW.toISOString());
  });
  it('Good is due later than Again', () => {
    const good = updateCard(undefined, mkA(), NOW);
    const again = updateCard(undefined, mkA({ outcome: 'incorrect' }), NOW);
    expect(new Date(good.due).getTime()).toBeGreaterThan(new Date(again.due).getTime());
  });
  it('retry does not change the card', () => {
    const prev = updateCard(undefined, mkA(), NOW);
    expect(updateCard(prev, mkA({ tryNumber: 2 }), new Date('2026-01-11T00:00:00Z'))).toEqual(prev);
    expect(updateCard(undefined, mkA({ tryNumber: 2 }), NOW).reps).toBe(0);
  });
  it('round-trips through JSON', () => {
    const c1 = updateCard(undefined, mkA(), NOW);
    const c1b = JSON.parse(JSON.stringify(c1));
    const later = new Date(c1.due);
    expect(updateCard(c1b, mkA(), later)).toEqual(updateCard(c1, mkA(), later));
    expect(typeof c1.due).toBe('string');
  });
  it('isDue', () => {
    const c = updateCard(undefined, mkA(), NOW);
    expect(isDue(c, NOW)).toBe(false);
    expect(isDue(c, new Date(c.due))).toBe(true);
  });
});
