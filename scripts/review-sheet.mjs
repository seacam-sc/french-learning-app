// Writes a small review sheet of questions awaiting human review.
// Usage: node scripts/review-sheet.mjs [--size 10]
// Picks ai_reviewed questions first, then flagged structurally_validated ones, from content/candidates.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSheet } from './review-lib.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const sizeArg = process.argv.indexOf('--size');
const size = sizeArg > -1 ? Number(process.argv[sizeArg + 1]) : 10;
const dir = join(root, 'content/candidates');
const all = readdirSync(dir).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(readFileSync(join(dir, f))));
const humanFlagged = (q) => q.flags?.some((f) => f.startsWith('human:'));
const queue = [
  ...all.filter((q) => q.status === 'ai_reviewed'),
  ...all.filter((q) => q.status === 'structurally_validated' && q.flags?.length && !humanFlagged(q)),
].slice(0, size);
if (!queue.length) { console.log('Nothing waiting for review.'); process.exit(0); }
const reviewDir = join(root, 'content/review');
const n = readdirSync(reviewDir).filter((f) => /^sheet-\d+\.md$/.test(f)).length + 1;
const file = join(reviewDir, `sheet-${String(n).padStart(3, '0')}.md`);
writeFileSync(file, renderSheet(queue, `Review sheet ${n} — ${queue.length} questions`));
console.log(`Wrote ${file} (${queue.length} questions)`);
