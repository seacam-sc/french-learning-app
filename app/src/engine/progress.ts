import type { Attempt, ObjectiveProgress, Stage } from './types';

const day = (iso: string) => Math.floor(new Date(iso).getTime() / 86_400_000); // UTC calendar day

export function objectiveProgress(objectiveId: string, attempts: Attempt[], _now: Date): ObjectiveProgress {
  const mine = attempts.filter((a) => a.objectiveId === objectiveId);
  const firstTries = mine.filter((a) => a.tryNumber === 1);
  const clean = firstTries.filter((a) => !a.usedHint && a.outcome === 'correct');
  const groups = new Set(clean.map((a) => a.variantGroup));
  const anyCorrect = mine.some((a) => a.outcome === 'correct');

  let stage: Stage;
  if (mine.length === 0) stage = 'new';
  else if (!anyCorrect) stage = 'exposure';
  else if (groups.size < 2) stage = 'guided';
  else {
    stage = 'independent';
    const days = clean.map((a) => day(a.at));
    if (Math.max(...days) - Math.min(...days) >= 3) stage = 'retained';
  }

  return {
    objectiveId,
    stage,
    attempts: mine.length,
    firstTryCorrect: clean.length,
    accuracy: firstTries.length ? clean.length / firstTries.length : null,
    distinctGroupsCorrect: groups.size,
    lastPractised: mine.length ? mine.reduce((m, a) => (a.at > m ? a.at : m), mine[0].at) : null,
  };
}

export function allProgress(objectiveIds: string[], attempts: Attempt[], now: Date): Record<string, ObjectiveProgress> {
  const out: Record<string, ObjectiveProgress> = {};
  for (const id of objectiveIds) out[id] = objectiveProgress(id, attempts, now);
  return out;
}
