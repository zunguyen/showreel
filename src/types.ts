export type Ratio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
export type ProjectKind = 'showreel' | 'backdrop';
export type TemplateId = 'slide' | 'rise' | 'fadezoom' | 'stack' | 'scroll';
export type EasingId = 'linear' | 'easeInOut' | 'easeOutExpo' | 'easeOutBack' | 'spring';
export type SlideDirection = 'left' | 'right' | 'up' | 'down';

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
      stops: GradientStop[];
      glows?: GlowSpec[];
      /** 0..2 master multiplier on glow alphas; default 1 */
      glowIntensity?: number;
      /** 0..1 mesh blur amount; default 0 */
      softness?: number;
      /** 0..1 film grain amount; default 0 */
      grain?: number;
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
  stack: 'Stack',
  scroll: 'Scroll',
};

export const EASING_LABELS: Record<EasingId, string> = {
  linear: 'Linear',
  easeInOut: 'Ease in-out',
  easeOutExpo: 'Expo out',
  easeOutBack: 'Back out',
  spring: 'Spring',
};

export const RATIOS: Ratio[] = ['16:9', '9:16', '1:1', '4:3', '3:4'];

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
    items: [],
    createdAt: now,
    updatedAt: now,
  };
}
