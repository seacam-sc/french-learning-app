/// <reference types="vite/client" />
import { render } from 'preact';

function App() {
  return <main><p>French Practice — scaffold</p></main>;
}

render(<App />, document.getElementById('app')!);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline support is optional */ });
  });
}
