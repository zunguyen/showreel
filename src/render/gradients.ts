import type { BackgroundDoc, GlowSpec, GradientKind, GradientStop } from '../types';
import { clamp, type Ctx2D } from './draw';
import { getNoiseTile } from './noise';

type GradientBg = Extract<BackgroundDoc, { type: 'gradient' }>;

export interface GradientPreset {
  id: string;
  name: string;
  angle: number;
  gradientType?: GradientKind;
  stops: GradientStop[];
  glows?: GlowSpec[];
  glowIntensity?: number;
  softness?: number;
  grain?: number;
  animate?: boolean;
  animSpeed?: number;
}

/** Translucent-light style: low saturation, gentle fades, diffuse glows. */
export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: 'sunset-haze',
    name: 'Sunset Haze',
    angle: 180,
    stops: [
      { color: '#8e9bbd', pos: 0 },
      { color: '#d99aa4', pos: 0.55 },
      { color: '#f2a25c', pos: 1 },
    ],
    glows: [{ color: '#e85a3f', alpha: 0.4, cx: 0.5, cy: 1.05, r: 0.6 }],
    grain: 0.3,
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    angle: 165,
    stops: [
      { color: '#f6c887', pos: 0 },
      { color: '#ec9a6f', pos: 0.5 },
      { color: '#8d6a8e', pos: 1 },
    ],
    glows: [{ color: '#ffd9a0', alpha: 0.5, cx: 0.3, cy: 0.75, r: 0.7 }],
    grain: 0.35,
  },
  {
    id: 'sky-wallet',
    name: 'Sky',
    angle: 180,
    stops: [
      { color: '#4da3f5', pos: 0 },
      { color: '#a8d3fa', pos: 0.5 },
      { color: '#ffffff', pos: 1 },
    ],
    glows: [{ color: '#ffffff', alpha: 0.5, cx: 0.5, cy: 0.85, r: 0.6 }],
    softness: 0.2,
  },
  {
    id: 'pastel-mesh',
    name: 'Pastel Mesh',
    angle: 160,
    stops: [
      { color: '#faf6f0', pos: 0 },
      { color: '#f4eef2', pos: 1 },
    ],
    glows: [
      { color: '#f2b8d0', alpha: 0.5, cx: 0.2, cy: 0.25, r: 0.5 },
      { color: '#a8c8f0', alpha: 0.5, cx: 0.8, cy: 0.3, r: 0.55 },
      { color: '#b8e6c8', alpha: 0.45, cx: 0.75, cy: 0.8, r: 0.5 },
      { color: '#c8b8ec', alpha: 0.45, cx: 0.25, cy: 0.8, r: 0.55 },
    ],
    softness: 0.65,
    animate: true,
    animSpeed: 0.35,
  },
  {
    id: 'peach-fuzz',
    name: 'Peach Fuzz',
    angle: 175,
    stops: [
      { color: '#f7dfd4', pos: 0 },
      { color: '#fbf3ec', pos: 1 },
    ],
    glows: [
      { color: '#f5b898', alpha: 0.35, cx: 0.7, cy: 0.3, r: 0.55 },
      { color: '#efc6d8', alpha: 0.3, cx: 0.25, cy: 0.7, r: 0.5 },
    ],
    softness: 0.4,
  },
  {
    id: 'lavender-dawn',
    name: 'Lavender Dawn',
    angle: 170,
    stops: [
      { color: '#d9d2f0', pos: 0 },
      { color: '#f4e9e2', pos: 1 },
    ],
    glows: [
      { color: '#b3a4e8', alpha: 0.3, cx: 0.75, cy: 0.25, r: 0.6 },
      { color: '#f4c5a5', alpha: 0.25, cx: 0.2, cy: 0.8, r: 0.55 },
    ],
    grain: 0.15,
  },
  {
    id: 'cotton-candy',
    name: 'Cotton Candy',
    angle: 150,
    stops: [
      { color: '#f6c5e0', pos: 0 },
      { color: '#c5d8f6', pos: 1 },
    ],
    glows: [{ color: '#ffffff', alpha: 0.4, cx: 0.5, cy: 0.5, r: 0.55 }],
    softness: 0.5,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    angle: 180,
    stops: [
      { color: '#07131a', pos: 0 },
      { color: '#0a1f24', pos: 1 },
    ],
    glows: [
      { color: '#41f0b0', alpha: 0.3, cx: 0.35, cy: 0.35, r: 0.5, stretch: 3, rot: -20 },
      { color: '#7b6cf0', alpha: 0.28, cx: 0.65, cy: 0.6, r: 0.55, stretch: 3.5, rot: -15 },
      { color: '#3ec6e0', alpha: 0.2, cx: 0.5, cy: 0.8, r: 0.45, stretch: 2.5, rot: -25 },
    ],
    animate: true,
    animSpeed: 0.3,
    grain: 0.2,
  },
  {
    id: 'neon-dusk',
    name: 'Neon Dusk',
    angle: 170,
    stops: [
      { color: '#141024', pos: 0 },
      { color: '#2a1440', pos: 1 },
    ],
    glows: [
      { color: '#e04fa0', alpha: 0.35, cx: 0.75, cy: 0.7, r: 0.55 },
      { color: '#37b6e8', alpha: 0.3, cx: 0.2, cy: 0.25, r: 0.5 },
    ],
    glowIntensity: 1.3,
    grain: 0.15,
  },
  {
    id: 'ocean-glass',
    name: 'Ocean Glass',
    angle: 180,
    stops: [
      { color: '#0e3a4a', pos: 0 },
      { color: '#3f8a96', pos: 0.6 },
      { color: '#6fb5c0', pos: 1 },
    ],
    glows: [{ color: '#9fe0e0', alpha: 0.3, cx: 0.6, cy: 0.8, r: 0.55 }],
    softness: 0.3,
  },
  {
    id: 'morning-mist',
    name: 'Morning Mist',
    angle: 180,
    stops: [
      { color: '#dde6ee', pos: 0 },
      { color: '#f7f9fb', pos: 1 },
    ],
  },
  {
    id: 'sage-fade',
    name: 'Sage Fade',
    angle: 180,
    stops: [
      { color: '#7c8884', pos: 0 },
      { color: '#a9b4a2', pos: 0.55 },
      { color: '#cfd8c2', pos: 1 },
    ],
  },
  {
    id: 'slate',
    name: 'Slate',
    angle: 180,
    stops: [
      { color: '#2c3239', pos: 0 },
      { color: '#15181c', pos: 1 },
    ],
  },
  {
    id: 'ink-blue',
    name: 'Ink Blue',
    angle: 170,
    stops: [
      { color: '#1e2442', pos: 0 },
      { color: '#0d101e', pos: 1 },
    ],
    glows: [{ color: '#5b63c7', alpha: 0.18, cx: 0.7, cy: 0.25, r: 0.65 }],
    grain: 0.15,
  },

  // — Japaneasy: Japanese palettes, noisy abstract texture —
  {
    id: 'sakura',
    name: 'Sakura',
    angle: 170,
    stops: [
      { color: '#f6d7e0', pos: 0 },
      { color: '#f9ece5', pos: 1 },
    ],
    glows: [
      { color: '#ef9ebc', alpha: 0.5, cx: 0.3, cy: 0.3, r: 0.55 },
      { color: '#ffffff', alpha: 0.5, cx: 0.75, cy: 0.75, r: 0.5 },
    ],
    softness: 0.35,
    grain: 0.5,
    animate: true,
    animSpeed: 0.3,
  },
  {
    id: 'rising-sun',
    name: 'Rising Sun',
    angle: 180,
    stops: [
      { color: '#f3e6d3', pos: 0 },
      { color: '#eec9a5', pos: 1 },
    ],
    glows: [
      { color: '#d93a2b', alpha: 0.6, cx: 0.5, cy: 0.62, r: 0.38 },
      { color: '#f0a05a', alpha: 0.35, cx: 0.5, cy: 0.7, r: 0.6 },
    ],
    grain: 0.55,
  },
  {
    id: 'aizome',
    name: 'Aizome',
    angle: 165,
    stops: [
      { color: '#2b3a67', pos: 0 },
      { color: '#111830', pos: 1 },
    ],
    glows: [
      { color: '#7b8cc7', alpha: 0.4, cx: 0.7, cy: 0.3, r: 0.6 },
      { color: '#e8a87c', alpha: 0.25, cx: 0.2, cy: 0.8, r: 0.5 },
    ],
    grain: 0.5,
    animate: true,
    animSpeed: 0.3,
  },
  {
    id: 'matcha',
    name: 'Matcha',
    angle: 175,
    stops: [
      { color: '#d5dfc0', pos: 0 },
      { color: '#f1efe2', pos: 1 },
    ],
    glows: [
      { color: '#95b06e', alpha: 0.45, cx: 0.28, cy: 0.65, r: 0.55 },
      { color: '#fff7e0', alpha: 0.45, cx: 0.78, cy: 0.25, r: 0.5 },
    ],
    grain: 0.5,
  },
  {
    id: 'ukiyo',
    name: 'Ukiyo Wave',
    angle: 180,
    stops: [
      { color: '#1d3461', pos: 0 },
      { color: '#3f6d9e', pos: 1 },
    ],
    glows: [
      { color: '#8fd0d8', alpha: 0.4, cx: 0.3, cy: 0.75, r: 0.55, stretch: 2.2, rot: -10 },
      { color: '#f4f0e0', alpha: 0.3, cx: 0.75, cy: 0.3, r: 0.45 },
    ],
    grain: 0.55,
    animate: true,
    animSpeed: 0.35,
  },

  // — Adamantiums: dark metallic sheens, noisy abstract texture —
  {
    id: 'chrome',
    name: 'Chrome',
    angle: 165,
    stops: [
      { color: '#c9cdd6', pos: 0 },
      { color: '#82889a', pos: 0.6 },
      { color: '#a7adbd', pos: 1 },
    ],
    glows: [
      { color: '#ffffff', alpha: 0.55, cx: 0.35, cy: 0.3, r: 0.45, stretch: 3, rot: -25 },
      { color: '#525a70', alpha: 0.35, cx: 0.7, cy: 0.75, r: 0.55, stretch: 2.5, rot: -25 },
    ],
    grain: 0.5,
  },
  {
    id: 'gunmetal',
    name: 'Gunmetal',
    angle: 170,
    stops: [
      { color: '#2b3038', pos: 0 },
      { color: '#121419', pos: 1 },
    ],
    glows: [
      { color: '#5a6b8c', alpha: 0.35, cx: 0.65, cy: 0.35, r: 0.6, stretch: 2.5, rot: -20 },
      { color: '#8c96a8', alpha: 0.2, cx: 0.25, cy: 0.75, r: 0.5, stretch: 2, rot: -20 },
    ],
    grain: 0.55,
    animate: true,
    animSpeed: 0.25,
  },
  {
    id: 'steel-violet',
    name: 'Steel Violet',
    angle: 160,
    stops: [
      { color: '#3a3550', pos: 0 },
      { color: '#171423', pos: 1 },
    ],
    glows: [
      { color: '#8a7bd0', alpha: 0.4, cx: 0.7, cy: 0.3, r: 0.55, stretch: 2.8, rot: -18 },
      { color: '#c05a8c', alpha: 0.22, cx: 0.2, cy: 0.8, r: 0.5 },
    ],
    grain: 0.5,
    animate: true,
    animSpeed: 0.3,
  },
  {
    id: 'bronze',
    name: 'Bronze',
    angle: 170,
    stops: [
      { color: '#75583c', pos: 0 },
      { color: '#2b1e12', pos: 1 },
    ],
    glows: [
      { color: '#d09a5c', alpha: 0.45, cx: 0.35, cy: 0.35, r: 0.5, stretch: 2.5, rot: -22 },
      { color: '#5c3a20', alpha: 0.35, cx: 0.75, cy: 0.8, r: 0.55 },
    ],
    grain: 0.55,
  },
  {
    id: 'cobalt-forge',
    name: 'Cobalt Forge',
    angle: 175,
    stops: [
      { color: '#1a2c4e', pos: 0 },
      { color: '#0b111e', pos: 1 },
    ],
    glows: [
      { color: '#4a90c0', alpha: 0.4, cx: 0.65, cy: 0.35, r: 0.55, stretch: 2.2, rot: -15 },
      { color: '#e07038', alpha: 0.22, cx: 0.22, cy: 0.78, r: 0.4 },
    ],
    grain: 0.5,
    animate: true,
    animSpeed: 0.3,
  },
];

