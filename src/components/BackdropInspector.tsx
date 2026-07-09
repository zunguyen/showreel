import { useStore } from '../store';
import { RATIOS, type Ratio } from '../types';
import { SegmentedControl, SliderControl } from '../toolcraft/ui/components/controls';
import { Separator } from '../toolcraft/ui/components/primitives';
import { BackgroundSection } from './BackgroundControls';

/** Right-hand panel for backdrop projects: just the canvas shape and the background. */
export function BackdropInspector() {
  const doc = useStore((s) => s.doc)!;
  const up = useStore((s) => s.updateDoc);
  const bg = doc.background;
  const animated = bg.type === 'gradient' && (bg.animate ?? false);

  return (
    <aside className="toolcraft-panel-surface flex min-h-0 flex-col gap-4 overflow-y-auto border-l border-[color:color-mix(in_oklab,var(--border)_12%,transparent)] px-3 py-4">
      <SegmentedControl
        name="Aspect ratio"
        options={RATIOS.map((r) => ({ label: r, value: r }))}
        value={doc.ratio}
        onValueChange={(v) => up({ ratio: v as Ratio })}
      />

      <Separator />

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
          onValueChange={(v) => up({ itemDurationMs: v * 1000 })}
        />
      )}
    </aside>
  );
}
