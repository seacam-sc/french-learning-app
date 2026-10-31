import { isDue } from './schedule';
import { allProgress } from './progress';
import type { Bank, ObjectiveProgress, ProgressSnapshot, Question, Stage, Topic } from './types';

const STAGE_ORDER: Record<Stage, number> = { new: 0, exposure: 1, guided: 2, independent: 3, retained: 4 };
const LEVEL_ORDER: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3 };

const byId = (a: Question, b: Question) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const group = (q: Question) => q.variant_group ?? q.id;

function inTopic(bank: Bank, q: Question, topic: Topic): boolean {
  if (!topic) return true;
  if (q.objective_id === topic || q.level === topic) return true;
  const o = bank.objectives.find((x) => x.id === q.objective_id);
  return o?.domain === topic;
}

export function selectNext(bank: Bank, snap: ProgressSnapshot, now: Date, topic: Topic, recentIds: string[]): Question | null {
  const pool = bank.questions.filter((q) => inTopic(bank, q, topic));
  if (pool.length === 0) return null;

  const prog = allProgress(bank.objectives.map((o) => o.id), snap.attempts, now);
  const stageOf = (id: string): ObjectiveProgress | undefined => prog[id];
  const inBank = new Map(bank.objectives.map((o) => [o.id, o]));

  const seen = pool.filter((q) => snap.cards[q.id]);
  const unseen = pool.filter((q) => !snap.cards[q.id]);
  const due = (q: Question) => new Date(snap.cards[q.id].due).getTime();

  const dueList = seen.filter((q) => isDue(snap.cards[q.id], now)).sort((a, b) => {
    const pa = stageOf(a.objective_id), pb = stageOf(b.objective_id);
    const sa = pa ? STAGE_ORDER[pa.stage] : 0, sb = pb ? STAGE_ORDER[pb.stage] : 0;
    if (sa !== sb) return sa - sb;
    const aa = pa?.accuracy ?? 0, ab = pb?.accuracy ?? 0;
    if (aa !== ab) return aa - ab;
    return due(a) - due(b) || byId(a, b);
  });

  const prereqsMet = (q: Question) => {
    const o = inBank.get(q.objective_id);
    if (!o) return true;
    return o.prerequisites.filter((p) => inBank.has(p)).every((p) => {
      const s = stageOf(p)?.stage ?? 'new';
      return STAGE_ORDER[s] >= STAGE_ORDER.guided;
    });
  };
  const unseenOrder = (a: Question, b: Question) =>
    (LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]) || (a.difficulty - b.difficulty) || byId(a, b);
  const unseenList = unseen.filter(prereqsMet).sort(unseenOrder);
  const locked = unseen.filter((q) => !prereqsMet(q)).sort(unseenOrder);

  const dueIds = new Set(dueList.map((q) => q.id));
  const fallback = seen.filter((q) => !dueIds.has(q.id)).sort((a, b) => due(a) - due(b) || byId(a, b));

  const ordered = [...dueList, ...unseenList, ...fallback, ...locked];

  const recent = new Set(recentIds);
  const lastObj = recentIds.length ? bank.questions.find((q) => q.id === recentIds[0])?.objective_id : undefined;
  return (
    ordered.find((q) => !recent.has(q.id) && q.objective_id !== lastObj) ??
    ordered.find((q) => !recent.has(q.id)) ??
    ordered[0]
  );
}

export function anotherExample(bank: Bank, q: Question, snap: ProgressSnapshot, recentIds: string[]): Question | null {
  const recent = new Set(recentIds);
  const cands = bank.questions.filter((x) => x.objective_id === q.objective_id && x.id !== q.id);
  if (cands.length === 0) return null;
  const rank = (x: Question) =>
    (group(x) !== group(q) ? 0 : 4) + (snap.cards[x.id] ? 2 : 0) + (recent.has(x.id) ? 1 : 0);
  return [...cands].sort((a, b) => rank(a) - rank(b) || a.difficulty - b.difficulty || byId(a, b))[0];
}
