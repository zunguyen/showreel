import type { ProjectDoc } from '../types';
import { easings } from './easing';
import { getFrameState, totalDurationMs } from './timing';
import { scaleRect, type Ctx2D } from './draw';
import { drawBackground } from './gradients';
import { templates, type Slot } from './templates';

export type AssetLookup = (assetId: string) => ImageBitmap | undefined;

/**
 * The single render entry point used by both live preview and export.
 * Deterministic: same (doc, assets, tMs, W, H) always yields the same pixels.
 * Coordinates are resolution-independent; radius is authored at 1080-class.
 */
export function renderFrame(
  ctx: Ctx2D,
  doc: ProjectDoc,
  getAsset: AssetLookup,
  tMs: number,
  W: number,
  H: number,
) {
  ctx.save();
  const durationMs = totalDurationMs(doc);
  drawBackground(ctx, doc.background, W, H, tMs, doc.loop ? durationMs : 0);

  const items = doc.items;
  if (items.length === 0) {
    ctx.restore();
    return;
  }

  const fs = getFrameState(doc, tMs);
  const resScale = Math.min(W, H) / 1080;
  const pad = doc.padding * Math.min(W, H);
  const rect = scaleRect({ x: pad, y: pad, w: W - 2 * pad, h: H - 2 * pad }, doc.scale);

  const slotAt = (i: number): Slot | null => {
    const item = items[((i % items.length) + items.length) % items.length];
    const img = getAsset(item.assetId);
    return img ? { item, img } : null;
  };

  const a = slotAt(fs.aIndex);
  if (!a) {
    ctx.restore();
    return;
  }
  const b = fs.bIndex === null ? null : slotAt(fs.bIndex);
  const p = fs.bIndex === null ? 0 : easings[doc.easing](Math.min(1, Math.max(0, fs.p)));

  templates[doc.template]({
    ctx,
    W,
    H,
    doc,
    rect,
    radius: doc.radius * resScale,
    a,
    b,
    p,
    aProg: fs.aProg,
    displayMs: fs.displayMs,
    aIndex: fs.aIndex,
    slotAt,
  });
  ctx.restore();
}
