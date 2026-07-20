export type Ratio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
export type ProjectKind = 'showreel' | 'backdrop';
export type TemplateId =
  | 'slide'
  | 'rise'
  | 'fadezoom'
  | 'scroll'
  | 'carousel'
  | 'orbit'
  | 'stack'
  | 'depth3d'
  | 'wheel'
  | 'field'
  | 'wipe'
  | 'stories'
  | 'spin'
  | 'flicker'
  | 'globe'
  | 'carousel3d'
  | 'grid'
  | 'spiral';
export type EasingId = 'linear' | 'easeInOut' | 'easeOutExpo' | 'easeOutBack' | 'spring';
export type SlideDirection = 'left' | 'right' | 'up' | 'down';

export interface TemplatePresentation {
  id: TemplateId;
  label: string;
  description: string;
  category: 'Core' | 'Spatial' | 'Transitions';
  /** Representative point in the template animation used for reduced-motion thumbnails. */
  previewTimeMs: number;
}

export interface GradientStop {
  color: string;
  /** 0..1 position along the gradient line */
  pos: number;
  /** 0..1 stop opacity; default 1 */
  alpha?: number;
}

/** Soft radial glow layered over the linear base; coords/radius relative to canvas size. */
export interface GlowSpec {
  color: string;
  alpha: number;
  cx: number;
  cy: number;
  r: number;
  /** x/y aspect of the orb ellipse; default 1 (round). ~3 gives aurora bands */
  stretch?: number;
  /** degrees, orientation of stretched orbs; default 0 */
  rot?: number;
  /** 0..1 how much this orb participates in animation drift; default 1 */
  drift?: number;
}

export type GradientKind = 'linear' | 'radial' | 'angular' | 'diamond';

export type BackgroundDoc =
  | { type: 'solid'; color: string }
  | {
      type: 'gradient';
      /** which preset this came from, for UI highlighting; null once customized */
      presetId: string | null;
      /** CSS convention: 0 = to top, 90 = to right, 180 = to bottom */
      angle: number;
      /** default 'linear' */
      gradientType?: GradientKind;
      /** radial-gradient center, relative to the canvas; defaults to 0.5 */
      radialX?: number;
      radialY?: number;
      /** radial-gradient reach relative to the default canvas radius; defaults to 1 */
      radialSize?: number;
      stops: GradientStop[];
      glows?: GlowSpec[];
      /** 0..2 master multiplier on glow alphas; default 1 */
      glowIntensity?: number;
      /** 0..1 mesh blur amount; default 0 */
      softness?: number;
      /** 0..1 film grain amount; default 0 */
      grain?: number;
      /** Film-grain pixel size at 1080-class resolution; default 1 */
      grainSize?: number;
      /** default false */
      animate?: boolean;
      /** 0..1 drift speed; default 0.35 */
      animSpeed?: number;
    };

export interface ItemDoc {
  id: string;
  assetId: string;
  name: string;
  /** natural size of the stored working copy, px */
  w: number;
  h: number;
}

export interface ProjectDoc {
  version: 1;
  id: string;
  name: string;
  /** 'backdrop' projects have no items; for them itemDurationMs is the loop length */
  kind: ProjectKind;
  ratio: Ratio;
  template: TemplateId;
  easing: EasingId;
  /** total time each item owns (display + outgoing transition) */
  itemDurationMs: number;
  transitionMs: number;
  loop: boolean;
  background: BackgroundDoc;
  /** fraction of the shorter canvas edge */
  padding: number;
  /** px at 1080-class resolution; scaled for other resolutions */
  radius: number;
  shadow: boolean;
  /** 0.5..1 — how much of the padded frame items occupy */
  scale: number;
  slideDirection: SlideDirection;
  scrollHoldMs: number;
  /** degrees, stack template card rotation */
  stackRotation: number;
  /** 0..1 shared strength for spatial and experimental motion templates */
  motionIntensity: number;
  items: ItemDoc[];
  createdAt: number;
  updatedAt: number;
}

