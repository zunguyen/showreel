import { useEffect, useState, useSyncExternalStore } from 'react';
import { ExportIcon, MoonIcon, SunIcon } from '@phosphor-icons/react';
import { useStore } from '../store';
import { usePlayback } from '../playback';
import { appliedTheme, subscribeTheme, toggleTheme } from '../theme';
import { Button, Input } from '../toolcraft/ui/components/primitives';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../toolcraft/ui/components/composites';
import { MediaRail } from './MediaRail';
import { Preview } from './Preview';
import { Inspector } from './Inspector';
import { BackdropInspector } from './BackdropInspector';
import { ExportModal } from './ExportModal';
import { BackdropExportModal } from './BackdropExportModal';
import { EmptyState } from './EmptyState';
import { ProjectsMenu } from './ProjectsMenu';
import { useWorkspacePreferences } from '../workspacePreferences';

function Brand() {
  return (
    <div className="flex shrink-0 items-center gap-2.5" aria-label="Showreel">
      <span className="brand-mark" aria-hidden>
        <span />
        <span />
      </span>
      <span className="text-sm font-semibold tracking-[-0.02em]">Showreel</span>
    </div>
  );
}

export default function App() {
  const ready = useStore((s) => s.ready);
  const doc = useStore((s) => s.doc);
  const updateDoc = useStore((s) => s.updateDoc);
  const [exportOpen, setExportOpen] = useState(false);
  const theme = useSyncExternalStore(subscribeTheme, appliedTheme);
  const panelLayout = useWorkspacePreferences((s) => s.panelLayout);
  const setPanelLayout = useWorkspacePreferences((s) => s.setPanelLayout);

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

  const isBackdrop = doc?.kind === 'backdrop';
  const hasItems = !!doc && doc.items.length > 0;
  const canExport = isBackdrop || hasItems;

  return (
    <div className="flex h-screen flex-col bg-[color:var(--background)] text-[color:var(--foreground)]">
      <header className="app-header flex h-[52px] shrink-0 items-center gap-3 border-b border-[color:var(--hairline)] px-4">
        <Brand />
        <div className="mx-1 h-4 w-px bg-[color:var(--hairline)]" />
        <ProjectsMenu />
        {doc && (
          <Input
            value={doc.name}
            onChange={(e) => updateDoc({ name: e.target.value })}
            aria-label="Project name"
            className="project-name-input w-48"
          />
        )}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </Button>
        <Button disabled={!canExport} onClick={() => setExportOpen(true)}>
          <ExportIcon />
          Export
        </Button>
      </header>

      {isBackdrop ? (
        <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px]">
          <Preview />
          <BackdropInspector />
        </main>
      ) : hasItems ? (
        <main className="min-h-0 flex-1">
          <ResizablePanelGroup
            id="showreel-workspace"
            orientation="horizontal"
            defaultLayout={panelLayout}
            onLayoutChanged={(layout, meta) => {
              if (meta.isUserInteraction) setPanelLayout(layout);
            }}
          >
            <ResizablePanel
              id="rail"
              defaultSize="220px"
              minSize="180px"
              maxSize="290px"
              groupResizeBehavior="preserve-pixel-size"
            >
              <MediaRail />
            </ResizablePanel>
            <ResizableHandle className="workspace-resize-handle" />
            <ResizablePanel id="canvas" minSize="430px">
              <Preview />
            </ResizablePanel>
            <ResizableHandle className="workspace-resize-handle" />
            <ResizablePanel
              id="inspector"
              defaultSize="320px"
              minSize="284px"
              maxSize="390px"
              groupResizeBehavior="preserve-pixel-size"
            >
              <Inspector />
            </ResizablePanel>
          </ResizablePanelGroup>
        </main>
      ) : (
        <EmptyState />
      )}

      {exportOpen &&
        doc &&
        (isBackdrop ? (
          <BackdropExportModal doc={doc} onClose={() => setExportOpen(false)} />
        ) : (
          <ExportModal doc={doc} onClose={() => setExportOpen(false)} />
        ))}
    </div>
  );
}
