import type { Level } from './engine';
import type { Ctx } from './ctx';
import { DOMAIN_NAMES } from './labels';

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2'];

export function Topics({ ctx }: { ctx: Ctx }) {
  const { bank } = ctx;
  const current = ctx.snap.session.topic;

  const choose = (topic: string | undefined) => {
    ctx.patchSession({ topic, currentQuestionId: undefined });
    location.hash = '#/practice';
  };
  const btn = (topic: string | undefined, label: string) => (
    <li>
      <button type="button" class="list-btn" aria-pressed={current === topic} onClick={() => choose(topic)}>
        {label}
        {current === topic && <span class="muted"> (current)</span>}
      </button>
    </li>
  );

  const levels = LEVELS.filter((l) => bank.questions.some((q) => q.level === l));
  const domains = Object.keys(DOMAIN_NAMES).filter((d) => bank.objectives.some((o) => o.domain === d));

  return (
    <>
      <h1>Topics</h1>
      <ul class="plain">{btn(undefined, 'Automatic')}</ul>
      <h2>Level</h2>
      <ul class="plain">{levels.map((l) => btn(l, `Level ${l}`))}</ul>
      <h2>Area</h2>
      <ul class="plain">{domains.map((d) => btn(d, DOMAIN_NAMES[d]))}</ul>
      <h2>Single skill</h2>
      {levels.map((l) => (
        <>
          <h3>Level {l}</h3>
          <ul class="plain">
            {bank.objectives.filter((o) => o.level === l).map((o) => btn(o.id, o.skill))}
          </ul>
        </>
      ))}
    </>
  );
}
