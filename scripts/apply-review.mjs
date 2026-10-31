// Applies decisions from a filled-in review sheet to content/candidates, then moves
// approved questions into content/questions/<level>.json.
// Usage: node scripts/apply-review.mjs content/review/sheet-001.md
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDecisions, applyDecision } from './review-lib.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const sheet = process.argv[2];
if (!sheet) { console.error('Usage: node scripts/apply-review.mjs <sheet.md>'); process.exit(1); }
const decisions = parseDecisions(readFileSync(sheet, 'utf8'));
const date = new Date().toISOString().slice(0, 10);
const candDir = join(root, 'content/candidates');
const bankDir = join(root, 'content/questions');
const counts = { ok: 0, reject: 0, fix: 0, unknown: 0 };
const approved = [];

for (const f of readdirSync(candDir).filter((x) => x.endsWith('.json'))) {
  const path = join(candDir, f);
  const qs = JSON.parse(readFileSync(path));
  let changed = false;
  const keep = [];
  for (const q of qs) {
    const d = decisions.get(q.id);
    if (d) {
      counts[d.action]++;
      if (d.action === 'unknown') console.warn(`${q.id}: unrecognised decision "${d.note}" — skipped`);
      else if (applyDecision(q, d, date)) changed = true;
    }
    if (q.status === 'approved') approved.push(q);
    else keep.push(q);
  }
  if (changed || keep.length !== qs.length) writeFileSync(path, JSON.stringify(keep, null, 2) + '\n');
}

for (const level of ['A1', 'A2', 'B1', 'B2']) {
  const add = approved.filter((q) => q.level === level);
  if (!add.length) continue;
  const path = join(bankDir, `${level}.json`);
  const bank = existsSync(path) ? JSON.parse(readFileSync(path)) : [];
  const ids = new Set(bank.map((q) => q.id));
  for (const q of add) if (!ids.has(q.id)) bank.push(q);
  bank.sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(path, JSON.stringify(bank, null, 2) + '\n');
}
console.log(`approved ${counts.ok}, rejected ${counts.reject}, needs fixing ${counts.fix}, unrecognised ${counts.unknown}`);
