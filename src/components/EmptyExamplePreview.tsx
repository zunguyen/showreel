import { useEffect, useRef, useState } from 'react';
import { generateSamplePreviewBitmaps } from '../samples';
import { defaultProject, type ProjectDoc } from '../types';
import { renderFrame } from '../render/renderFrame';
import { totalDurationMs } from '../render/timing';

interface PreviewState {
  doc: ProjectDoc;
  assets: Map<string, ImageBitmap>;
}

export function EmptyExamplePreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: ImageBitmap[] = [];

    void generateSamplePreviewBitmaps(3).then((bitmaps) => {
      loaded = bitmaps;
      if (cancelled) {
        bitmaps.forEach((bitmap) => bitmap.close());
        return;
      }
      const assets = new Map<string, ImageBitmap>();
      const doc: ProjectDoc = {
        ...defaultProject('Example reel'),
        itemDurationMs: 2200,
        transitionMs: 700,
        padding: 0.075,
        radius: 18,
        items: bitmaps.map((bitmap, index) => {
          const id = `example-${index}`;
          assets.set(id, bitmap);
          return {
            id,
            assetId: id,
            name: `Example screen ${index + 1}`,
            w: bitmap.width,
            h: bitmap.height,
          };
        }),
      };
      setPreview({ doc, assets });
    });

    return () => {
      cancelled = true;
      loaded.forEach((bitmap) => bitmap.close());
    };
  }, []);

  useEffect(() => {
    if (!preview) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const total = totalDurationMs(preview.doc);
    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const t = reduced ? 1150 : (now - start) % total;
      renderFrame(ctx, preview.doc, (id) => preview.assets.get(id), t, canvas.width, canvas.height);
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [preview]);

  return (
    <div className="empty-preview relative overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#08090b]">
      <canvas ref={canvasRef} width={960} height={540} className="block aspect-video h-auto w-full" />
      {!preview && <div className="absolute inset-0 animate-pulse bg-white/[0.03]" />}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent px-5 pb-4 pt-12">
        <div>
          <p className="text-xs font-medium text-white">Example reel</p>
          <p className="mt-0.5 text-[11px] text-white/55">Three screens · Slide</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/60 backdrop-blur">
          Live preview
        </span>
      </div>
    </div>
  );
}
