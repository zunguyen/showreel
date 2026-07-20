import { useEffect, useRef } from 'react';
import { PauseIcon, PlayIcon, XIcon } from '@phosphor-icons/react';
import { useStore } from '../store';
import { usePlayback } from '../playback';
import { renderFrame } from '../render/renderFrame';
import { getFrameState, totalDurationMs } from '../render/timing';
import { BASE_DIMS } from '../render/ratio';
import { getBitmap } from '../assets';
import { Button, Slider } from '../toolcraft/ui/components/primitives';
import { CanvasGizmos } from './CanvasGizmos';
import { useWorkspacePreferences } from '../workspacePreferences';

function formatTime(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${Math.floor((s % 1) * 10)}`;
}

function Transport() {
  const playing = usePlayback((s) => s.playing);
  const timeMs = usePlayback((s) => s.timeMs);
  const doc = useStore((s) => s.doc)!;
  const total = totalDurationMs(doc);
  const activeIndex = getFrameState(doc, Math.min(timeMs, total)).aIndex;

  return (
    <div className="timeline-dock flex h-16 shrink-0 items-center gap-3 border-t border-[color:var(--hairline)] px-4">
      <Button
        variant="secondary"
        size="icon"
        className="rounded-full"
        onClick={() => usePlayback.getState().toggle()}
        aria-label={playing ? 'Pause preview' : 'Play preview'}
        title={playing ? 'Pause (space)' : 'Play (space)'}
      >
        {playing ? <PauseIcon weight="fill" /> : <PlayIcon weight="fill" />}
      </Button>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between gap-4 text-[10px] text-[color:var(--muted-foreground)]">
          <span>
            Screen {Math.min(activeIndex + 1, doc.items.length)} of {doc.items.length}
          </span>
          <span className="font-mono tabular-nums">
            {formatTime(timeMs)} / {formatTime(total)}
          </span>
        </div>
        <div className="relative">
          <Slider
            aria-label="Timeline"
            className="w-full"
            min={0}
            max={total}
            step={16}
            showFill
            value={Math.min(timeMs, total)}
            onValueChange={(v) => usePlayback.getState().seek(Array.isArray(v) ? v[0] : v)}
          />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0 -translate-y-1/2">
            {doc.items.slice(1).map((item, index) => (
              <span
                key={item.id}
                className={`absolute h-2 w-px -translate-y-1/2 ${
                  index + 1 <= activeIndex ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--muted-foreground)]/35'
                }`}
                style={{ left: `${((index + 1) / doc.items.length) * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const COACH_STEPS = [
  'Drag screens in the left rail to set the sequence.',
  'Open Templates to choose a motion style.',
  'Preview the result, then Export when it feels right.',
] as const;

function CoachHint() {
  const coachStep = useWorkspacePreferences((s) => s.coachStep);
  const coachDismissed = useWorkspacePreferences((s) => s.coachDismissed);
  const advanceCoach = useWorkspacePreferences((s) => s.advanceCoach);
  const dismissCoach = useWorkspacePreferences((s) => s.dismissCoach);
  const setActiveRailTab = useWorkspacePreferences((s) => s.setActiveRailTab);

  if (coachDismissed) return null;

  const next = () => {
    if (coachStep === 1) setActiveRailTab('templates');
    advanceCoach();
  };

  return (
    <div className="coach-hint absolute left-1/2 top-4 z-20 flex max-w-[430px] -translate-x-1/2 items-center gap-3 rounded-xl border border-white/10 bg-[#17191d]/95 px-3 py-2.5 text-white shadow-xl backdrop-blur">
      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[color:var(--accent)] text-[10px] font-semibold text-white">
        {coachStep + 1}
      </span>
      <p className="min-w-0 flex-1 text-[11px] leading-4 text-white/75">{COACH_STEPS[coachStep]}</p>
      <button
        type="button"
        onClick={next}
        className="text-[11px] font-semibold text-white transition-colors hover:text-[color:var(--accent)]"
      >
        {coachStep === 1 ? 'Show templates' : coachStep === 2 ? 'Got it' : 'Next'}
      </button>
      <button
        type="button"
        aria-label="Dismiss tips"
        onClick={dismissCoach}
        className="flex h-6 w-6 items-center justify-center rounded-md text-white/45 transition-colors hover:bg-white/10 hover:text-white"
      >
        <XIcon size={12} />
      </button>
    </div>
  );
}

export function Preview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Backdrops loop on their own; a timeline scrubber adds nothing.
  const isBackdrop = useStore((s) => s.doc?.kind === 'backdrop');

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(100, now - last);
      last = now;

      const { doc } = useStore.getState();
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!doc || !canvas || !wrap) return;

      const pb = usePlayback.getState();
      const total = totalDurationMs(doc);
      let t = pb.timeMs;
      if (pb.playing) {
        t = (t + dt) % total;
        usePlayback.setState({ timeMs: t });
      } else if (t > total) {
        t = total;
        usePlayback.setState({ timeMs: t });
      }

      const bounds = wrap.getBoundingClientRect();
      const base = BASE_DIMS[doc.ratio];
      // Backdrops reserve extra room for the gizmo bleed (see CanvasGizmos) so
      // off-canvas handles aren't clipped by this container's overflow-hidden.
      const bleed = doc.kind === 'backdrop' ? Math.min(base.w, base.h) * 0.06 : 0;
      const fit = Math.min(
        (bounds.width - 32) / (base.w + 2 * bleed),
        (bounds.height - 32) / (base.h + 2 * bleed),
      );
      if (fit <= 0) return;
      const dw = Math.max(2, Math.floor(base.w * fit));
      const dh = Math.max(2, Math.floor(base.h * fit));
      const dpr = window.devicePixelRatio || 1;
      const pw = Math.round(dw * dpr);
      const ph = Math.round(dh * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
        canvas.style.width = `${dw}px`;
        canvas.style.height = `${dh}px`;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(pw / base.w, 0, 0, ph / base.h, 0, 0);
      renderFrame(ctx, doc, getBitmap, t, base.w, base.h);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section className="canvas-workspace workspace-enter relative flex h-full min-h-0 flex-col">
      {!isBackdrop && <CoachHint />}
      <div ref={wrapRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-5">
        <div className="relative flex">
          <canvas ref={canvasRef} className="preview-canvas rounded-[10px]" />
          {isBackdrop && <CanvasGizmos />}
        </div>
      </div>
      {!isBackdrop && <Transport />}
    </section>
  );
}
