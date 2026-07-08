import type { BackgroundDoc, GlowSpec, GradientStop } from '../types';
import { clamp, type Ctx2D } from './draw';

export interface GradientPreset {
  id: string;
  name: string;
  angle: number;
  stops: GradientStop[];
  glows?: GlowSpec[];
}

/** Translucent-light style: low saturation, gentle fades, diffuse glows. */
export const GRADIENT_PRESETS: GradientPreset[] = [
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
    id: 'chromatic-chill',
    name: 'Chromatic Chill',
    angle: 160,
    stops: [
      { color: '#4a8fe0', pos: 0 },
      { color: '#8fb4ec', pos: 1 },
    ],
    glows: [
      { color: '#f6d488', alpha: 0.55, cx: 0.78, cy: 0.82, r: 0.65 },
      { color: '#f2a3c4', alpha: 0.35, cx: 0.55, cy: 0.55, r: 0.55 },
    ],
  },
  {
    id: 'lavender-haze',
    name: 'Lavender Haze',
    angle: 165,
    stops: [
      { color: '#e2def2', pos: 0 },
      { color: '#f8f6fb', pos: 1 },
    ],
    glows: [{ color: '#b9a8e8', alpha: 0.22, cx: 0.7, cy: 0.3, r: 0.6 }],
  },
  {
    id: 'periwinkle',
    name: 'Periwinkle',
    angle: 150,
    stops: [
      { color: '#c6d1ef', pos: 0 },
      { color: '#eef1fa', pos: 1 },
    ],
  },
  {
    id: 'blush-sand',
    name: 'Blush Sand',
    angle: 170,
    stops: [
      { color: '#f0e2da', pos: 0 },
      { color: '#faf6f0', pos: 1 },
    ],
    glows: [{ color: '#f0b9a0', alpha: 0.25, cx: 0.25, cy: 0.75, r: 0.6 }],
  },
  {
    id: 'ivory',
    name: 'Ivory',
    angle: 180,
    stops: [
      { color: '#f2ede3', pos: 0 },
      { color: '#fbfaf6', pos: 1 },
    ],
  },
  {
    id: 'pale-aqua',
    name: 'Pale Aqua',
    angle: 175,
    stops: [
      { color: '#d1e7e2', pos: 0 },
      { color: '#f2f9f7', pos: 1 },
    ],
  },
  {
    id: 'rose-quartz',
    name: 'Rose Quartz',
    angle: 165,
    stops: [
      { color: '#ead7dc', pos: 0 },
      { color: '#f9f2f4', pos: 1 },
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
  },
  {
    id: 'forest-haze',
    name: 'Forest Haze',
    angle: 180,
    stops: [
      { color: '#25312b', pos: 0 },
      { color: '#101613', pos: 1 },
    ],
  },
];

export function presetToBackground(preset: GradientPreset): BackgroundDoc {
  return {
    type: 'gradient',
    presetId: preset.id,
    angle: preset.angle,
    stops: preset.stops.map((s) => ({ ...s })),
    glows: preset.glows?.map((g) => ({ ...g })),
  };
}

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(alpha, 0, 1)})`;
}

/** CSS-convention gradient line endpoints: 0° = to top, 90° = to right. */
function gradientEndpoints(angle: number, W: number, H: number) {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const len = (Math.abs(W * dx) + Math.abs(H * dy)) / 2;
  return { x0: W / 2 - dx * len, y0: H / 2 - dy * len, x1: W / 2 + dx * len, y1: H / 2 + dy * len };
}

/** Fills the full canvas with the background. Pure; identical in preview and export. */
export function drawBackground(ctx: Ctx2D, bg: BackgroundDoc, W: number, H: number) {
  if (bg.type === 'solid') {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const { x0, y0, x1, y1 } = gradientEndpoints(bg.angle, W, H);
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const s of bg.stops) grad.addColorStop(clamp(s.pos, 0, 1), s.color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  for (const glow of bg.glows ?? []) {
    const cx = glow.cx * W;
    const cy = glow.cy * H;
    const r = Math.max(1, glow.r * Math.max(W, H));
    const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    radial.addColorStop(0, rgba(glow.color, glow.alpha));
    radial.addColorStop(1, rgba(glow.color, 0));
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, W, H);
  }
}

/** CSS approximation of the same background, for picker swatches. */
export function cssGradient(bg: BackgroundDoc): string {
  if (bg.type === 'solid') return bg.color;
  const layers: string[] = [];
  for (const glow of bg.glows ?? []) {
    layers.push(
      `radial-gradient(circle at ${glow.cx * 100}% ${glow.cy * 100}%, ${rgba(glow.color, glow.alpha)} 0%, transparent ${Math.round(glow.r * 140)}%)`,
    );
  }
  const stops = bg.stops.map((s) => `${s.color} ${Math.round(clamp(s.pos, 0, 1) * 100)}%`).join(', ');
  layers.push(`linear-gradient(${bg.angle}deg, ${stops})`);
  return layers.join(', ');
}