export function presetToBackground(preset: GradientPreset): BackgroundDoc {
  return {
    type: 'gradient',
    presetId: preset.id,
    angle: preset.angle,
    gradientType: preset.gradientType,
    stops: preset.stops.map((s) => ({ ...s })),
    glows: preset.glows?.map((g) => ({ ...g })),
    glowIntensity: preset.glowIntensity,
    softness: preset.softness,
    grain: preset.grain,
    animate: preset.animate,
    animSpeed: preset.animSpeed,
  };
}

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(alpha, 0, 1)})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** CSS-convention gradient line endpoints: 0° = to top, 90° = to right. */
export function gradientEndpoints(angle: number, W: number, H: number) {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const len = (Math.abs(W * dx) + Math.abs(H * dy)) / 2;
  return { x0: W / 2 - dx * len, y0: H / 2 - dy * len, x1: W / 2 + dx * len, y1: H / 2 + dy * len };
}

const GOLDEN_ANGLE = 2.399963229728653;

/**
 * Drift/breathing for glow i as a pure function of tMs. When loopMs > 0,
 * frequencies are quantized to whole cycles over the loop so the orb pose
 * at t = loopMs exactly matches t = 0 (seamless loop).
 */
function animatedGlow(glow: GlowSpec, i: number, tMs: number, loopMs: number, animSpeed: number) {
  const basePeriod = lerp(40_000, 8_000, clamp(animSpeed, 0, 1));
  const phase = i * GOLDEN_ANGLE;
  let w1: number;
  let w2: number;
  if (loopMs > 0) {
    const cycles = Math.max(1, Math.round(loopMs / basePeriod));
    w1 = (2 * Math.PI * cycles) / loopMs;
    w2 = (2 * Math.PI * Math.max(1, cycles - 1)) / loopMs;
  } else {
    w1 = (2 * Math.PI) / basePeriod;
    w2 = w1 * 0.83;
  }
  // Speed also widens the travel, not just the tempo — a slow setting drifts
  // gently, a fast one wanders far enough to visibly reshape the composition.
  const amp = lerp(0.06, 0.18, clamp(animSpeed, 0, 1)) * clamp(glow.drift ?? 1, 0, 1);
  const breathe = lerp(0.05, 0.14, clamp(animSpeed, 0, 1));
  return {
    cx: glow.cx + amp * Math.sin(w1 * tMs + phase),
    cy: glow.cy + amp * Math.cos(w2 * tMs + phase * 1.7),
    r: glow.r * (1 + breathe * Math.sin(w2 * tMs + phase * 3.1)),
  };
}

