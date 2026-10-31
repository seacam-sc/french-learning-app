import { useEffect, useRef, useState } from 'preact/hooks';
import type { Bank, ProgressSnapshot } from './engine';
import { loadSnapshot, recordAttempt, saveDiagnostic, saveSession, saveSettings } from './store/db';
import type { Ctx } from './ctx';
import { Practice } from './Practice';
import { Topics } from './Topics';
import { Progress } from './Progress';
import { SettingsScreen } from './SettingsScreen';
import { Placement } from './Placement';

const ROUTES = ['practice', 'topics', 'progress', 'settings', 'placement'] as const;
type Route = (typeof ROUTES)[number];

function currentRoute(): Route {
  const r = location.hash.replace(/^#\/?/, '');
  return (ROUTES as readonly string[]).includes(r) ? (r as Route) : 'practice';
}

const NAV: [Route, string][] = [['practice', 'Practice'], ['topics', 'Topics'], ['progress', 'Progress'], ['settings', 'Settings']];

export function App() {
  const [route, setRoute] = useState<Route>(currentRoute());
  const [bank, setBank] = useState<Bank | null>(null);
  const [snap, setSnap] = useState<ProgressSnapshot | null>(null);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState(false);
  const snapRef = useRef<ProgressSnapshot | null>(null);

  const commit = (s: ProgressSnapshot) => { snapRef.current = s; setSnap(s); };

  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('./bank.json');
        if (!res.ok) throw new Error('bank');
        setBank((await res.json()) as Bank);
        commit(await loadSnapshot());
      } catch {
        setError('Could not load the questions.');
      }
    })();
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [route]);

  const fail = () => setSaveError(true);
  const ctx: Ctx | null = bank && snap ? {
    bank,
    snap,
    getSnap: () => snapRef.current!,
    record(a, card) {
      const s = snapRef.current!;
      commit({ ...s, attempts: [...s.attempts, a], cards: { ...s.cards, [a.questionId]: card } });
      recordAttempt(a, card).catch(fail);
    },
    patchSession(p) {
      const s = snapRef.current!;
      const session = { ...s.session, ...p };
      commit({ ...s, session });
      saveSession(session).catch(fail);
    },
    setSettings(settings) {
      commit({ ...snapRef.current!, settings });
      saveSettings(settings).catch(fail);
    },
    setDiagnostic(d) {
      commit({ ...snapRef.current!, diagnostic: d });
      saveDiagnostic(d).catch(fail);
    },
    async reload() { commit(await loadSnapshot()); },
  } : null;

  let body;
  if (error) body = <p>{error}</p>;
  else if (!ctx) body = <p>Loading.</p>;
  else if (ctx.bank.questions.length === 0) body = <p>There are no questions yet.</p>;
  else if (route === 'topics') body = <Topics ctx={ctx} />;
  else if (route === 'progress') body = <Progress ctx={ctx} />;
  else if (route === 'placement') body = <Placement ctx={ctx} />;
  else body = <Practice ctx={ctx} />;

  return (
    <div class="shell">
      <nav aria-label="Main">
        {NAV.map(([r, label]) => (
          <a href={`#/${r}`} aria-current={route === r ? 'page' : undefined}>{label}</a>
        ))}
      </nav>
      <main>
        {route === 'settings' && ctx ? <SettingsScreen ctx={ctx} /> : body}
        {saveError && <p class="note">Could not save progress on this device.</p>}
      </main>
    </div>
  );
}
