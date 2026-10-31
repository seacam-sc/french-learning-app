import { useEffect, useMemo, useRef } from 'preact/hooks';
import type { Bank } from './engine';

export function glossaryTerms(bank: Bank) {
  const seen = new Map<string, { term: string; plain_explanation: string }>();
  for (const o of bank.objectives) {
    for (const t of o.terms_introduced ?? []) {
      const k = t.term.toLowerCase();
      if (!seen.has(k)) seen.set(k, t);
    }
  }
  return [...seen.values()].sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
}

export function Glossary({ bank, onClose }: { bank: Bank; onClose(): void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const terms = useMemo(() => glossaryTerms(bank), [bank]);
  const opener = useRef<Element | null>(document.activeElement);

  useEffect(() => {
    const d = ref.current!;
    if (!d.open) d.showModal();
    return () => { if (d.open) d.close(); };
  }, []);

  const close = () => {
    onClose();
    (opener.current as HTMLElement | null)?.focus?.();
  };

  return (
    <dialog ref={ref} aria-labelledby="glossary-title" onClose={close} onCancel={() => { /* native close fires onClose */ }}>
      <div class="dialog-head">
        <h2 id="glossary-title">Glossary</h2>
        <button type="button" onClick={() => ref.current?.close()}>Close</button>
      </div>
      {terms.length === 0 ? <p>No terms yet.</p> : (
        <dl>
          {terms.map((t) => (
            <>
              <dt>{t.term}</dt>
              <dd>{t.plain_explanation}</dd>
            </>
          ))}
        </dl>
      )}
    </dialog>
  );
}
