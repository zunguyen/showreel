import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { useStore } from '../store';
import {
  EASING_LABELS,
  RATIOS,
  TEMPLATE_LABELS,
  defaultProject,
  type EasingId,
  type Ratio,
  type SlideDirection,
  type TemplateId,
} from '../types';
import {
  SegmentedControl,
  SelectControl,
  SliderControl,
  SwitchControl,
} from '../toolcraft/ui/components/controls';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../toolcraft/ui/components/composites';
import { BackgroundSection } from './BackgroundControls';

const DIRECTION_OPTIONS: { label: string; value: SlideDirection }[] = [
  { label: 'Left', value: 'left' },
  { label: 'Right', value: 'right' },
  { label: 'Up', value: 'up' },
  { label: 'Down', value: 'down' },
];

const INTENSITY_TEMPLATES = new Set<TemplateId>([
  'carousel',
  'orbit',
  'depth3d',
  'wheel',
  'field',
  'stories',
  'spin',
  'flicker',
  'globe',
  'carousel3d',
  'grid',
  'spiral',
]);

function SectionReset({ onClick }: { onClick: () => void }) {
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

export function Inspector() {
  const doc = useStore((s) => s.doc)!;
  const up = useStore((s) => s.updateDoc);

  const resetMotion = () => {
    const defaults = defaultProject('');
    up({
      itemDurationMs: defaults.itemDurationMs,
      transitionMs: defaults.transitionMs,
      easing: defaults.easing,
      loop: defaults.loop,
      slideDirection: defaults.slideDirection,
      scrollHoldMs: defaults.scrollHoldMs,
      stackRotation: defaults.stackRotation,
      motionIntensity: defaults.motionIntensity,
    });
  };

  const resetCanvas = () => {
    const defaults = defaultProject('');
    up({
      ratio: defaults.ratio,
      padding: defaults.padding,
      radius: defaults.radius,
      scale: defaults.scale,
      shadow: defaults.shadow,
    });
  };

  const resetBackground = () => up({ background: defaultProject('').background });

  return (
    <aside className="panel-surface flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[color:var(--hairline)] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[color:var(--muted-foreground)]">
          Inspector
        </p>
        <p className="mt-1 text-xs font-medium text-[color:var(--foreground)]">
          {TEMPLATE_LABELS[doc.template]} motion
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5">
        <Accordion multiple defaultValue={['motion']} className="rounded-none">
          <AccordionItem value="motion">
            <AccordionTrigger className="py-4 text-xs font-semibold tracking-tight">
              Motion
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 pb-5">
              <SectionReset onClick={resetMotion} />
              <SliderControl
                name="Time per screen"
                unit="s"
                min={0.5}
                max={8}
                step={0.1}
                showFill
                value={Math.round(doc.itemDurationMs / 100) / 10}
                onValueChange={(v) => up({ itemDurationMs: Math.round(v * 1000) })}
              />
              <SliderControl
                name="Transition"
                unit="s"
                min={0.1}
                max={2}
                step={0.05}
                showFill
                value={Math.round(doc.transitionMs / 50) / 20}
                onValueChange={(v) => up({ transitionMs: Math.round(v * 1000) })}
              />
              <SelectControl
                name="Easing"
                value={doc.easing}
                options={(Object.keys(EASING_LABELS) as EasingId[]).map((id) => ({
                  label: EASING_LABELS[id],
                  value: id,
                }))}
                onValueChange={(v) => up({ easing: v as EasingId })}
              />
              <SwitchControl
                name="Loop seamlessly"
                checked={doc.loop}
                onCheckedChange={(v) => up({ loop: v })}
              />

              {(doc.template === 'slide' || doc.template === 'wipe') && (
                <SegmentedControl
                  name="Direction"
                  options={DIRECTION_OPTIONS}
                  value={doc.slideDirection}
                  onValueChange={(v) => up({ slideDirection: v as SlideDirection })}
                />
              )}

              {doc.template === 'scroll' && (
                <SliderControl
                  name="Scroll hold"
                  unit="s"
                  min={0}
                  max={2}
                  step={0.1}
                  showFill
                  value={Math.round(doc.scrollHoldMs / 100) / 10}
                  onValueChange={(v) => up({ scrollHoldMs: Math.round(v * 1000) })}
                />
              )}

              {doc.template === 'stack' && (
                <SliderControl
                  name="Card rotation"
                  unit="°"
                  min={0}
                  max={10}
                  step={1}
                  showFill
                  value={doc.stackRotation}
                  onValueChange={(v) => up({ stackRotation: v })}
                />
              )}

              {INTENSITY_TEMPLATES.has(doc.template) && (
                <SliderControl
                  name="Motion intensity"
                  unit="%"
                  min={20}
                  max={100}
                  step={5}
                  showFill
                  value={Math.round(doc.motionIntensity * 100)}
                  onValueChange={(v) => up({ motionIntensity: v / 100 })}
                />
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="canvas">
            <AccordionTrigger className="py-4 text-xs font-semibold tracking-tight">
              Canvas
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 pb-5">
              <SectionReset onClick={resetCanvas} />
              <SegmentedControl
                name="Aspect ratio"
                options={RATIOS.map((r) => ({ label: r, value: r }))}
                value={doc.ratio}
                onValueChange={(v) => up({ ratio: v as Ratio })}
              />
              <SliderControl
                name="Padding"
                unit="%"
                min={0}
                max={20}
                step={0.5}
                showFill
                value={Math.round(doc.padding * 200) / 2}
                onValueChange={(v) => up({ padding: v / 100 })}
              />
              <SliderControl
                name="Scale"
                unit="%"
                min={50}
                max={100}
                step={1}
                showFill
                value={Math.round(doc.scale * 100)}
                onValueChange={(v) => up({ scale: v / 100 })}
              />
              <SliderControl
                name="Corner radius"
                unit="px"
                min={0}
                max={48}
                step={1}
                showFill
                value={doc.radius}
                onValueChange={(v) => up({ radius: v })}
              />
              <SwitchControl
                name="Drop shadow"
                checked={doc.shadow}
                onCheckedChange={(v) => up({ shadow: v })}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="background">
            <AccordionTrigger className="py-4 text-xs font-semibold tracking-tight">
              Background
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 pb-5">
              <SectionReset onClick={resetBackground} />
              <BackgroundSection bg={doc.background} up={up} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </aside>
  );
}