export interface ProjectMeta {
  id: string;
  name: string;
  kind: ProjectKind;
  updatedAt: number;
  itemCount: number;
}

export const TEMPLATE_LABELS: Record<TemplateId, string> = {
  slide: 'Slide',
  rise: 'Rise',
  fadezoom: 'Fade & Zoom',
  scroll: 'Scroll',
  carousel: 'Carousel',
  orbit: 'Orbit',
  stack: 'Stack',
  depth3d: '3D',
  wheel: 'Wheel',
  field: 'Field',
  wipe: 'Wipe',
  stories: 'Stories',
  spin: 'Spin',
  flicker: 'Flicker',
  globe: 'Globe',
  carousel3d: 'Carousel 3D',
  grid: 'Grid',
  spiral: 'Spiral',
};

export const TEMPLATE_PRESENTATIONS: readonly TemplatePresentation[] = [
  {
    id: 'slide',
    label: 'Slide',
    description: 'Clean screen-to-screen walkthroughs',
    category: 'Core',
    previewTimeMs: 900,
  },
  {
    id: 'rise',
    label: 'Rise',
    description: 'Mobile screens and product reveals',
    category: 'Core',
    previewTimeMs: 1050,
  },
  {
    id: 'fadezoom',
    label: 'Fade & Zoom',
    description: 'Calm, cinematic case studies',
    category: 'Core',
    previewTimeMs: 1200,
  },
  {
    id: 'scroll',
    label: 'Scroll',
    description: 'Full-page websites and tall designs',
    category: 'Core',
    previewTimeMs: 1350,
  },
  { id: 'carousel', label: 'Carousel', description: 'Editorial image sequences', category: 'Spatial', previewTimeMs: 2050 },
  { id: 'orbit', label: 'Orbit', description: 'Images circling in depth', category: 'Spatial', previewTimeMs: 2050 },
  { id: 'stack', label: 'Stack', description: 'Layered visual collections', category: 'Spatial', previewTimeMs: 2050 },
  { id: 'depth3d', label: '3D', description: 'Dimensional panel turns', category: 'Spatial', previewTimeMs: 2050 },
  { id: 'wheel', label: 'Wheel', description: 'Radial image rotation', category: 'Spatial', previewTimeMs: 2050 },
  { id: 'field', label: 'Field', description: 'Floating image landscape', category: 'Spatial', previewTimeMs: 2050 },
  { id: 'globe', label: 'Globe', description: 'Spherical image orbit', category: 'Spatial', previewTimeMs: 2050 },
  { id: 'carousel3d', label: 'Carousel 3D', description: 'Perspective cover flow', category: 'Spatial', previewTimeMs: 2050 },
  { id: 'grid', label: 'Grid', description: 'Modular gallery movement', category: 'Spatial', previewTimeMs: 2050 },
  { id: 'spiral', label: 'Spiral', description: 'Images coil into focus', category: 'Spatial', previewTimeMs: 2050 },
  { id: 'wipe', label: 'Wipe', description: 'Directional image reveal', category: 'Transitions', previewTimeMs: 2050 },
  { id: 'stories', label: 'Stories', description: 'Vertical social sequence', category: 'Transitions', previewTimeMs: 2050 },
  { id: 'spin', label: 'Spin', description: 'Rotating image handoff', category: 'Transitions', previewTimeMs: 2050 },
  { id: 'flicker', label: 'Flicker', description: 'Fast editorial flashes', category: 'Transitions', previewTimeMs: 2050 },
];

export const EASING_LABELS: Record<EasingId, string> = {
  linear: 'Linear',
  easeInOut: 'Ease in-out',
  easeOutExpo: 'Expo out',
  easeOutBack: 'Back out',
  spring: 'Spring',
};

export const RATIOS: Ratio[] = ['16:9', '9:16', '1:1', '4:3', '3:4'];

type GradientBackground = Extract<BackgroundDoc, { type: 'gradient' }>;

