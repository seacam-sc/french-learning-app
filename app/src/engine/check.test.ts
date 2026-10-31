import { describe, expect, it } from 'vitest';
import { checkAnswer } from './check';
import { mkQ } from './testutil';
import { DEFAULT_SETTINGS } from './types';

const S = DEFAULT_SETTINGS;
const q = mkQ('c', {
  answer: "Ça va ? J'ai un café.",
  acceptable_alternatives: ["Ça va ? J'ai un café !"],
  wrong_answer_feedback: { 'ca va': 'Hint: accent and wording.', "Je suis": 'Use "j\'ai" here.' },
});
const simple = mkQ('s', { answer: 'Ça va', acceptable_alternatives: ['Salut'], wrong_answer_feedback: { Bonjour: 'Too formal.' } });

describe('checkAnswer', () => {
  it('ignores case', () => expect(checkAnswer(simple, 'ÇA VA', S).outcome).toBe('correct'));
  it('collapses and trims spaces', () => expect(checkAnswer(simple, '  ça   va  ', S).outcome).toBe('correct'));
  it('curly apostrophes', () => expect(checkAnswer(q, 'Ça va? J’ai un café', S).outcome).toBe('correct'));
  it('French spacing before ?', () => {
    expect(checkAnswer(simple, 'Ça va ?', S).outcome).toBe('correct');
    expect(checkAnswer(simple, 'ça va?', S).outcome).toBe('correct');
    expect(checkAnswer(simple, 'Ça va', S).outcome).toBe('correct');
  });
  it('trailing punctuation', () => {
    expect(checkAnswer(simple, 'Ça va.', S).outcome).toBe('correct');
    expect(checkAnswer(simple, 'Ça va !', S).outcome).toBe('correct');
  });
  it('acceptable alternatives', () => {
    const r = checkAnswer(simple, 'salut', S);
    expect(r).toEqual({ outcome: 'correct', matched: 'Salut' });
  });
  it('accent near miss', () => {
    const r = checkAnswer(simple, 'ca va', S);
    expect(r.outcome).toBe('near_miss');
    expect(r.matched).toBe('Ça va');
  });
  it('accentStrict makes it incorrect but keeps matched', () => {
    const r = checkAnswer(simple, 'ca va', { ...S, accentStrict: true });
    expect(r.outcome).toBe('incorrect');
    expect(r.matched).toBe('Ça va');
  });
  it('wrong_answer_feedback (normalised keys)', () => {
    expect(checkAnswer(simple, 'bonjour !', S)).toEqual({ outcome: 'incorrect', feedback: 'Too formal.' });
  });
  it('plain incorrect has no feedback', () => expect(checkAnswer(simple, 'xyz', S)).toEqual({ outcome: 'incorrect' }));
  it('sentence_order joined tokens', () => {
    const o = mkQ('o', { format: 'sentence_order', tokens: ['je', 'suis', 'ici'], answer: 'Je suis ici.' });
    expect(checkAnswer(o, ['je', 'suis', 'ici'].join(' '), S).outcome).toBe('correct');
    expect(checkAnswer(o, 'suis je ici', S).outcome).toBe('incorrect');
  });
  it('empty input', () => {
    expect(checkAnswer(simple, '', S).outcome).toBe('incorrect');
    expect(checkAnswer(simple, '   ', S).outcome).toBe('incorrect');
  });
});
