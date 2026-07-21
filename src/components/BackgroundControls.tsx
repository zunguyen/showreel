import { GRADIENT_PRESETS, cssGradient, presetToBackground } from '../render/gradients';
import { useEditorUi } from '../editorUi';
import {
  type BackgroundDoc,
  type GlowSpec,
  type GradientStop,
  type ProjectDoc,
} from '../types';
import {
  ColorControl,
  GradientControl,
  SegmentedControl,
  SliderControl,
  SwitchControl,
} from '../toolcraft/ui/components/controls';
import type { GradientStop as TcGradientStop } from '../toolcraft/ui/components/controls/control-types';
import { Button } from '../toolcraft/ui/components/primitives';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react';

const SWATCHES = ['#101418', '#09090b', '#1e1b4b', '#052e16', '#450a0a', '#f4f4f5', '#e8e2d9', '#dbeafe'];

const normHex = (c: string) => (c.startsWith('#') ? c : `#${c}`);

type GradientBg = Extract<BackgroundDoc, { type: 'gradient' }>;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const frac = (v: number) => v - Math.floor(v);

const toTcStops = (stops: GradientStop[]): TcGradientStop[] =>
  stops.map((s) => ({
    color: s.color,
    position: `${Math.round(clamp01(s.pos) * 100)}%`,
    opacity: Math.round((s.alpha ?? 1) * 100),
  }));

const fromTcStops = (stops: readonly TcGradientStop[]): GradientStop[] =>
  stops.map((s) => ({
    color: normHex(s.color),
    pos: clamp01(Number.parseFloat(s.position) / 100),
    alpha: (s.opacity ?? 100) / 100,
  }));

