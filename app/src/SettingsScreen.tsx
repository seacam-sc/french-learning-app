import { useState } from 'preact/hooks';
import type { Ctx } from './ctx';
import { exportSnapshot, importSnapshot, resetAll } from './store/db';

export function SettingsScreen({ ctx }: { ctx: Ctx }) {
  const { settings } = ctx.snap;
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);

  const doExport = async () => {
    const json = await exportSnapshot();
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `french-practice-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage('Progress exported.');
  };

  const doImport = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const res = await importSnapshot(await file.text());
    input.value = '';
    if (res.ok) {
      await ctx.reload();
      setMessage('Progress imported.');
    } else {
      setMessage(`Import failed. ${res.error}`);
    }
  };

  const doReset = async () => {
    await resetAll();
    await ctx.reload();
    setConfirming(false);
    setMessage('All progress deleted.');
  };

  return (
    <>
      <h1>Settings</h1>
      <label class="toggle">
        <input
          type="checkbox"
          checked={settings.accentStrict}
          onChange={(e) => ctx.setSettings({ ...settings, accentStrict: (e.target as HTMLInputElement).checked })}
        />
        <span>Count answers with missing accents as wrong</span>
      </label>
      <label class="toggle">
        <input
          type="checkbox"
          checked={settings.autoHint}
          onChange={(e) => ctx.setSettings({ ...settings, autoHint: (e.target as HTMLInputElement).checked })}
        />
        <span>Show the hint automatically</span>
      </label>

      <h2>Your data</h2>
      <div class="row">
        <button type="button" onClick={doExport}>Export progress</button>
      </div>
      <label class="file">
        <span>Import progress</span>
        <input type="file" accept="application/json,.json" onChange={doImport} />
      </label>
      {message && <p role="status" class="note">{message}</p>}

      {!confirming ? (
        <div class="row"><button type="button" onClick={() => setConfirming(true)}>Reset all progress</button></div>
      ) : (
        <div class="confirm" role="group" aria-label="Confirm reset">
          <p>This deletes all progress on this device. It cannot be undone.</p>
          <div class="row">
            <button type="button" class="danger" onClick={doReset}>Yes, delete all progress</button>
            <button type="button" onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        </div>
      )}

      <p><a href="#/placement">Placement check</a></p>
    </>
  );
}
