import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { useStore } from '../store';
import { RATIOS, defaultProject, type Ratio } from '../types';
import { SegmentedControl, SliderControl } from '../toolcraft/ui/components/controls';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../toolcraft/ui/components/composites';
import { BackgroundSection } from './BackgroundControls';

function Reset({ onClick }: { onClick: () => void }) {
  return (
    <div className="mb-3 flex justify-end">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1.5 text-[11px] font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
      >
        <ArrowCounterClockwiseIcon size={12} /> Reset section
      </button>
    </div>
  );
}

/** Right-hand panel for backdrop projects: canvas shape and animated background. */
export function BackdropInspector() {
  const doc = useStore((s) => s.doc)!;
  const up = useStore((s) => s.updateDoc);
  const bg = doc.background;
  const animated = bg.type === 'gradient' && (bg.animate ?? false);

  return (
    <aside className="panel-surface flex min-h-0 flex-col overflow-y-auto border-l border-[color:var(--hairline)] px-4">
      <div className="border-b border-[color:var(--hairline)] py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[color:var(--muted-foreground)]">
          Backdrop inspector
        </p>
      </div>
      <Accordion multiple defaultValue={['canvas', 'background']} className="rounded-none">
        <AccordionItem value="canvas">
          <AccordionTrigger className="py-4 text-xs font-semibold">Canvas</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 pb-5">
            <Reset onClick={() => up({ ratio: defaultProject('').ratio })} />
            <SegmentedControl
              name="Aspect ratio"
              options={RATIOS.map((r) => ({ label: r, value: r }))}
              value={doc.ratio}
              onValueChange={(v) => up({ ratio: v as Ratio })}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="background">
          <AccordionTrigger className="py-4 text-xs font-semibold">Background</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 pb-5">
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </aside>
  );
}
