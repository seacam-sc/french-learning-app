// Shared helpers for the human review flow (sheet rendering and decision parsing).

export function renderSheet(questions, title) {
  const out = [`# ${title}`, '', 'For each question, write after "Decision:" one of:', '- `ok` — correct and natural, approve it', '- `fix: <what is wrong>` — needs changing', '- `reject` — drop it', 'Leave blank to skip.', ''];
  for (const q of questions) {
    out.push(`## ${q.id}`, `${q.level} · ${q.format} · ${q.objective_id}`);
    if (q.flags?.length) out.push(`**Flags:** ${q.flags.join('; ')}`);
    if (q.instruction) out.push(`**Task:** ${q.instruction}`);
    if (q.passage) out.push('', '> ' + q.passage.replace(/\n/g, '\n> '));
    out.push('', `**${q.prompt}**`);
    if (q.choices) out.push('', ...q.choices.map((c) => `- ${c}`));
    if (q.tokens) out.push(`Words: ${q.tokens.join(' / ')}`);
    out.push('', `**Answer:** ${q.answer}`);
    out.push(`**Also accepted:** ${q.acceptable_alternatives?.length ? q.acceptable_alternatives.join(' | ') : '—'}`);
    out.push(`**Hint:** ${q.hint}`, `**Explanation:** ${q.explanation}`);
    if (q.review_notes) out.push(`**AI review notes:** ${q.review_notes}`);
    out.push('', 'Decision: ', '');
  }
  return out.join('\n');
}

// Returns Map(id -> {action: 'ok'|'reject'|'fix', note?})
export function parseDecisions(markdown) {
  const decisions = new Map();
  let current = null;
  for (const line of markdown.split('\n')) {
    const h = line.match(/^## (Q-\S+)/);
    if (h) { current = h[1]; continue; }
    const d = line.match(/^Decision:\s*(.*)$/i);
    if (d && current) {
      const v = d[1].trim();
      if (/^ok$/i.test(v)) decisions.set(current, { action: 'ok' });
      else if (/^reject$/i.test(v)) decisions.set(current, { action: 'reject' });
      else if (/^fix\s*:/i.test(v)) decisions.set(current, { action: 'fix', note: v.replace(/^fix\s*:\s*/i, '') });
      else if (v) decisions.set(current, { action: 'unknown', note: v });
      current = null;
    }
  }
  return decisions;
}

// Applies decisions to a question in place. Returns true if changed.
export function applyDecision(q, decision, date) {
  if (decision.action === 'ok') {
    q.status = 'approved';
    q.review_notes = [q.review_notes, `Human-verified and approved ${date}.`].filter(Boolean).join(' ');
    q.flags = (q.flags || []).filter((f) => !f.startsWith('human:'));
    if (!q.flags.length) delete q.flags;
    return true;
  }
  if (decision.action === 'reject') { q.status = 'rejected'; q.review_notes = [q.review_notes, `Rejected by human reviewer ${date}.`].filter(Boolean).join(' '); return true; }
  if (decision.action === 'fix') { q.flags = [...(q.flags || []), `human: ${decision.note}`]; if (q.status === 'ai_reviewed') q.status = 'structurally_validated'; return true; }
  return false;
}
