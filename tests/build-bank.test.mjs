import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBank } from '../scripts/build-bank.mjs';

const objectives = [
  { id: 'FR-A1-GRM-001', version: 1, level: 'A1', domain: 'GRM', skill: 's', description: 'd', examples: ['x'], prerequisites: [], question_types: ['mcq'], source_refs: [] },
  { id: 'FR-A1-GRM-002', version: 1, level: 'A1', domain: 'GRM', skill: 's2', description: 'd2', prerequisites: ['FR-A1-GRM-001'] },
];
const q = (id, status, obj = 'FR-A1-GRM-001') => ({ id, version: 1, level: 'A1', objective_id: obj, format: 'mcq', prompt: 'p', answer: 'a', acceptable_alternatives: [], hint: 'h', explanation: 'e', difficulty: 1, status, flags: ['f'], review_notes: 'n', provenance: { method: 'm' } });
const date = '2026-10-31';

test('approved only by default', () => {
  const b = buildBank({ objectives, approved: [q('A', 'approved'), q('B', 'ai_reviewed')], candidates: [q('C', 'ai_reviewed')], date });
  assert.deepEqual(b.questions.map((x) => x.id), ['A']);
  assert.equal(b.includesUnverified, false);
  assert.equal(b.generated, date);
  assert.equal(b.questions[0].unverified, undefined);
});
test('include unverified adds ai_reviewed candidates flagged', () => {
  const b = buildBank({ objectives, approved: [q('A', 'approved')], candidates: [q('C', 'ai_reviewed')], includeUnverified: true, date });
  assert.deepEqual(b.questions.map((x) => [x.id, x.unverified]), [['A', undefined], ['C', true]]);
  assert.equal(b.includesUnverified, true);
});
test('excluded statuses never included', () => {
  const cs = ['generated', 'structurally_validated', 'rejected', 'linguistically_verified'].map((s, i) => q('X' + i, s));
  const b = buildBank({ objectives, approved: [], candidates: cs, includeUnverified: true, date });
  assert.equal(b.questions.length, 0);
});
test('internal fields stripped', () => {
  const b = buildBank({ objectives, approved: [q('A', 'approved')], date });
  for (const k of ['status', 'version', 'flags', 'review_notes', 'provenance']) assert.equal(k in b.questions[0], false);
  assert.equal(b.questions[0].prompt, 'p');
});
test('objectives filtered and trimmed', () => {
  const b = buildBank({ objectives, approved: [q('A', 'approved')], date });
  assert.equal(b.objectives.length, 1);
  assert.deepEqual(Object.keys(b.objectives[0]).sort(), ['description', 'domain', 'examples', 'id', 'level', 'prerequisites', 'skill']);
});
test('empty bank is valid', () => {
  const b = buildBank({ objectives, approved: [], date });
  assert.deepEqual([b.questions, b.objectives], [[], []]);
});
