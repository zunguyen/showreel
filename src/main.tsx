import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// dev-only hook for automated export verification
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__exportTest = async (fpsArg?: number) => {
    const [{ useStore }, { startExport }, { exportDims }] = await Promise.all([
      import('./store'),
      import('./export/exporter'),
      import('./render/ratio'),
    ]);
    const doc = useStore.getState().doc;
    if (!doc || doc.items.length === 0) return { error: 'no project loaded' };
    const dims = exportDims(doc.ratio, 720);
    const t0 = performance.now();
    const handle = startExport(doc, { width: dims.w, height: dims.h, fps: fpsArg ?? 30 }, () => {});
    const blob = await handle.promise;
    const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    return {
      size: blob.size,
      type: blob.type,
      ms: Math.round(performance.now() - t0),
      ftyp: String.fromCharCode(...head.subarray(4, 8)),
    };
  };
}
