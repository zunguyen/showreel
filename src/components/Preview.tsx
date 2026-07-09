import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { usePlayback } from '../playback';
import { renderFrame } from '../render/renderFrame';
import { totalDurationMs } from '../render/timing';
import { BASE_DIMS } from '../render/ratio';
import { getBitmap } from '../assets';
import { Button, Slider } from '../toolcraft/ui/components/primitives';
import { CanvasGizmos } from './CanvasGizmos';

function formatTime(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${Math.floor((s % 1) * 10)}`;
}

function Transport() {
  const playing = usePlayback((s) => s.playing);
  const timeMs = usePlayback((s) => s.timeMs);
  const doc = useStore((s) => s.doc)!;
  const total = totalDurationMs(doc);

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-t border-[color:color-mix(in_oklab,var(--border)_12%,transparent)] px-4">
      <Button
        variant="secondary"
        size="icon"
        className="rounded-full"
        onClick={() => usePlayback.getState().toggle()}
        title={playing ? 'Pause (space)' : 'Play (space)'}
      >
        {playing ? '❚❚' : '▶'}
      </Button>
      <Slider
        aria-label="Timeline"
        className="flex-1"
        min={0}
        max={total}
        step={16}
        showFill
        value={Math.min(timeMs, total)}
        onValueChange={(v) => usePlayback.getState().seek(Array.isArray(v) ? v[0] : v)}
      />
      <span className="w-28 text-right font-mono text-2xs text-[color:var(--muted-foreground)]">
        {formatTime(timeMs)} / {formatTime(total)}
      </span>
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
    <section className="flex min-h-0 flex-col">
      <div ref={wrapRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div className="relative flex">
          <canvas ref={canvasRef} className="rounded-lg shadow-2xl" />
          {isBackdrop && <CanvasGizmos />}
        </div>
      </div>
      {!isBackdrop && <Transport />}
    </section>
  );
}
