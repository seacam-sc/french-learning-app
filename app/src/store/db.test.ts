import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../engine/types';
import type { Attempt, CardState } from '../engine/types';
import { exportSnapshot, importSnapshot, loadSnapshot, recordAttempt, resetAll, saveDiagnostic, saveSession, saveSettings } from './db';

const attempt = (n = 1): Attempt => ({
  questionId: 'Q-A1-GRM-001-001', objectiveId: 'FR-A1-GRM-001', variantGroup: 'g1', at: '2026-10-31T10:00:00.000Z',
  answer: 'suis', outcome: 'correct', usedHint: false, tryNumber: n,
});
const card: CardState = {
  due: '2026-11-01T10:00:00.000Z', stability: 1, difficulty: 5, elapsed_days: 0, scheduled_days: 1,
  learning_steps: 0, reps: 1, lapses: 0, state: 2, last_review: '2026-10-31T10:00:00.000Z',
};

beforeEach(async () => { await resetAll(); });

describe('store', () => {
  it('returns defaults when empty', async () => {
    expect(await loadSnapshot()).toEqual({ schemaVersion: 1, attempts: [], cards: {}, settings: DEFAULT_SETTINGS, session: {} });
  });

  it('persists attempt and card across reopen', async () => {
    await recordAttempt(attempt(), card);
    await recordAttempt(attempt(2), undefined);
    const s = await loadSnapshot(); // each call reopens the database
    expect(s.attempts).toEqual([attempt(), attempt(2)]);
    expect(s.cards).toEqual({ 'Q-A1-GRM-001-001': card });
  });

  it('saves settings, session, diagnostic', async () => {
    await saveSettings({ accentStrict: true, autoHint: true });
    await saveSession({ currentQuestionId: 'Q1', topic: 'A1' });
    await saveDiagnostic({ step: 3 });
    const s = await loadSnapshot();
    expect(s.settings).toEqual({ accentStrict: true, autoHint: true });
    expect(s.session).toEqual({ currentQuestionId: 'Q1', topic: 'A1' });
    expect(s.diagnostic).toEqual({ step: 3 });
  });

  it('export, reset, import round-trips', async () => {
    await recordAttempt(attempt(), card);
    await saveSettings({ accentStrict: true, autoHint: false });
    await saveSession({ topic: 'GRM' });
    await saveDiagnostic({ done: true });
    const before = await loadSnapshot();
    const json = await exportSnapshot();
    await resetAll();
    expect((await loadSnapshot()).attempts).toEqual([]);
    expect(await importSnapshot(json)).toEqual({ ok: true });
    expect(await loadSnapshot()).toEqual(before);
  });

  it('rejects invalid import and leaves data untouched', async () => {
    await recordAttempt(attempt(), card);
    const before = await loadSnapshot();
    const good = JSON.parse(await exportSnapshot());
    const bad = [
      'not json',
      JSON.stringify({ ...good, schemaVersion: 2 }),
      JSON.stringify({ ...good, attempts: [{ questionId: 1 }] }),
      JSON.stringify({ ...good, settings: { accentStrict: 'yes' } }),
      JSON.stringify({ ...good, cards: { x: { due: 'd' } } }),
    ];
    for (const b of bad) {
      const r = await importSnapshot(b);
      expect(r.ok).toBe(false);
    }
    expect(await loadSnapshot()).toEqual(before);
  });
});
