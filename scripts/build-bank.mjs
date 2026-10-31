// Builds app/public/bank.json from approved (and optionally ai_reviewed candidate) questions.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const QUESTION_STRIP = ['status', 'version', 'flags', 'review_notes', 'provenance'];
const OBJECTIVE_KEEP = ['id', 'level', 'domain', 'skill', 'description', 'terms_introduced', 'examples', 'prerequisites'];

export function buildBank({ objectives, approved = [], candidates = [], includeUnverified = false, date = new Date().toISOString().slice(0, 10) }) {
  const clean = (q, unverified) => {
    const out = { ...q };
    for (const k of QUESTION_STRIP) delete out[k];
    if (unverified) out.unverified = true;
    return out;
  };
  const questions = approved.filter((q) => q.status === 'approved').map((q) => clean(q, false));
  if (includeUnverified) {
    const seen = new Set(questions.map((q) => q.id));
    for (const q of candidates) if (q.status === 'ai_reviewed' && !seen.has(q.id)) questions.push(clean(q, true));
  }
  const used = new Set(questions.map((q) => q.objective_id));
  const objs = objectives.filter((o) => used.has(o.id)).map((o) => {
    const r = {};
    for (const k of OBJECTIVE_KEEP) if (o[k] !== undefined) r[k] = o[k];
    return r;
  });
  return { generated: date, includesUnverified: includeUnverified, objectives: objs, questions };
}

const readAll = (dir) => existsSync(dir)
  ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort().flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
  : [];

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const includeUnverified = process.argv.includes('--include-unverified');
  const bank = buildBank({
    objectives: JSON.parse(readFileSync(join(root, 'curriculum/objectives.json'), 'utf8')),
    approved: readAll(join(root, 'content/questions')),
    candidates: includeUnverified ? readAll(join(root, 'content/candidates')) : [],
    includeUnverified,
  });
  mkdirSync(join(root, 'app/public'), { recursive: true });
  writeFileSync(join(root, 'app/public/bank.json'), JSON.stringify(bank, null, 2) + '\n');
  const nu = bank.questions.filter((q) => q.unverified).length;
  console.log(`bank.json: ${bank.questions.length} questions (${bank.questions.length - nu} approved, ${nu} unverified), ${bank.objectives.length} objectives`);
  if (bank.questions.length === 0) console.warn('WARNING: bank has 0 questions. Nothing is approved yet; use --include-unverified for a preview build.');
}
