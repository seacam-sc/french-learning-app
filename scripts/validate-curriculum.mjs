// Validates curriculum/objectives.json: schema, unique ids, level/domain match id,
// prerequisite references exist, prerequisites not above own level, no cycles.
import { readFileSync } from 'node:fs';
import { validate } from './mini-schema.mjs';

const root = new URL('..', import.meta.url);
const schema = JSON.parse(readFileSync(new URL('schemas/objective.schema.json', root)));
const file = process.argv[2] || new URL('curriculum/objectives.json', root);
const objectives = JSON.parse(readFileSync(file));
const LEVELS = ['A1', 'A2', 'B1', 'B2'];
const errors = [];

const byId = new Map();
objectives.forEach((o, i) => {
  errors.push(...validate(schema, o, `[${i}] ${o.id ?? '?'}`));
  if (byId.has(o.id)) errors.push(`duplicate id ${o.id}`);
  byId.set(o.id, o);
  const [, lvl, dom] = (o.id || '').split('-');
  if (lvl !== o.level) errors.push(`${o.id}: level field ${o.level} does not match id`);
  if (dom !== o.domain) errors.push(`${o.id}: domain field ${o.domain} does not match id`);
  if (o.domain === 'ADV' && !['B1', 'B2'].includes(o.level)) errors.push(`${o.id}: ADV domain only allowed at B1/B2`);
});

for (const o of objectives) {
  for (const p of o.prerequisites || []) {
    const pre = byId.get(p);
    if (!pre) errors.push(`${o.id}: prerequisite ${p} does not exist`);
    else if (LEVELS.indexOf(pre.level) > LEVELS.indexOf(o.level)) errors.push(`${o.id}: prerequisite ${p} is a higher level`);
  }
}

// cycle detection
const state = new Map();
const visit = (id, stack) => {
  if (state.get(id) === 'done') return;
  if (state.get(id) === 'active') { errors.push(`prerequisite cycle: ${[...stack, id].join(' -> ')}`); return; }
  state.set(id, 'active');
  for (const p of byId.get(id)?.prerequisites || []) if (byId.has(p)) visit(p, [...stack, id]);
  state.set(id, 'done');
};
for (const id of byId.keys()) visit(id, []);

const counts = {};
for (const o of objectives) counts[`${o.level} ${o.domain}`] = (counts[`${o.level} ${o.domain}`] || 0) + 1;
console.log(`${objectives.length} objectives`);
for (const l of LEVELS) console.log(l, Object.entries(counts).filter(([k]) => k.startsWith(l)).map(([k, n]) => `${k.slice(3)}:${n}`).join(' '));
if (errors.length) { console.error(`\n${errors.length} error(s):\n` + errors.join('\n')); process.exit(1); }
console.log('OK');