type LegacyArcSettings = {
  colors?: string[];
  horizon?: number;
  width?: number;
  softness?: number;
  grainAmount?: number;
  grainSize?: number;
  backgroundColor?: string;
  path?: string;
};

type LegacyGradientBackground = GradientBackground & {
  style?: 'classic' | 'arc' | 'daylight';
  arc?: LegacyArcSettings;
  daylight?: LegacyArcSettings & { mode?: string };
};

const LEGACY_ARC_COLORS = ['#1EBEB8', '#1C2D9C', '#145A50'] as const;

/** Normalizes provisional Arc/Daylight documents into an editable radial gradient. */
export function migrateBackgroundDoc(background: BackgroundDoc): BackgroundDoc {
  if (background.type !== 'gradient') return background;

  const legacy = background as LegacyGradientBackground;
  if (legacy.style === 'arc' || legacy.style === 'daylight') {
    const source = legacy.style === 'arc' ? legacy.arc : legacy.daylight;
    const { style: _style, arc: _arc, daylight: _daylight, ...classicFields } = legacy;
    void _style;
    void _arc;
    void _daylight;
    const glowColors = legacy.glows?.map((glow) => glow.color) ?? [];
    const colors = [
      source?.colors?.[0] ?? glowColors[0] ?? LEGACY_ARC_COLORS[0],
      source?.colors?.[1] ?? glowColors[1] ?? LEGACY_ARC_COLORS[1],
      source?.colors?.[2] ?? glowColors[2] ?? LEGACY_ARC_COLORS[2],
    ];
    return {
      ...classicFields,
      presetId: null,
      angle: 180,
      gradientType: 'radial',
      radialX: 0.5,
      radialY: source?.horizon ?? 0.05,
      radialSize: Math.max(0.25, Math.min(2, source?.width ?? 1.5)),
      stops: [
        { color: colors[1], pos: 0 },
        { color: colors[1], pos: 0.3 },
        { color: colors[0], pos: 0.53 },
        { color: colors[2], pos: 0.72 },
        { color: source?.backgroundColor ?? '#ECF2F1', pos: 1 },
      ],
      softness: source?.softness ?? legacy.softness,
      grain: source?.grainAmount ?? legacy.grain,
      grainSize: source?.grainSize ?? legacy.grainSize ?? 1,
      animate: legacy.animate ?? (source?.path !== undefined && source.path !== 'still'),
      animSpeed: legacy.animSpeed ?? 0.35,
    };
  }

  const { style: _style, arc: _arc, daylight: _daylight, ...classicFields } = legacy;
  void _style;
  void _arc;
  void _daylight;
  return classicFields;
}

/** Upgrades docs saved before the structured-background schema (bg: string) or the kind field. */
export function migrateProject(raw: ProjectDoc): ProjectDoc {
  const legacy = raw as ProjectDoc & { bg?: unknown };
  let doc = raw;
  if (!legacy.background) {
    doc = {
      ...doc,
      background: { type: 'solid', color: typeof legacy.bg === 'string' ? legacy.bg : '#101418' },
    };
  }
  if (!doc.kind) doc = { ...doc, kind: 'showreel' };
  if (doc.motionIntensity === undefined) doc = { ...doc, motionIntensity: 0.65 };
  doc = { ...doc, background: migrateBackgroundDoc(doc.background) };
  return doc;
}

export function defaultProject(name: string): ProjectDoc {
  const now = Date.now();
  return {
    version: 1,
    id: crypto.randomUUID(),
    name,
    kind: 'showreel',
    ratio: '16:9',
    template: 'slide',
    easing: 'easeInOut',
    itemDurationMs: 2500,
    transitionMs: 700,
    loop: true,
    background: { type: 'solid', color: '#101418' },
    padding: 0.07,
    radius: 16,
    shadow: true,
    scale: 1,
    slideDirection: 'left',
    scrollHoldMs: 500,
    stackRotation: 4,
    motionIntensity: 0.65,
    items: [],
    createdAt: now,
    updatedAt: now,
  };
}
