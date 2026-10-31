import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSheet, parseDecisions, applyDecision } from '../scripts/review-lib.mjs';

const q = () => ({ id: 'Q-A1-GRM-007-001', level: 'A1', format: 'fill_blank', objective_id: 'FR-A1-GRM-007', prompt: 'Je ___ mange pas.', answer: 'ne', acceptable_alternatives: [], hint: 'h', explanation: 'e', status: 'ai_reviewed' });

test('sheet round-trips decisions', () => {
  const sheet = renderSheet([q(), { ...q(), id: 'Q-A1-GRM-007-002' }, { ...q(), id: 'Q-A1-GRM-007-003' }, { ...q(), id: 'Q-A1-GRM-007-004' }], 'T');
  const filled = sheet
    .replace(/(## Q-A1-GRM-007-001[\s\S]*?Decision: )/, '$1ok')
    .replace(/(## Q-A1-GRM-007-002[\s\S]*?Decision: )/, '$1fix: answer should be n\'')
    .replace(/(## Q-A1-GRM-007-003[\s\S]*?Decision: )/, '$1REJECT');
  const d = parseDecisions(filled);
  assert.deepEqual(d.get('Q-A1-GRM-007-001'), { action: 'ok' });
  assert.deepEqual(d.get('Q-A1-GRM-007-002'), { action: 'fix', note: "answer should be n'" });
  assert.deepEqual(d.get('Q-A1-GRM-007-003'), { action: 'reject' });
  assert.equal(d.has('Q-A1-GRM-007-004'), false);
});

test('ok approves and records date', () => {
  const x = q(); applyDecision(x, { action: 'ok' }, '2026-10-31');
  assert.equal(x.status, 'approved'); assert.match(x.review_notes, /Human-verified and approved 2026-10-31/);
});
test('fix adds human flag and sends back from ai_reviewed', () => {
  const x = q(); applyDecision(x, { action: 'fix', note: 'unnatural' }, 'd');
  assert.equal(x.status, 'structurally_validated'); assert.deepEqual(x.flags, ['human: unnatural']);
});
test('reject', () => { const x = q(); applyDecision(x, { action: 'reject' }, 'd'); assert.equal(x.status, 'rejected'); });
test('unknown decision changes nothing', () => { const x = q(); assert.equal(applyDecision(x, { action: 'unknown' }, 'd'), false); assert.equal(x.status, 'ai_reviewed'); });
