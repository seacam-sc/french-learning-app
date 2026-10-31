import { createEmptyCard, fsrs, Rating, type Card, type Grade } from 'ts-fsrs';
import type { Attempt, CardState } from './types';

const scheduler = fsrs();

export function ratingFor(a: Attempt): Grade {
  if (a.outcome === 'incorrect') return Rating.Again;
  if (a.outcome === 'near_miss') return Rating.Hard;
  if (a.usedHint || a.tryNumber > 1) return Rating.Hard;
  return Rating.Good;
}

function toState(c: Card): CardState {
  const s: CardState = {
    due: c.due.toISOString(), stability: c.stability, difficulty: c.difficulty,
    elapsed_days: c.elapsed_days, scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps, reps: c.reps, lapses: c.lapses, state: c.state,
  };
  if (c.last_review) s.last_review = c.last_review.toISOString();
  return s;
}

function toCard(s: CardState): Card {
  const c: Card = {
    due: new Date(s.due), stability: s.stability, difficulty: s.difficulty,
    elapsed_days: s.elapsed_days, scheduled_days: s.scheduled_days,
    learning_steps: s.learning_steps, reps: s.reps, lapses: s.lapses, state: s.state,
  };
  if (s.last_review) c.last_review = new Date(s.last_review);
  return c;
}

export function newCardState(now: Date): CardState {
  return toState(createEmptyCard(now));
}

export function updateCard(prev: CardState | undefined, a: Attempt, now: Date): CardState {
  if (a.tryNumber > 1) return prev ?? newCardState(now);
  const card = prev ? toCard(prev) : createEmptyCard(now);
  return toState(scheduler.next(card, now, ratingFor(a)).card);
}

export function isDue(card: CardState, now: Date): boolean {
  return new Date(card.due).getTime() <= now.getTime();
}