/**
 * Diamond gradient: color follows L1 distance from center, so contour lines are
 * rotated squares. In each quarter-plane of the rotated frame that distance is a
 * plain linear function, so it renders as four clipped linear gradients.
 */
function drawDiamond(ctx: Ctx2D, bg: GradientBg, W: number, H: number) {
  const rad = (bg.angle * Math.PI) / 180;
  // Vertex reach: at angle 0 the last stop lands exactly on the canvas corners.
  const L = (W + H) / 2;
  const S = W + H; // covers the canvas from center in any rotation
  for (const [sx, sy] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(rad);
    ctx.beginPath();
    ctx.rect(sx > 0 ? 0 : -S, sy > 0 ? 0 : -S, S, S);
    ctx.clip();
    // Endpoint (sx·L/2, sy·L/2) lies on the d = L contour; gradient lines are diamond edges.
    const grad = ctx.createLinearGradient(0, 0, (sx * L) / 2, (sy * L) / 2);
    for (const s of bg.stops) grad.addColorStop(clamp(s.pos, 0, 1), rgba(s.color, s.alpha ?? 1));
    ctx.fillStyle = grad;
    ctx.fillRect(-S, -S, 2 * S, 2 * S);
    ctx.restore();
  }
}

/** Base gradient + glow orbs (no grain — grain composites at final resolution). */
function drawCore(ctx: Ctx2D, bg: GradientBg, W: number, H: number, tMs: number, loopMs: number) {
  const kind = bg.gradientType ?? 'linear';
  if (kind === 'diamond') {
    drawDiamond(ctx, bg, W, H);
  } else {
    let grad: CanvasGradient;
    if (kind === 'radial') {
      grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2);
    } else if (kind === 'angular') {
      // CSS conic convention: starts at 12 o'clock; canvas starts at 3 o'clock.
      grad = ctx.createConicGradient(((bg.angle - 90) * Math.PI) / 180, W / 2, H / 2);
    } else {
      const { x0, y0, x1, y1 } = gradientEndpoints(bg.angle, W, H);
      grad = ctx.createLinearGradient(x0, y0, x1, y1);
    }
    for (const s of bg.stops) grad.addColorStop(clamp(s.pos, 0, 1), rgba(s.color, s.alpha ?? 1));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  const intensity = bg.glowIntensity ?? 1;
  const animate = bg.animate ?? false;
  const speed = bg.animSpeed ?? 0.35;
  (bg.glows ?? []).forEach((glow, i) => {
    const pose = animate ? animatedGlow(glow, i, tMs, loopMs, speed) : glow;
    const stretch = Math.max(0.25, glow.stretch ?? 1);
    ctx.save();
    ctx.translate(pose.cx * W, pose.cy * H);
    ctx.rotate(((glow.rot ?? 0) * Math.PI) / 180);
    ctx.scale(stretch, 1);
    const r = Math.max(1, pose.r * Math.max(W, H));
    const radial = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    radial.addColorStop(0, rgba(glow.color, glow.alpha * intensity));
    radial.addColorStop(1, rgba(glow.color, 0));
    ctx.fillStyle = radial;
    // Cover the whole canvas in transformed space regardless of rotation/stretch.
    const D = (Math.hypot(W, H) * 2) / Math.min(1, stretch);
    ctx.fillRect(-D, -D, 2 * D, 2 * D);
    ctx.restore();
  });
}

