import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkQuestions, normalise } from '../scripts/validate-questions.mjs';

const objectives = [{ id: 'FR-A1-GRM-007', level: 'A1', question_types: ['mcq', 'fill_blank', 'sentence_order'] }];
const base = {
  id: 'Q-A1-GRM-007-001', version: 1, level: 'A1', objective_id: 'FR-A1-GRM-007', format: 'fill_blank',
  prompt: 'Je ___ mange pas.', answer: 'ne', acceptable_alternatives: [], hint: 'Two words wrap the verb.',
  explanation: 'French puts ne before the verb and pas after it.', difficulty: 1, status: 'generated',
  provenance: { method: 'ai-generated', date: '2026-10-31' },
};
const run = (qs) => checkQuestions(qs, objectives);

test('valid question passes', () => assert.deepEqual(run([base]).errors, []));
test('duplicate id', () => assert.match(run([base, base]).errors.join(), /duplicate id/));
test('missing objective', () => assert.match(run([{ ...base, objective_id: 'FR-A1-GRM-099', id: 'Q-A1-GRM-099-001' }]).errors.join(), /does not exist/));
test('level mismatch', () => assert.match(run([{ ...base, level: 'A2' }]).errors.join(), /level A2 does not match/));
test('id not matching objective', () => assert.match(run([{ ...base, id: 'Q-A1-GRM-008-001' }]).errors.join(), /id does not match/));
test('fill_blank needs gap', () => assert.match(run([{ ...base, prompt: 'Je mange pas.' }]).errors.join(), /needs ___/));
test('missing required field', () => { const q = { ...base }; delete q.hint; assert.match(run([q]).errors.join(), /missing required "hint"/); });
test('bad status enum', () => assert.match(run([{ ...base, status: 'done' }]).errors.join(), /must be one of/));
test('mcq answer must be a choice', () => {
  const q = { ...base, format: 'mcq', prompt: 'Choose', choices: ['pas', 'plus'], answer: 'ne' };
  assert.match(run([q]).errors.join(), /not one of the choices/);
});
test('mcq with two correct choices', () => {
  const q = { ...base, format: 'mcq', prompt: 'Choose', choices: ['ne', "n'", 'pas'], answer: 'ne', acceptable_alternatives: ["n'"] };
  assert.match(run([q]).errors.join(), /more than one choice/);
});
test('sentence_order tokens must rebuild answer', () => {
  const ok = { ...base, format: 'sentence_order', prompt: 'Put in order', tokens: ['pas', 'Je', 'mange', 'ne'], answer: 'Je ne mange pas' };
  assert.deepEqual(run([ok]).errors, []);
  assert.match(run([{ ...ok, tokens: ['Je', 'mange', 'pas'] }]).errors.join(), /tokens do not rebuild/);
});
test('hint giving away answer', () => assert.match(run([{ ...base, answer: 'mange', prompt: 'Je ne ___ pas.', hint: 'The word is mange.' }]).errors.join(), /gives away/));
test('duplicate prompt is a warning', () => assert.match(run([base, { ...base, id: 'Q-A1-GRM-007-002' }]).warnings.join(), /same prompt/));
test('normalise apostrophes, case, spaces, final punctuation', () => {
  assert.equal(normalise('  J’AI   faim ! '), "j'ai faim");
});
test('reading_comprehension may have choices; fill_blank may not', () => {
  const r = { ...base, format: 'reading_comprehension', passage: 'Fermé le lundi.', prompt: 'When is it closed?', choices: ['Monday', 'Sunday'], answer: 'Monday' };
  assert.deepEqual(run([r]).errors, []);
  assert.match(run([{ ...base, choices: ['ne', 'pas'] }]).errors.join(), /choices not allowed/);
});
