import { allProgress } from './engine';
import type { Ctx } from './ctx';
import { STAGE_NAMES, formatDate } from './labels';

const pct = (a: number | null) => (a === null ? 'None yet' : `${Math.round(a * 100)}%`);

export function Progress({ ctx }: { ctx: Ctx }) {
  const { bank, snap } = ctx;
  const prog = allProgress(bank.objectives.map((o) => o.id), snap.attempts, new Date());
  const weakest = bank.objectives
    .filter((o) => prog[o.id].accuracy !== null)
    .sort((a, b) => (prog[a.id].accuracy! - prog[b.id].accuracy!) || (a.id < b.id ? -1 : 1))
    .slice(0, 5);

  return (
    <>
      <h1>Progress</h1>
      <p class="muted">This shows accuracy on these questions. It is not a CEFR level.</p>

      <h2>Needs practice</h2>
      {weakest.length === 0 ? <p>Nothing yet.</p> : (
        <ul class="plain">
          {weakest.map((o) => (
            <li>{o.skill} <span class="muted">({pct(prog[o.id].accuracy)})</span></li>
          ))}
        </ul>
      )}

      <h2>All skills</h2>
      <ul class="plain">
        {bank.objectives.map((o) => {
          const p = prog[o.id];
          return (
            <li class="obj" data-objective={o.id}>
              <h3>{o.skill}</h3>
              <dl class="facts">
                <dt>Level</dt><dd>{o.level}</dd>
                <dt>Stage</dt><dd>{STAGE_NAMES[p.stage]}</dd>
                <dt>First-try accuracy</dt><dd>{pct(p.accuracy)}</dd>
                <dt>Last practised</dt><dd>{formatDate(p.lastPractised)}</dd>
              </dl>
            </li>
          );
        })}
      </ul>
    </>
  );
}
