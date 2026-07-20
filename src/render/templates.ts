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

function drawStretched(
  args: TemplateArgs,
  slot: Slot,
  cx: number,
  cy: number,
  widthScale: number,
  heightScale: number,
  alpha = 1,
  rotation = 0,
  sizeFactor = 1,
) {
  const { w, h } = containSize(slot.img.width, slot.img.height, args.rect);
  drawItem(
    args.ctx,
    slot.img,
    cx,
    cy,
    w * widthScale * sizeFactor,
    h * heightScale * sizeFactor,
    {
      radius: args.radius,
      shadow: args.doc.shadow,
      alpha,
      rotation,
    },
  );
}

function strength(args: TemplateArgs, min = 0.55, max = 1): number {
  return min + (max - min) * clamp(args.doc.motionIntensity ?? 0.65, 0, 1);
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

const carousel: TemplateFn = (args) => {
  const { rect, aIndex, p, slotAt } = args;
  const { cx, cy } = center(rect);
  const s = strength(args);
  const cards: Array<{ slot: Slot; x: number; scale: number; alpha: number; depth: number }> = [];
  for (let offset = -2; offset <= 2; offset++) {
    const slot = slotAt(aIndex + offset);
    if (!slot) continue;
    const position = offset - p;
    const depth = Math.abs(position);
    cards.push({
      slot,
      x: cx + position * rect.w * (0.27 + 0.08 * s),
      scale: 1 - Math.min(0.48, depth * (0.16 + 0.06 * s)),
      alpha: 1 - Math.min(0.72, depth * 0.27),
      depth,
    });
  }
  cards.sort((left, right) => right.depth - left.depth);
  for (const card of cards) {
    drawContained(args, card.slot, card.x, cy, card.scale, card.alpha, 0, 0.64);
  }
};

const orbit: TemplateFn = (args) => {
  const { rect, aIndex, p, slotAt } = args;
  const { cx, cy } = center(rect);
  const s = strength(args);
  const cards: Array<{
    slot: Slot;
    x: number;
    y: number;
    scale: number;
    alpha: number;
    rotation: number;
    depth: number;
  }> = [];
  const count = Math.min(5, Math.max(1, args.doc.items.length));
  for (let offset = 0; offset < count; offset++) {
    const slot = slotAt(aIndex + offset);
    if (!slot) continue;
    const theta = ((offset - p) / count) * Math.PI * 2 + Math.PI / 2;
    const depth = (Math.sin(theta) + 1) / 2;
    cards.push({
      slot,
      x: cx + Math.cos(theta) * rect.w * 0.34 * s,
      y: cy + Math.sin(theta) * rect.h * 0.2 * s,
      scale: 0.54 + depth * 0.34,
      alpha: 0.25 + depth * 0.75,
      rotation: Math.cos(theta) * 0.12 * s,
      depth,
    });
  }
  cards.sort((left, right) => left.depth - right.depth);
  for (const card of cards) {
    drawContained(args, card.slot, card.x, card.y, card.scale, card.alpha, card.rotation, 0.52);
  }
};

const depth3d: TemplateFn = (args) => {
  const { a, b, p, rect } = args;
  const { cx, cy } = center(rect);
  const s = strength(args);
  if (!b) {
    drawContained(args, a, cx, cy);
    return;
  }
  const outgoingWidth = Math.max(0.04, Math.cos((p * Math.PI) / 2));
  const incomingWidth = Math.max(0.04, Math.sin((p * Math.PI) / 2));
  drawStretched(
    args,
    a,
    cx - rect.w * 0.18 * p * s,
    cy,
    outgoingWidth,
    1 - 0.08 * p * s,
    1 - p * 0.55,
    -0.04 * p * s,
  );
  drawStretched(
    args,
    b,
    cx + rect.w * 0.18 * (1 - p) * s,
    cy,
    incomingWidth,
    0.92 + 0.08 * p,
    0.45 + p * 0.55,
    0.04 * (1 - p) * s,
  );
};

const wheel: TemplateFn = (args) => {
  const { rect, aIndex, p, slotAt } = args;
  const { cx, cy } = center(rect);
  const s = strength(args);
  const cards: Array<{
    slot: Slot;
    x: number;
    y: number;
    rotation: number;
    depth: number;
  }> = [];
  for (let offset = -2; offset <= 2; offset++) {
    const slot = slotAt(aIndex + offset);
    if (!slot) continue;
    const angle = (offset - p) * 0.62;
    const depth = Math.cos(angle);
    cards.push({
      slot,
      x: cx + Math.sin(angle) * rect.w * 0.38 * s,
      y: cy + (1 - Math.cos(angle)) * rect.h * 0.24 * s,
      rotation: angle * 0.52 * s,
      depth,
    });
  }
  cards.sort((left, right) => left.depth - right.depth);
  for (const card of cards) {
    const scale = 0.58 + Math.max(0, card.depth) * 0.28;
    drawContained(args, card.slot, card.x, card.y, scale, 0.35 + Math.max(0, card.depth) * 0.65, card.rotation, 0.58);
  }
};

const FIELD_LAYOUT = [
  { x: 0, y: 0.02, z: 1 },
  { x: -0.34, y: -0.2, z: 0.56 },
  { x: 0.34, y: -0.16, z: 0.5 },
  { x: -0.26, y: 0.28, z: 0.38 },
  { x: 0.3, y: 0.25, z: 0.32 },
] as const;

const field: TemplateFn = (args) => {
  const { rect, aIndex, p, aProg, slotAt } = args;
  const { cx, cy } = center(rect);
  const s = strength(args);
  for (let index = FIELD_LAYOUT.length - 1; index >= 0; index--) {
    const point = FIELD_LAYOUT[index];
    const slot = slotAt(aIndex + index + (p > 0.78 ? 1 : 0));
    if (!slot) continue;
    const drift = Math.sin((aProg + index * 0.19) * Math.PI * 2) * rect.h * 0.018 * s;
    const transitionPush = index === 0 ? p : -p * 0.06 * index;
    const scale = point.z + transitionPush * 0.22;
    drawContained(
      args,
      slot,
      cx + point.x * rect.w * s + (index === 0 ? rect.w * 0.42 * p : 0),
      cy + point.y * rect.h * s + drift,
      scale,
      index === 0 ? 1 - p : 0.35 + point.z * 0.55,
      (point.x * 0.11 + transitionPush * 0.18) * s,
      0.62,
    );
  }
  if (args.b) drawContained(args, args.b, cx - rect.w * 0.42 * (1 - p), cy, 0.78 + p * 0.22, p, -0.15 * (1 - p) * s, 0.62);
};

const wipe: TemplateFn = (args) => {
  const { a, b, p, rect, doc, ctx } = args;
  const { cx, cy } = center(rect);
  drawContained(args, a, cx, cy);
  if (!b) return;

  ctx.save();
  ctx.beginPath();
  if (doc.slideDirection === 'left') ctx.rect(rect.x + rect.w * (1 - p), rect.y, rect.w * p, rect.h);
  if (doc.slideDirection === 'right') ctx.rect(rect.x, rect.y, rect.w * p, rect.h);
  if (doc.slideDirection === 'up') ctx.rect(rect.x, rect.y + rect.h * (1 - p), rect.w, rect.h * p);
  if (doc.slideDirection === 'down') ctx.rect(rect.x, rect.y, rect.w, rect.h * p);
  ctx.clip();
  drawContained(args, b, cx, cy);
  ctx.restore();
};

const stories: TemplateFn = (args) => {
  const { rect, aIndex, p, slotAt, ctx } = args;
  const { cx, cy } = center(rect);
  const s = strength(args, 0.7, 1);
  for (let offset = -1; offset <= 1; offset++) {
    const slot = slotAt(aIndex + offset);
    if (!slot) continue;
    const position = offset - p;
    const active = Math.max(0, 1 - Math.abs(position));
    drawContained(
      args,
      slot,
      cx + position * rect.w * 0.31 * s,
      cy,
      0.8 + active * 0.2,
      0.35 + active * 0.65,
      position * 0.035,
      0.52,
    );
  }

  const count = Math.min(args.doc.items.length, 8);
  if (count <= 0) return;
  const gap = rect.w * 0.008;
  const barWidth = Math.min(rect.w * 0.46, 360);
  const segmentWidth = (barWidth - gap * (count - 1)) / count;
  const startX = cx - barWidth / 2;
  const y = rect.y + rect.h * 0.06;
  ctx.save();
  for (let index = 0; index < count; index++) {
    ctx.fillStyle = 'rgba(255,255,255,0.24)';
    ctx.fillRect(startX + index * (segmentWidth + gap), y, segmentWidth, 2);
    if (index <= aIndex % count) {
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      const progress = index < aIndex % count ? 1 : 1 - p;
      ctx.fillRect(startX + index * (segmentWidth + gap), y, segmentWidth * progress, 2);
    }
  }
  ctx.restore();
};

const spin: TemplateFn = (args) => {
  const { a, b, p, rect } = args;
  const { cx, cy } = center(rect);
  const turns = 0.45 + strength(args) * 0.55;
  drawContained(args, a, cx, cy, 1 - p * 0.36, 1 - p, p * Math.PI * turns);
  if (b) drawContained(args, b, cx, cy, 0.64 + p * 0.36, p, -(1 - p) * Math.PI * turns);
};

const flicker: TemplateFn = (args) => {
  const { a, b, p, rect, ctx } = args;
  const { cx, cy } = center(rect);
  if (!b || p <= 0) {
    drawContained(args, a, cx, cy);
    return;
  }
  const pulse = Math.sin(p * Math.PI * 13);
  const showIncoming = p > 0.78 || (p > 0.14 && pulse > 0);
  drawContained(args, showIncoming ? b : a, cx, cy, 1 + Math.abs(pulse) * 0.012 * strength(args));
  const flash = Math.pow(Math.abs(pulse), 8) * 0.16 * strength(args);
  if (flash > 0.01) {
    ctx.save();
    ctx.globalAlpha = flash;
    ctx.fillStyle = pulse > 0 ? '#fff' : '#000';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }
};

const globe: TemplateFn = (args) => {
  const { rect, aIndex, p, slotAt } = args;
  const { cx, cy } = center(rect);
  const s = strength(args);
  const cards: Array<{
    slot: Slot;
    x: number;
    y: number;
    widthScale: number;
    scale: number;
    alpha: number;
    depth: number;
  }> = [];
  for (let offset = -3; offset <= 3; offset++) {
    const slot = slotAt(aIndex + offset);
    if (!slot) continue;
    const theta = (offset - p) * 0.72;
    const depth = Math.cos(theta);
    if (depth < -0.7) continue;
    cards.push({
      slot,
      x: cx + Math.sin(theta) * rect.w * 0.37 * s,
      y: cy + Math.sin(theta * 2) * rect.h * 0.08 * s,
      widthScale: 0.45 + Math.max(0, depth) * 0.55,
      scale: 0.52 + Math.max(0, depth) * 0.36,
      alpha: 0.2 + ((depth + 1) / 2) * 0.8,
      depth,
    });
  }
  cards.sort((left, right) => left.depth - right.depth);
  for (const card of cards) {
    drawStretched(args, card.slot, card.x, card.y, card.widthScale, card.scale, card.alpha, 0, 0.58);
  }
};

const carousel3d: TemplateFn = (args) => {
  const { rect, aIndex, p, slotAt } = args;
  const { cx, cy } = center(rect);
  const s = strength(args);
  const cards: Array<{
    slot: Slot;
    x: number;
    widthScale: number;
    scale: number;
    alpha: number;
    depth: number;
  }> = [];
  for (let offset = -2; offset <= 2; offset++) {
    const slot = slotAt(aIndex + offset);
    if (!slot) continue;
    const angle = (offset - p) * 0.78;
    const depth = Math.cos(angle);
    cards.push({
      slot,
      x: cx + Math.sin(angle) * rect.w * 0.43 * s,
      widthScale: 0.34 + Math.max(0, depth) * 0.66,
      scale: 0.62 + Math.max(0, depth) * 0.34,
      alpha: 0.25 + Math.max(0, depth) * 0.75,
      depth,
    });
  }
  cards.sort((left, right) => left.depth - right.depth);
  for (const card of cards) {
    drawStretched(args, card.slot, card.x, cy, card.widthScale, card.scale, card.alpha, 0, 0.62);
  }
};

const grid: TemplateFn = (args) => {
  const { rect, aIndex, p, slotAt } = args;
  const s = strength(args, 0.72, 1);
  for (let cell = 0; cell < 9; cell++) {
    const col = cell % 3;
    const row = Math.floor(cell / 3);
    const offset = cell - 4;
    const current = slotAt(aIndex + offset);
    const incoming = slotAt(aIndex + offset + 1);
    const x = rect.x + ((col + 0.5) / 3) * rect.w;
    const y = rect.y + ((row + 0.5) / 3) * rect.h;
    const activeCell = cell === 4 ? 1.08 : 1;
    if (current) drawContained(args, current, x, y, activeCell, 1 - p, 0, 0.285 * s);
    if (incoming) drawContained(args, incoming, x, y, 0.88 + p * 0.12, p, 0, 0.285 * s * activeCell);
  }
};

const spiral: TemplateFn = (args) => {
  const { rect, aIndex, p, slotAt } = args;
  const { cx, cy } = center(rect);
  const s = strength(args);
  for (let offset = 5; offset >= 0; offset--) {
    const slot = slotAt(aIndex + offset);
    if (!slot) continue;
    const position = offset - p;
    const angle = position * (0.92 + s * 0.36);
    const radius = Math.max(0, position) * Math.min(rect.w, rect.h) * 0.075 * s;
    const scale = 1 / (1 + Math.max(0, position) * 0.19);
    const alpha = 1 - Math.min(0.76, Math.max(0, position) * 0.13);
    drawContained(
      args,
      slot,
      cx + Math.cos(angle) * radius,
      cy + Math.sin(angle) * radius,
      scale,
      offset === 0 ? 1 - p : alpha,
      angle * 0.12,
      0.72,
    );
  }
  if (args.b && p > 0.02) drawContained(args, args.b, cx, cy, 0.68 + p * 0.32, p, -(1 - p) * 0.3 * s, 0.72);
};

export const templates: Record<TemplateId, TemplateFn> = {
  slide,
  rise,
  fadezoom,
  scroll,
  carousel,
  orbit,
  stack,
  depth3d,
  wheel,
  field,
  wipe,
  stories,
  spin,
  flicker,
  globe,
  carousel3d,
  grid,
  spiral,
};
