// Validates question files against schemas/question.schema.json plus content rules.
// Usage: node scripts/validate-questions.mjs [file-or-dir ...]   (default: content/questions content/candidates)
// With --promote, questions that pass and are still "generated" are set to "structurally_validated" in place.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from './mini-schema.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const schema = JSON.parse(readFileSync(join(root, 'schemas/question.schema.json')));

export const normalise = (s) =>
  s.normalize('NFC').toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').replace(/\s*([?!.,;:])\s*$/, '').trim();

export function checkQuestions(questions, objectives) {
  const errors = [];
  const warnings = [];
  const objById = new Map(objectives.map((o) => [o.id, o]));
  const seenIds = new Set();
  const seenPrompts = new Map();
  for (const q of questions) {
    const where = q.id ?? '?';
    errors.push(...validate(schema, q, where));
    if (seenIds.has(q.id)) errors.push(`${where}: duplicate id`);
    seenIds.add(q.id);
    const obj = objById.get(q.objective_id);
    if (!obj) errors.push(`${where}: objective ${q.objective_id} does not exist`);
    else {
      if (obj.level !== q.level) errors.push(`${where}: level ${q.level} does not match objective level ${obj.level}`);
      if (!obj.question_types.includes(q.format)) warnings.push(`${where}: format ${q.format} not listed for objective ${obj.id}`);
    }
    if (q.id && q.objective_id && !q.id.startsWith(q.objective_id.replace(/^FR-/, 'Q-') + '-'))
      errors.push(`${where}: id does not match objective_id ${q.objective_id}`);
    const answers = [q.answer, ...(q.acceptable_alternatives || [])].filter((a) => typeof a === 'string');
    const normAnswers = answers.map(normalise);
    if (new Set(normAnswers).size !== normAnswers.length) warnings.push(`${where}: duplicate answers after normalising`);
    const CHOICE_FORMATS = ['mcq', 'reading_comprehension', 'listening_comprehension'];
    if (q.format === 'mcq' && !Array.isArray(q.choices)) errors.push(`${where}: mcq needs choices`);
    if (Array.isArray(q.choices)) {
      if (!CHOICE_FORMATS.includes(q.format)) errors.push(`${where}: choices not allowed for ${q.format}`);
      const nc = q.choices.map(normalise);
      if (!nc.includes(normalise(q.answer ?? ''))) errors.push(`${where}: answer is not one of the choices`);
      if (new Set(nc).size !== nc.length) errors.push(`${where}: duplicate choices`);
      const correctChoices = nc.filter((c) => normAnswers.includes(c));
      if (correctChoices.length > 1) errors.push(`${where}: more than one choice is marked correct`);
    }
    if (q.format === 'fill_blank' && !(q.prompt || '').includes('___')) errors.push(`${where}: fill_blank prompt needs ___`);
    if (q.format === 'sentence_order') {
      if (!Array.isArray(q.tokens)) errors.push(`${where}: sentence_order needs tokens`);
      else {
        const sorted = (s) => s.split(' ').sort().join(' ');
        const tok = normalise(q.tokens.join(' '));
        if (!answers.every((a) => sorted(normalise(a)) === sorted(tok)))
          errors.push(`${where}: tokens do not rebuild every answer`);
      }
    } else if (q.tokens) errors.push(`${where}: tokens only allowed for sentence_order`);
    if (q.hint && q.answer && normalise(q.hint).includes(normalise(q.answer)) && normalise(q.answer).length > 3)
      errors.push(`${where}: hint gives away the answer`);
    if (q.format === 'reading_comprehension' && !q.passage) errors.push(`${where}: reading_comprehension needs passage`);
    const key = normalise(q.prompt || '') + '|' + normalise(q.passage || '');
    if (seenPrompts.has(key)) warnings.push(`${where}: same prompt as ${seenPrompts.get(key)}`);
    else seenPrompts.set(key, where);
  }
  return { errors, warnings };
}

function collectFiles(paths) {
  const out = [];
  for (const p of paths) {
    if (!existsSync(p)) continue;
    if (statSync(p).isDirectory()) out.push(...readdirSync(p).filter((f) => f.endsWith('.json')).map((f) => join(p, f)));
    else out.push(p);
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const promote = args.includes('--promote');
  const targets = args.filter((a) => !a.startsWith('--'));
  const files = collectFiles(targets.length ? targets : [join(root, 'content/questions'), join(root, 'content/candidates')]);
  const objectives = JSON.parse(readFileSync(join(root, 'curriculum/objectives.json')));
  const loaded = files.map((f) => ({ f, qs: JSON.parse(readFileSync(f)) }));
  const all = loaded.flatMap((x) => x.qs);
  const { errors, warnings } = checkQuestions(all, objectives);
  console.log(`${all.length} questions in ${files.length} file(s)`);
  if (warnings.length) console.log(`${warnings.length} warning(s):\n` + warnings.join('\n'));
  if (errors.length) { console.error(`${errors.length} error(s):\n` + errors.join('\n')); process.exit(1); }
  if (promote) {
    let n = 0;
    for (const { f, qs } of loaded) {
      for (const q of qs) if (q.status === 'generated') { q.status = 'structurally_validated'; n++; }
      writeFileSync(f, JSON.stringify(qs, null, 2) + '\n');
    }
    console.log(`promoted ${n} to structurally_validated`);
  }
  console.log('OK');
}
