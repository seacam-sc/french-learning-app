import type { Attempt, Bank, CardState, ProgressSnapshot, Settings } from './engine';

export interface Ctx {
  bank: Bank;
  snap: ProgressSnapshot;
  /** latest snapshot (not stale inside event handlers) */
  getSnap(): ProgressSnapshot;
  record(a: Attempt, card: CardState): void;
  patchSession(p: Partial<ProgressSnapshot['session']>): void;
  setSettings(s: Settings): void;
  setDiagnostic(d: unknown): void;
  reload(): Promise<void>;
}
