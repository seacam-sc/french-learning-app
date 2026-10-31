import { DEFAULT_SETTINGS } from '../engine/types';
import type { Attempt, CardState, ProgressSnapshot, Settings } from '../engine/types';

const DB_NAME = 'french-practice';
const ATTEMPTS = 'attempts';
const CARDS = 'cards';
const META = 'meta';

type Session = ProgressSnapshot['session'];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore(ATTEMPTS, { autoIncrement: true });
      db.createObjectStore(CARDS);
      db.createObjectStore(META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Runs fn in one transaction on the given stores; resolves when the transaction completes. */
async function tx<T>(stores: string[], mode: IDBTransactionMode, fn: (t: IDBTransaction) => T | Promise<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(stores, mode);
      let result: T;
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error ?? new Error('transaction aborted'));
      Promise.resolve(fn(t)).then((r) => { result = r; }, (e) => { try { t.abort(); } catch { /* ignore */ } reject(e); });
    });
  } finally {
    db.close();
  }
}

const reqP = <T,>(r: IDBRequest<T>): Promise<T> =>
  new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export async function loadSnapshot(): Promise<ProgressSnapshot> {
  return tx([ATTEMPTS, CARDS, META], 'readonly', async (t) => {
    const attempts = (await reqP(t.objectStore(ATTEMPTS).getAll())) as Attempt[];
    const keys = (await reqP(t.objectStore(CARDS).getAllKeys())) as string[];
    const vals = (await reqP(t.objectStore(CARDS).getAll())) as CardState[];
    const cards: Record<string, CardState> = {};
    keys.forEach((k, i) => { cards[String(k)] = vals[i]; });
    const meta = t.objectStore(META);
    const settings = (await reqP(meta.get('settings'))) as Settings | undefined;
    const session = (await reqP(meta.get('session'))) as Session | undefined;
    const diagnostic = await reqP(meta.get('diagnostic'));
    const snap: ProgressSnapshot = {
      schemaVersion: 1,
      attempts,
      cards,
      settings: { ...DEFAULT_SETTINGS, ...(settings ?? {}) },
      session: session ?? {},
    };
    if (diagnostic !== undefined) snap.diagnostic = diagnostic;
    return snap;
  });
}

export async function recordAttempt(attempt: Attempt, card: CardState | undefined): Promise<void> {
  await tx([ATTEMPTS, CARDS], 'readwrite', (t) => {
    t.objectStore(ATTEMPTS).add(attempt);
    if (card) t.objectStore(CARDS).put(card, attempt.questionId);
  });
}

const putMeta = (key: string, value: unknown) =>
  tx([META], 'readwrite', (t) => { t.objectStore(META).put(value, key); });

export const saveSettings = (s: Settings): Promise<void> => putMeta('settings', s);
export const saveSession = (s: Session): Promise<void> => putMeta('session', s);
export const saveDiagnostic = (state: unknown): Promise<void> => putMeta('diagnostic', state);

export async function exportSnapshot(): Promise<string> {
  return JSON.stringify(await loadSnapshot(), null, 2);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const OUTCOMES = ['correct', 'near_miss', 'incorrect'];

function validateSnapshot(v: unknown): string | null {
  if (!isObj(v)) return 'Not a JSON object.';
  if (v.schemaVersion !== 1) return 'Unsupported schemaVersion (expected 1).';
  if (!Array.isArray(v.attempts)) return 'attempts must be a list.';
  for (const [i, a] of v.attempts.entries()) {
    if (!isObj(a)) return `attempts[${i}] is not an object.`;
    for (const k of ['questionId', 'objectiveId', 'variantGroup', 'at', 'answer']) {
      if (typeof a[k] !== 'string') return `attempts[${i}].${k} must be text.`;
    }
    if (!OUTCOMES.includes(a.outcome as string)) return `attempts[${i}].outcome is invalid.`;
    if (typeof a.usedHint !== 'boolean') return `attempts[${i}].usedHint must be true/false.`;
    if (typeof a.tryNumber !== 'number') return `attempts[${i}].tryNumber must be a number.`;
  }
  if (!isObj(v.cards)) return 'cards must be an object.';
  for (const [id, c] of Object.entries(v.cards)) {
    if (!isObj(c) || typeof c.due !== 'string') return `cards.${id} is invalid.`;
    for (const k of ['stability', 'difficulty', 'elapsed_days', 'scheduled_days', 'learning_steps', 'reps', 'lapses', 'state']) {
      if (typeof c[k] !== 'number') return `cards.${id}.${k} must be a number.`;
    }
    if (c.last_review !== undefined && typeof c.last_review !== 'string') return `cards.${id}.last_review must be text.`;
  }
  if (!isObj(v.settings) || typeof v.settings.accentStrict !== 'boolean' || typeof v.settings.autoHint !== 'boolean') return 'settings is invalid.';
  if (!isObj(v.session)) return 'session must be an object.';
  for (const k of ['currentQuestionId', 'topic']) {
    if (v.session[k] !== undefined && typeof v.session[k] !== 'string') return `session.${k} must be text.`;
  }
  return null;
}

async function writeSnapshot(s: ProgressSnapshot): Promise<void> {
  await tx([ATTEMPTS, CARDS, META], 'readwrite', (t) => {
    t.objectStore(ATTEMPTS).clear();
    t.objectStore(CARDS).clear();
    t.objectStore(META).clear();
    for (const a of s.attempts) t.objectStore(ATTEMPTS).add(a);
    for (const [id, c] of Object.entries(s.cards)) t.objectStore(CARDS).put(c, id);
    t.objectStore(META).put(s.settings, 'settings');
    t.objectStore(META).put(s.session, 'session');
    if (s.diagnostic !== undefined) t.objectStore(META).put(s.diagnostic, 'diagnostic');
  });
}

export async function importSnapshot(json: string): Promise<{ ok: true } | { ok: false; error: string }> {
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { return { ok: false, error: 'That file is not valid JSON.' }; }
  const err = validateSnapshot(parsed);
  if (err) return { ok: false, error: err };
  try {
    await writeSnapshot(parsed as ProgressSnapshot);
  } catch (e) {
    return { ok: false, error: `Could not save: ${e instanceof Error ? e.message : String(e)}` };
  }
  return { ok: true };
}

export async function resetAll(): Promise<void> {
  await tx([ATTEMPTS, CARDS, META], 'readwrite', (t) => {
    t.objectStore(ATTEMPTS).clear();
    t.objectStore(CARDS).clear();
    t.objectStore(META).clear();
  });
}
