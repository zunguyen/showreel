import { useStore } from '../store';
import {
  EASING_LABELS,
  RATIOS,
  TEMPLATE_LABELS,
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
import { Separator } from '../toolcraft/ui/components/primitives';
import { BackgroundSection } from './BackgroundControls';

const DIRECTION_OPTIONS: { label: string; value: SlideDirection }[] = [
  { label: '←', value: 'left' },
  { label: '→', value: 'right' },
  { label: '↑', value: 'up' },
  { label: '↓', value: 'down' },
];

export function Inspector() {
  const doc = useStore((s) => s.doc)!;
  const up = useStore((s) => s.updateDoc);

  return (
    <aside className="toolcraft-panel-surface flex min-h-0 flex-col gap-4 overflow-y-auto border-l border-[color:color-mix(in_oklab,var(--border)_12%,transparent)] px-3 py-4">
      <SelectControl
        name="Template"
        value={doc.template}
        options={(Object.keys(TEMPLATE_LABELS) as TemplateId[]).map((id) => ({
          label: TEMPLATE_LABELS[id],
          value: id,
        }))}
        onValueChange={(v) => up({ template: v as TemplateId })}
      />

      <SegmentedControl
        name="Aspect ratio"
        options={RATIOS.map((r) => ({ label: r, value: r }))}
        value={doc.ratio}
        onValueChange={(v) => up({ ratio: v as Ratio })}
      />

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

      <SwitchControl name="Loop seamlessly" checked={doc.loop} onCheckedChange={(v) => up({ loop: v })} />

      {doc.template === 'slide' && (
        <SegmentedControl
          name="Slide direction"
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

      <Separator />

      <BackgroundSection bg={doc.background} up={up} />

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
        name="Corner radius"
        unit="px"
        min={0}
        max={48}
        step={1}
        showFill
        value={doc.radius}
        onValueChange={(v) => up({ radius: v })}
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
      <SwitchControl name="Drop shadow" checked={doc.shadow} onCheckedChange={(v) => up({ shadow: v })} />
    </aside>
  );
}
