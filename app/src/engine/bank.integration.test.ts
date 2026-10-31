// Runs the answer checker against every real question in content/ so data and checker stay consistent.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { checkAnswer } from './check';
import { DEFAULT_SETTINGS, type Question } from './types';

const load = (dir: string): Question[] =>
  !existsSync(dir) ? [] : readdirSync(dir).filter((f: string) => f.endsWith('.json')).flatMap((f: string) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
const questions = [...load('content/candidates'), ...load('content/questions')];

describe('real question bank', () => {
  it('has questions', () => expect(questions.length).toBeGreaterThan(0));
  for (const q of questions) {
    it(`${q.id}: answer and alternatives are accepted`, () => {
      for (const a of [q.answer, ...q.acceptable_alternatives]) expect(checkAnswer(q, a, DEFAULT_SETTINGS).outcome).toBe('correct');
    });
    if (q.choices) it(`${q.id}: wrong choices are rejected`, () => {
      for (const c of q.choices!.filter((c) => c !== q.answer)) expect(checkAnswer(q, c, DEFAULT_SETTINGS).outcome).toBe('incorrect');
    });
  }
});
