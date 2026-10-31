import type { CheckResult, Question, Settings } from './types';

/** Normalise for comparison: NFC, lower-case, straight quotes, tidy spaces, ignore final punctuation. */
export function normalise(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‘’ʼ′]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ +([?!:;,])/g, '$1')
    .replace(/[.!?]+$/, '')
    .trim();
}

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
}

export function checkAnswer(q: Question, input: string, settings: Settings): CheckResult {
  const n = normalise(input);
  if (n === '') return { outcome: 'incorrect' };

  const accepted = [q.answer, ...q.acceptable_alternatives];
  for (const a of accepted) {
    if (normalise(a) === n) return { outcome: 'correct', matched: a };
  }
  const bare = stripAccents(n);
  for (const a of accepted) {
    if (stripAccents(normalise(a)) === bare) {
      return { outcome: settings.accentStrict ? 'incorrect' : 'near_miss', matched: a };
    }
  }
  if (q.wrong_answer_feedback) {
    for (const [k, text] of Object.entries(q.wrong_answer_feedback)) {
      if (normalise(k) === n) return { outcome: 'incorrect', feedback: text };
    }
  }
  return { outcome: 'incorrect' };
}