let softScratch: OffscreenCanvas | null = null;
let staticCache: { key: string; canvas: OffscreenCanvas } | null = null;

/** Full gradient pipeline: core (optionally at low res for mesh softness) + grain. */
function paintGradient(ctx: Ctx2D, bg: GradientBg, W: number, H: number, tMs: number, loopMs: number) {
  const softness = clamp(bg.softness ?? 0, 0, 1);
  if (softness > 0) {
    // Downscale/upscale as a deterministic, worker-safe blur (ctx.filter is
    // unreliable on OffscreenCanvas outside Chromium).
    const k = lerp(0.6, 0.07, softness);
    const sw = Math.max(2, Math.round(W * k));
    const sh = Math.max(2, Math.round(H * k));
    softScratch ??= new OffscreenCanvas(sw, sh);
    if (softScratch.width !== sw || softScratch.height !== sh) {
      softScratch.width = sw;
      softScratch.height = sh;
    }
    const sc = softScratch.getContext('2d')!;
    drawCore(sc, bg, sw, sh, tMs, loopMs);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(softScratch, 0, 0, sw, sh, 0, 0, W, H);
    ctx.restore();
  } else {
    drawCore(ctx, bg, W, H, tMs, loopMs);
  }

  const grain = clamp(bg.grain ?? 0, 0, 1);
  if (grain > 0) {
    const pattern = ctx.createPattern(getNoiseTile(), 'repeat');
    if (pattern) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = grain * 0.45;
      // Resolution-relative grit so 720p export matches the 1080-class preview.
      const s = Math.max(0.25, Math.min(W, H) / 1080);
      ctx.scale(s, s);
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, W / s, H / s);
      ctx.restore();
    }
  }
}

