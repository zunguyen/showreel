import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { usePlayback } from '../playback';
import { Button, Input } from '../toolcraft/ui/components/primitives';
import { MediaRail } from './MediaRail';
import { Preview } from './Preview';
import { Inspector } from './Inspector';
import { ExportModal } from './ExportModal';
import { EmptyState } from './EmptyState';
import { ProjectsMenu } from './ProjectsMenu';

export default function App() {
  const ready = useStore((s) => s.ready);
  const doc = useStore((s) => s.doc);
  const updateDoc = useStore((s) => s.updateDoc);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    void useStore.getState().init();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) return;
      e.preventDefault();
      usePlayback.getState().toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-xs-plus text-[color:var(--muted-foreground)]">
        Loading…
      </div>
    );
  }

  const hasItems = !!doc && doc.items.length > 0;

  return (
    <div className="flex h-screen flex-col bg-[color:var(--background)] text-[color:var(--foreground)]">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[color:color-mix(in_oklab,var(--border)_12%,transparent)] px-4">
        <span className="text-sm font-semibold tracking-tight">Showreel</span>
        <ProjectsMenu />
        {doc && (
          <Input
            value={doc.name}
            onChange={(e) => updateDoc({ name: e.target.value })}
            aria-label="Project name"
            className="w-48"
          />
        )}
        <div className="flex-1" />
        <Button disabled={!hasItems} onClick={() => setExportOpen(true)}>
          Export
        </Button>
      </header>

      {hasItems ? (
        <main className="grid min-h-0 flex-1 grid-cols-[190px_minmax(0,1fr)_300px]">
          <MediaRail />
          <Preview />
          <Inspector />
        </main>
      ) : (
        <EmptyState />
      )}

      {exportOpen && doc && <ExportModal doc={doc} onClose={() => setExportOpen(false)} />}
    </div>
  );
}
