import type { ItemDoc, ProjectDoc, TemplateId } from '../types';
import { clamp, containSize, drawItem, drawItemCropped, type Ctx2D, type Rect } from './draw';

export interface Slot {
  item: ItemDoc;
  img: ImageBitmap;
}

export interface TemplateArgs {
  ctx: Ctx2D;
  W: number;
  H: number;
  doc: ProjectDoc;
  /** content rect after padding + scale */
  rect: Rect;
  /** corner radius in current-resolution px */
  radius: number;
  a: Slot;
  b: Slot | null;
  /** eased transition progress; 0 = a fully shown, 1 = b fully shown */
  p: number;
  /** display progress of a, 0..1 */
  aProg: number;
  displayMs: number;
  aIndex: number;
  slotAt: (index: number) => Slot | null;
}

type TemplateFn = (args: TemplateArgs) => void;

function center(rect: Rect): { cx: number; cy: number } {
  return { cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2 };
}

function drawContained(
  args: TemplateArgs,
  slot: Slot,
  cx: number,
  cy: number,
  scale = 1,
  alpha = 1,
  rotation = 0,
  sizeFactor = 1,
) {
  const { w, h } = containSize(slot.img.width, slot.img.height, args.rect);
  drawItem(args.ctx, slot.img, cx, cy, w * scale * sizeFactor, h * scale * sizeFactor, {
    radius: args.radius,
    shadow: args.doc.shadow,
    alpha,
    rotation,
  });
}

const slide: TemplateFn = (args) => {
  const { doc, W, H, a, b, p } = args;
  const dirs = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] } as const;
  const [dx, dy] = dirs[doc.slideDirection];
  const dist = dx !== 0 ? W : H;
  const { cx, cy } = center(args.rect);
  drawContained(args, a, cx + dx * dist * p, cy + dy * dist * p);
  if (b) drawContained(args, b, cx - dx * dist * (1 - p), cy - dy * dist * (1 - p));
};

const rise: TemplateFn = (args) => {
  const { H, a, b, p } = args;
  const { cx, cy } = center(args.rect);
  drawContained(args, a, cx, cy - H * 0.12 * p, 1 - 0.08 * p, 1 - clamp(p, 0, 1) * 0.9);
  if (b) drawContained(args, b, cx, cy + H * (1 - p));
};

const fadezoom: TemplateFn = (args) => {
  const { a, b, p, aProg } = args;
  const { cx, cy } = center(args.rect);
  drawContained(args, a, cx, cy, 1 + 0.06 * aProg + 0.04 * p, 1 - p);
  if (b) drawContained(args, b, cx, cy, 0.96 + 0.04 * p, p);
};

const stack: TemplateFn = (args) => {
  const { doc, a, p, aIndex, slotAt, rect } = args;
  const N = doc.items.length;
  const { cx, cy } = center(rect);
  const rotFor = (index: number, eff: number) =>
    ((index % 2 === 0 ? 1 : -1) * doc.stackRotation * Math.PI * Math.min(1, Math.max(0, eff))) / 180;

  // cards behind the front one, deepest first
  const maxDepth = Math.min(3, N - 1);
  for (let d = maxDepth; d >= 1; d--) {
    const slot = slotAt(aIndex + d);
    if (!slot) continue;
    const eff = d - p; // slides one step forward as the front card leaves
    const scale = 1 - 0.06 * eff;
    const yOff = -rect.h * 0.05 * eff;
    drawContained(args, slot, cx, cy + yOff, scale, 1 - 0.12 * eff, rotFor(aIndex + d, eff), 0.88);
  }

  // front card exits to the side, rotating away
  const exitRot = (p * (12 + doc.stackRotation) * Math.PI) / 180;
  drawContained(args, a, cx + rect.w * 1.05 * p, cy + rect.h * 0.06 * p, 1 + 0.02 * p, 1 - p * p, exitRot, 0.88);
};

function holdMap(u: number, hold: number): number {
  if (u <= hold) return 0;
  if (u >= 1 - hold) return 1;
  return (u - hold) / (1 - 2 * hold);
}

const scroll: TemplateFn = (args) => {
  const { a, b, p } = args;
  const drawScrolling = (slot: Slot, prog: number, alpha: number) => {
    const { rect, doc, displayMs } = args;
    const img = slot.img;
    const scale = rect.w / img.width;
    const fullH = img.height * scale;
    if (fullH <= rect.h + 1) {
      const { cx, cy } = center(rect);
      drawContained(args, slot, cx, cy, 1, alpha);
      return;
    }
    const hold = clamp(doc.scrollHoldMs / Math.max(1, displayMs), 0, 0.4);
    const t = holdMap(clamp(prog, 0, 1), hold);
    const srcH = rect.h / scale;
    const sy = t * (img.height - srcH);
    drawItemCropped(args.ctx, img, sy, srcH, rect, {
      radius: args.radius,
      shadow: doc.shadow,
      alpha,
    });
  };
  drawScrolling(a, args.aProg, 1 - p);
  if (b) drawScrolling(b, 0, p);
};

export const templates: Record<TemplateId, TemplateFn> = { slide, rise, fadezoom, stack, scroll };