/** Fills the full canvas with the background. Pure in (bg, W, H, tMs, loopMs); identical in preview and export. */
export function drawBackground(ctx: Ctx2D, bg: BackgroundDoc, W: number, H: number, tMs = 0, loopMs = 0) {
  if (bg.type === 'solid') {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  if (!bg.animate) {
    // Static backgrounds render once and blit thereafter (preview redraws at 60fps).
    const key = `${W}x${H}|${JSON.stringify(bg)}`;
    if (staticCache?.key !== key) {
      const canvas = new OffscreenCanvas(W, H);
      paintGradient(canvas.getContext('2d')!, bg, W, H, 0, 0);
      staticCache = { key, canvas };
    }
    ctx.drawImage(staticCache.canvas, 0, 0);
    return;
  }
  paintGradient(ctx, bg, W, H, tMs, loopMs);
}

/** CSS approximation of the same background, for picker swatches (grain/softness omitted). */
export function cssGradient(bg: BackgroundDoc): string {
  if (bg.type === 'solid') return bg.color;
  const layers: string[] = [];
  const intensity = bg.glowIntensity ?? 1;
  for (const glow of bg.glows ?? []) {
    const stretch = glow.stretch ?? 1;
    const rx = Math.round(glow.r * 140 * stretch);
    const ry = Math.round(glow.r * 140);
    const shape = stretch === 1 ? 'circle' : `ellipse ${rx}% ${ry}%`;
    const extent = stretch === 1 ? ` 0%, transparent ${ry}%` : ', transparent';
    layers.push(
      `radial-gradient(${shape} at ${glow.cx * 100}% ${glow.cy * 100}%, ${rgba(glow.color, glow.alpha * intensity)}${extent})`,
    );
  }
  const stops = bg.stops
    .map((s) => `${rgba(s.color, s.alpha ?? 1)} ${Math.round(clamp(s.pos, 0, 1) * 100)}%`)
    .join(', ');
  const kind = bg.gradientType ?? 'linear';
  if (kind === 'radial') {
    layers.push(`radial-gradient(circle at 50% 50%, ${stops})`);
  } else if (kind === 'angular') {
    layers.push(`conic-gradient(from ${bg.angle}deg at 50% 50%, ${stops})`);
  } else if (kind === 'diamond') {
    // CSS has no diamond gradient; a centered radial is the closest stand-in.
    layers.push(`radial-gradient(circle at 50% 50%, ${stops})`);
  } else {
    layers.push(`linear-gradient(${bg.angle}deg, ${stops})`);
  }
  return layers.join(', ');
}
