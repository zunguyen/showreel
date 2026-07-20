import { useRef, useState } from 'react';
import {
  ArrowCounterClockwiseIcon,
  DownloadSimpleIcon,
  UploadSimpleIcon,
} from '@phosphor-icons/react';
import { useStore } from '../store';
import { GRADIENT_PRESETS, isAnimatedBackground, presetToBackground } from '../render/gradients';
import {
  RATIOS,
  defaultProject,
  migrateBackgroundDoc,
  type BackgroundDoc,
  type ProjectDoc,
  type Ratio,
} from '../types';
import { SegmentedControl, SliderControl } from '../toolcraft/ui/components/controls';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../toolcraft/ui/components/composites';
import { Button } from '../toolcraft/ui/components/primitives';
import { BackgroundSection } from './BackgroundControls';

function Reset({ onClick }: { onClick: () => void }) {
  return (
    <div className="mb-3 flex justify-end">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1.5 text-[11px] font-medium text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--foreground)]"
      >
        <ArrowCounterClockwiseIcon size={12} /> Reset section
      </button>
    </div>
  );
}

/** Right-hand panel for backdrop projects: canvas shape and shared background editor. */
export function BackdropInspector() {
  const doc = useStore((state) => state.doc)!;
  const up = useStore((state) => state.updateDoc);
  const bg = doc.background;
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState('');
  const animated = isAnimatedBackground(bg);
  const classicDefault =
    GRADIENT_PRESETS.find((preset) => preset.id === 'pastel-mesh') ?? GRADIENT_PRESETS[0];

  const exportSettings = () => {
    const payload = JSON.stringify(
      { version: 1, ratio: doc.ratio, itemDurationMs: doc.itemDurationMs, background: doc.background },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${doc.name.trim().replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'backdrop'}-settings.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setNotice('Settings exported');
  };

  const importSettings = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Partial<ProjectDoc> & {
        background?: BackgroundDoc;
      };
      if (!parsed.background || !['solid', 'gradient'].includes(parsed.background.type)) {
        throw new Error('Invalid settings file');
      }
      up({
        background: migrateBackgroundDoc(parsed.background),
        ...(parsed.ratio && RATIOS.includes(parsed.ratio) ? { ratio: parsed.ratio } : {}),
        ...(typeof parsed.itemDurationMs === 'number' ? { itemDurationMs: parsed.itemDurationMs } : {}),
      });
      setNotice('Settings imported');
    } catch {
      setNotice('Could not import this settings file');
    }
  };

  return (
    <aside className="panel-surface flex h-full min-h-0 flex-col border-l border-[color:var(--hairline)]">
      <div className="shrink-0 border-b border-[color:var(--hairline)] px-4 py-3">
        <div className="flex items-center gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[color:var(--muted-foreground)]">
            Backdrop inspector
          </p>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => {
              if (classicDefault) up({ background: presetToBackground(classicDefault) });
            }}
            aria-label="Reset backdrop"
            title="Reset backdrop"
            className="text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--foreground)]"
          >
            <ArrowCounterClockwiseIcon size={13} />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={exportSettings}>
            <UploadSimpleIcon /> Export settings
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <DownloadSimpleIcon /> Import settings
          </Button>
        </div>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importSettings(file);
            event.target.value = '';
          }}
        />
        {notice && <p className="mt-2 text-[10px] text-[color:var(--muted-foreground)]">{notice}</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5">
        <Accordion multiple defaultValue={['canvas', 'background']} className="rounded-none">
          <AccordionItem value="canvas">
            <AccordionTrigger className="py-4 text-xs font-semibold">Canvas</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 pb-5">
              <Reset onClick={() => up({ ratio: defaultProject('').ratio })} />
              <SegmentedControl
                name="Aspect ratio"
                options={RATIOS.map((ratio) => ({ label: ratio, value: ratio }))}
                value={doc.ratio}
                onValueChange={(value) => up({ ratio: value as Ratio })}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="background">
            <AccordionTrigger className="py-4 text-xs font-semibold">Background</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 pb-5">
              <Reset
                onClick={() => {
                  if (classicDefault) up({ background: presetToBackground(classicDefault) });
                }}
              />
              <BackgroundSection bg={bg} up={up} />
              {animated && (
                <SliderControl
                  name="Loop length"
                  unit="s"
                  min={4}
                  max={30}
                  step={1}
                  showFill
                  value={Math.round(doc.itemDurationMs / 1000)}
                  onValueChange={(value) => up({ itemDurationMs: value * 1000 })}
                />
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </aside>
  );
}