function GradientEditor({ bg, up }: { bg: GradientBg; up: (patch: Partial<ProjectDoc>) => void }) {
  const glows = bg.glows ?? [];
  // Shared with the canvas gizmos so clicking an orb on the canvas selects it here too.
  const selectedOrb = useEditorUi((s) => s.selectedOrb);
  const setSelectedOrb = useEditorUi((s) => s.setSelectedOrb);
  // Same idea for gradient stops: canvas and panel share one selection.
  const selectedStop = useEditorUi((s) => s.selectedStop);
  const setSelectedStop = useEditorUi((s) => s.setSelectedStop);
  const orbIdx = Math.min(selectedOrb, glows.length - 1);
  const orb = orbIdx >= 0 ? glows[orbIdx] : undefined;

  // Any manual edit detaches from the preset (existing convention).
  const patchBg = (patch: Partial<GradientBg>) => up({ background: { ...bg, ...patch, presetId: null } });
  const patchOrb = (patch: Partial<GlowSpec>) =>
    patchBg({ glows: glows.map((g, i) => (i === orbIdx ? { ...g, ...patch } : g)) });

  const addOrb = () => {
    const n = glows.length;
    const orb: GlowSpec = {
      color: bg.stops[n % bg.stops.length].color,
      alpha: 0.4,
      cx: frac(0.618034 * (n + 1) + 0.25),
      cy: frac(0.381966 * (n + 1) + 0.35),
      r: 0.55,
    };
    patchBg({ glows: [...glows, orb] });
    setSelectedOrb(n);
  };

  const removeOrb = () => {
    patchBg({ glows: glows.filter((_, i) => i !== orbIdx) });
    setSelectedOrb(Math.max(0, orbIdx - 1));
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {GRADIENT_PRESETS.map((p) => (
          <button
            key={p.id}
            aria-label={p.name}
            title={p.name}
            onClick={() => up({ background: presetToBackground(p) })}
            style={{ background: cssGradient(presetToBackground(p)) }}
            className={`h-9 rounded-md border ${
              bg.presetId === p.id
                ? 'border-[color:var(--accent)] ring-1 ring-[color:var(--accent)]'
                : 'border-[color:color-mix(in_oklab,var(--border)_12%,transparent)] hover:border-[color:color-mix(in_oklab,var(--border)_40%,transparent)]'
            }`}
          />
        ))}
      </div>

      <GradientControl
        name="Gradient"
        angle={bg.angle}
        gradientType={bg.gradientType ?? 'linear'}
        selectedIndex={selectedStop}
        onSelectedIndexChange={setSelectedStop}
        stops={toTcStops(bg.stops)}
        onValueChange={(v) =>
          patchBg({
            angle: v.angle,
            gradientType: v.gradientType,
            stops: fromTcStops(v.stops),
          })
        }
      />
      {(bg.gradientType ?? 'linear') === 'radial' && (
        <div className="flex flex-col gap-4 border-y border-[color:var(--hairline)] py-4">
          <p className="text-2xs font-semibold uppercase tracking-[0.11em] text-[color:var(--muted-foreground)]">
            Radial geometry
          </p>
          <SliderControl
            name="Center X"
            unit="%"
            min={-20}
            max={120}
            step={1}
            showFill
            value={Math.round((bg.radialX ?? 0.5) * 100)}
            onValueChange={(value) => patchBg({ radialX: value / 100 })}
          />
          <SliderControl
            name="Center Y"
            unit="%"
            min={-20}
            max={120}
            step={1}
            showFill
            value={Math.round((bg.radialY ?? 0.5) * 100)}
            onValueChange={(value) => patchBg({ radialY: value / 100 })}
          />
          <SliderControl
            name="Size"
            unit="%"
            min={25}
            max={200}
            step={1}
            showFill
            value={Math.round((bg.radialSize ?? 1) * 100)}
            onValueChange={(value) => patchBg({ radialSize: value / 100 })}
          />
          <SliderControl
            name="Roundness"
            unit="%"
            min={25}
            max={250}
            step={1}
            showFill
            value={Math.round((bg.radialAspect ?? 1) * 100)}
            onValueChange={(value) => patchBg({ radialAspect: value / 100 })}
          />
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          patchBg({
            stops: bg.stops.map((s) => ({ ...s, pos: clamp01(1 - s.pos) })).reverse(),
          })
        }
      >
        <ArrowsClockwiseIcon /> Reverse stops
      </Button>

      {glows.length > 0 && (
        <SliderControl
          name="Glow"
          unit="%"
          min={0}
          max={200}
          step={5}
          showFill
          value={Math.round((bg.glowIntensity ?? 1) * 100)}
          onValueChange={(v) => patchBg({ glowIntensity: v / 100 })}
        />
      )}
      <SliderControl
        name="Softness"
        unit="%"
        min={0}
        max={100}
        step={1}
        showFill
        value={Math.round((bg.softness ?? 0) * 100)}
        onValueChange={(v) => patchBg({ softness: v / 100 })}
      />
      <SliderControl
        name="Grain amount"
        unit="%"
        min={0}
        max={100}
        step={1}
        showFill
        value={Math.round((bg.grain ?? 0) * 100)}
        onValueChange={(v) => patchBg({ grain: v / 100 })}
      />
      <SliderControl
        name="Grain size"
        unit="px"
        min={1}
        max={6}
        step={1}
        showFill
        value={bg.grainSize ?? 1}
        onValueChange={(value) => patchBg({ grainSize: value })}
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xs text-[color:var(--muted-foreground)]">Orbs</span>
          <div className="flex-1" />
          {glows.map((g, i) => (
            <button
              key={i}
              title={`Orb ${i + 1}`}
              onClick={() => setSelectedOrb(i)}
              style={{ backgroundColor: g.color }}
              className={`h-5 w-5 rounded-full border ${
                i === orbIdx
                  ? 'border-[color:var(--accent)] ring-1 ring-[color:var(--accent)]'
                  : 'border-[color:color-mix(in_oklab,var(--border)_25%,transparent)]'
              }`}
            />
          ))}
          {glows.length < 4 && (
            <button
              title="Add orb"
              onClick={addOrb}
              className="h-5 w-5 rounded-full border border-dashed border-[color:color-mix(in_oklab,var(--border)_40%,transparent)] text-2xs leading-none text-[color:var(--muted-foreground)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
            >
              +
            </button>
          )}
          {orb && (
            <button
              title="Remove orb"
              onClick={removeOrb}
              className="h-5 w-5 rounded-full border border-[color:color-mix(in_oklab,var(--border)_25%,transparent)] text-2xs leading-none text-[color:var(--muted-foreground)] hover:border-[color:var(--destructive)] hover:text-[color:var(--destructive)]"
            >
              −
            </button>
          )}
        </div>
        {orb && (
          <>
            <ColorControl
              name="Orb color"
              hex={orb.color}
              onValueChange={(v) => patchOrb({ color: normHex(v.hex) })}
            />
            <SliderControl
              name="Size"
              unit="%"
              min={10}
              max={100}
              step={1}
              showFill
              value={Math.round(orb.r * 100)}
              onValueChange={(v) => patchOrb({ r: v / 100 })}
            />
            <SliderControl
              name="Opacity"
              unit="%"
              min={0}
              max={100}
              step={1}
              showFill
              value={Math.round(orb.alpha * 100)}
              onValueChange={(v) => patchOrb({ alpha: v / 100 })}
            />
          </>
        )}
      </div>

      <SwitchControl
        name="Animate"
        checked={bg.animate ?? false}
        onCheckedChange={(v) => patchBg({ animate: v })}
      />
      {(bg.animate ?? false) && (
        <SliderControl
          name="Speed"
          unit="%"
          min={0}
          max={100}
          step={5}
          showFill
          value={Math.round((bg.animSpeed ?? 0.35) * 100)}
          onValueChange={(v) => patchBg({ animSpeed: v / 100 })}
        />
      )}
    </>
  );
}

/** Solid/gradient mode switch plus the matching editor. Shared by the showreel
 *  Inspector and the backdrop studio — both edit a ProjectDoc.background. */
export function BackgroundSection({
  bg,
  up,
}: {
  bg: BackgroundDoc;
  up: (patch: Partial<ProjectDoc>) => void;
}) {
  return (
    <>
      <SegmentedControl
        name="Background"
        options={[
          { label: 'Solid', value: 'solid' },
          { label: 'Gradient', value: 'gradient' },
        ]}
        value={bg.type}
        onValueChange={(mode) => {
          if (bg.type === mode) return;
          up({
            background:
              mode === 'solid'
                ? { type: 'solid', color: '#101418' }
                : presetToBackground(GRADIENT_PRESETS[0]),
          });
        }}
      />

      {bg.type === 'solid' ? (
        <div className="flex flex-col gap-2">
          <ColorControl
            name="Color"
            hex={bg.color}
            onValueChange={(v) => up({ background: { type: 'solid', color: normHex(v.hex) } })}
          />
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => up({ background: { type: 'solid', color: c } })}
                style={{ backgroundColor: c }}
                title={c}
                className={`h-5 w-5 rounded-full border ${
                  bg.color === c
                    ? 'border-[color:var(--accent)]'
                    : 'border-[color:color-mix(in_oklab,var(--border)_25%,transparent)]'
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        <GradientEditor bg={bg} up={up} />
      )}
    </>
  );
}
