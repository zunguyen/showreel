export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DrawOpts {
  radius: number;
  shadow: boolean;
  alpha?: number;
  /** radians */
  rotation?: number;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function containSize(iw: number, ih: number, rect: Rect): { w: number; h: number } {
  const s = Math.min(rect.w / iw, rect.h / ih);
  return { w: iw * s, h: ih * s };
}

export function scaleRect(rect: Rect, f: number): Rect {
  const w = rect.w * f;
  const h = rect.h * f;
  return { x: rect.x + (rect.w - w) / 2, y: rect.y + (rect.h - h) / 2, w, h };
}

function applyShadow(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.38)';
  ctx.shadowBlur = Math.min(w, h) * 0.08;
  ctx.shadowOffsetY = Math.min(w, h) * 0.025;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.restore();
}

/** Draw an image centered at (cx, cy) at size w×h with rounded corners. */
export function drawItem(
  ctx: Ctx2D,
  img: ImageBitmap,
  cx: number,
  cy: number,
  w: number,
  h: number,
  opts: DrawOpts,
) {
  const alpha = clamp(opts.alpha ?? 1, 0, 1);
  if (alpha <= 0.003 || w < 1 || h < 1) return;
  const r = Math.min(opts.radius, w / 2, h / 2);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  if (opts.rotation) ctx.rotate(opts.rotation);
  const x = -w / 2;
  const y = -h / 2;
  if (opts.shadow) applyShadow(ctx, x, y, w, h, r);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

/** Draw a vertical crop of a tall image filling `rect` (scroll template). */
export function drawItemCropped(
  ctx: Ctx2D,
  img: ImageBitmap,
  sy: number,
  sh: number,
  rect: Rect,
  opts: DrawOpts,
) {
  const alpha = clamp(opts.alpha ?? 1, 0, 1);
  if (alpha <= 0.003) return;
  const r = Math.min(opts.radius, rect.w / 2, rect.h / 2);
  ctx.save();
  ctx.globalAlpha = alpha;
  if (opts.shadow) applyShadow(ctx, rect.x, rect.y, rect.w, rect.h, r);
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, r);
  ctx.clip();
  ctx.drawImage(img, 0, sy, img.width, sh, rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}
