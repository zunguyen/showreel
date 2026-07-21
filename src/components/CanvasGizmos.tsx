import { useRef, useState } from 'react';
import { useStore } from '../store';
import { useEditorUi } from '../editorUi';
import { BASE_DIMS } from '../render/ratio';
import { gradientEndpoints } from '../render/gradients';
import {
  maxGradientStops,
  minGradientStops,
} from '../toolcraft/ui/components/controls/gradient/gradient-control-utils';
import type { BackgroundDoc, GradientStop } from '../types';

type GradientBg = Extract<BackgroundDoc, { type: 'gradient' }>;

type Drag =
  | { type: 'orb'; index: number }
  | { type: 'orbSize'; index: number }
  | { type: 'angleEnd' }
  | { type: 'angleStart' }
  | { type: 'radialCenter' }
  | { type: 'radialSize' }
  | { type: 'radialWidth' }
  | { type: 'stop'; index: number };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

interface Point {
  x: number;
  y: number;
}

interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Where color stops live on the canvas for the current gradient type: a segment
 * (linear line, radial center→edge, diamond center→edge midpoint) or a ring
 * (angular). toPoint/toParam map stop pos 0..1 to/from canvas coordinates.
 */
type StopAxis = {
  toPoint: (t: number) => Point;
  toParam: (p: Point, prev?: number) => number;
} & ({ shape: 'line'; a: Point; b: Point } | { shape: 'ring'; c: Point; r: number });

/** Pulls `p` toward `anchor` until it sits inside `rect` (anchor assumed inside). */
function pullIntoRect(p: Point, anchor: Point, rect: Rect) {
  let k = 1;
  const dx = p.x - anchor.x;
  const dy = p.y - anchor.y;
  if (p.x < rect.minX) k = Math.min(k, (rect.minX - anchor.x) / dx);
  if (p.x > rect.maxX) k = Math.min(k, (rect.maxX - anchor.x) / dx);
  if (p.y < rect.minY) k = Math.min(k, (rect.minY - anchor.y) / dy);
  if (p.y > rect.maxY) k = Math.min(k, (rect.maxY - anchor.y) / dy);
  return { x: anchor.x + dx * k, y: anchor.y + dy * k };
}

/** Visible parameter range of the segment P0 + t·v inside `rect`, intersected with [0,1]. */
function visibleRange(x0: number, y0: number, vx: number, vy: number, rect: Rect) {
  let lo = 0;
  let hi = 1;
  const slab = (p0: number, v: number, min: number, max: number) => {
    if (v === 0) return;
    let a = (min - p0) / v;
    let b = (max - p0) / v;
    if (a > b) [a, b] = [b, a];
    lo = Math.max(lo, a);
    hi = Math.min(hi, b);
  };
  slab(x0, vx, rect.minX, rect.maxX);
  slab(y0, vy, rect.minY, rect.maxY);
  return { lo, hi: Math.max(lo, hi) };
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`;
}

/** Gradient color at position t, so stops added from the canvas blend in invisibly. */
function colorAtPos(stops: GradientStop[], t: number): { color: string; alpha: number } {
  const sorted = [...stops].sort((a, b) => a.pos - b.pos);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (t <= first.pos) return { color: first.color, alpha: first.alpha ?? 1 };
  if (t >= last.pos) return { color: last.color, alpha: last.alpha ?? 1 };
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (t >= a.pos && t <= b.pos) {
      const k = b.pos === a.pos ? 0 : (t - a.pos) / (b.pos - a.pos);
      const ca = hexToRgb(a.color);
      const cb = hexToRgb(b.color);
      return {
        color: rgbToHex(
          ca.r + (cb.r - ca.r) * k,
          ca.g + (cb.g - ca.g) * k,
          ca.b + (cb.b - ca.b) * k,
        ),
        alpha: (a.alpha ?? 1) + ((b.alpha ?? 1) - (a.alpha ?? 1)) * k,
      };
    }
  }
  return { color: last.color, alpha: last.alpha ?? 1 };
}

/** Floating value readout (e.g. "46%", "160°") shown above the handle being dragged. */
function GizmoBadge({ x, y, text, hs }: { x: number; y: number; text: string; hs: number }) {
  const fs = hs * 1.6;
  const w = text.length * fs * 0.6 + fs;
  const h = fs * 1.45;
  return (
    <g pointerEvents="none">
      <rect x={x - w / 2} y={y - hs * 1.9 - h} width={w} height={h} rx={h * 0.3} fill="var(--accent)" />
      <text
        x={x}
        y={y - hs * 1.9 - h / 2}
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={fs}
        fontWeight={600}
        fill="white"
      >
        {text}
      </text>
    </g>
  );
}

/**
 * Direct-manipulation overlay for gradient backgrounds: drag orbs to place them,
 * drag the line ends to rotate the gradient, drag stop dots to reposition stops,
 * click the stop track to insert a stop, double-click a stop to remove it.
 * Rendered in the same coordinate space as the canvas via the SVG viewBox.
 */
export function CanvasGizmos() {
  const doc = useStore((s) => s.doc)!;
  const up = useStore((s) => s.updateDoc);
  const selectedOrb = useEditorUi((s) => s.selectedOrb);
  const setSelectedOrb = useEditorUi((s) => s.setSelectedOrb);
  const selectedStop = useEditorUi((s) => s.selectedStop);
  const setSelectedStop = useEditorUi((s) => s.setSelectedStop);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  // Mirrors dragRef so the badge re-renders on drag start/end (refs don't).
  const [dragUi, setDragUi] = useState<Drag | null>(null);

  const bg = doc.background;
  if (bg.type !== 'gradient') return null;

  const { w: W, h: H } = BASE_DIMS[doc.ratio];
  const kind = bg.gradientType ?? 'linear';
  const glows = bg.glows ?? [];
  const hs = Math.min(W, H) / 70; // handle radius in canvas units (~7px on screen)
  // Bleed: the gizmo layer extends past the canvas so off-canvas handles stay reachable;
  // anything still beyond it is pulled back to this edge.
  const M = Math.min(W, H) * 0.06;
  const safe: Rect = {
    minX: -M + hs * 1.2,
    minY: -M + hs * 1.2,
    maxX: W + M - hs * 1.2,
    maxY: H + M - hs * 1.2,
  };
  const center = { x: W / 2, y: H / 2 };

  const patchBg = (patch: Partial<GradientBg>) =>
    up({ background: { ...bg, ...patch, presetId: null } });

  const toLocal = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: -M + ((e.clientX - rect.left) / rect.width) * (W + 2 * M),
      y: -M + ((e.clientY - rect.top) / rect.height) * (H + 2 * M),
    };
  };

  const axis: StopAxis = (() => {
    if (kind === 'radial') {
      const c = { x: (bg.radialX ?? 0.5) * W, y: (bg.radialY ?? 0.5) * H };
      const R = Math.max(1, (Math.hypot(W, H) / 2) * (bg.radialSize ?? 1));
      return {
        shape: 'line' as const,
        a: c,
        b: { x: c.x + R, y: c.y },
        toPoint: (t: number) => ({ x: c.x + R * t, y: c.y }),
        toParam: (p: Point) => clamp((p.x - c.x) / R, 0, 1),
      };
    }
    if (kind === 'angular') {
      const rr = Math.min(W, H) * 0.32;
      return {
        shape: 'ring' as const,
        c: center,
        r: rr,
        toPoint: (t: number) => {
          const a = ((bg.angle + t * 360) * Math.PI) / 180;
          return { x: center.x + Math.sin(a) * rr, y: center.y - Math.cos(a) * rr };
        },
        toParam: (p: Point, prev?: number) => {
          const ang = (Math.atan2(p.x - center.x, -(p.y - center.y)) * 180) / Math.PI;
          let t = (((ang - bg.angle) % 360) + 360) % 360 / 360;
          // The ring wraps: keep the value continuous with where the stop was.
          if (typeof prev === 'number') {
            for (const cand of [t - 1, t + 1]) {
              if (Math.abs(cand - prev) < Math.abs(t - prev)) t = cand;
            }
          }
          return clamp(t, 0, 1);
        },
      };
    }
    if (kind === 'diamond') {
      // Stops run from center to the midpoint of a diamond edge: the point
      // (t·L/2, t·L/2) in the renderer's rotated frame sits on the pos-t contour.
      const rad = (bg.angle * Math.PI) / 180;
      const L = (W + H) / 2;
      const v = {
        x: (Math.cos(rad) - Math.sin(rad)) * (L / 2),
        y: (Math.sin(rad) + Math.cos(rad)) * (L / 2),
      };
      const len2 = v.x * v.x + v.y * v.y;
      return {
        shape: 'line' as const,
        a: center,
        b: { x: center.x + v.x, y: center.y + v.y },
        toPoint: (t: number) => ({ x: center.x + v.x * t, y: center.y + v.y * t }),
        toParam: (p: Point) =>
          clamp(((p.x - center.x) * v.x + (p.y - center.y) * v.y) / len2, 0, 1),
      };
    }
    const { x0, y0, x1, y1 } = gradientEndpoints(bg.angle, W, H);
    const v = { x: x1 - x0, y: y1 - y0 };
    const len2 = v.x * v.x + v.y * v.y;
    return {
      shape: 'line' as const,
      a: { x: x0, y: y0 },
      b: { x: x1, y: y1 },
      toPoint: (t: number) => ({ x: x0 + v.x * t, y: y0 + v.y * t }),
      toParam: (p: Point) => clamp(((p.x - x0) * v.x + (p.y - y0) * v.y) / len2, 0, 1),
    };
  })();

  const startDrag = (drag: Drag) => (e: React.PointerEvent<SVGElement>) => {
    e.stopPropagation();
    try {
      (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
    } catch {
      // stale/synthetic pointer id — dragging still works while the pointer stays over the svg
    }
    dragRef.current = drag;
    setDragUi(drag);
    if (drag.type === 'orb' || drag.type === 'orbSize') setSelectedOrb(drag.index);
    if (drag.type === 'stop') setSelectedStop(drag.index);
  };

  const endDrag = () => {
    dragRef.current = null;
    setDragUi(null);
  };

  const onPointerMove = (e: React.PointerEvent<SVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = toLocal(e);
    if (drag.type === 'orb') {
      patchBg({
        glows: glows.map((g, i) =>
          i === drag.index
            ? { ...g, cx: clamp(p.x / W, -0.2, 1.2), cy: clamp(p.y / H, -0.2, 1.2) }
            : g,
        ),
      });
    } else if (drag.type === 'orbSize') {
      const g = glows[drag.index];
      const dist = Math.hypot(p.x - g.cx * W, p.y - g.cy * H);
      patchBg({
        glows: glows.map((gg, i) =>
          i === drag.index ? { ...gg, r: clamp(dist / Math.max(W, H), 0.1, 1) } : gg,
        ),
      });
    } else if (drag.type === 'radialCenter') {
      patchBg({
        radialX: clamp(p.x / W, -0.2, 1.2),
        radialY: clamp(p.y / H, -0.2, 1.2),
      });
    } else if (drag.type === 'radialSize') {
      const cx = (bg.radialX ?? 0.5) * W;
      const cy = (bg.radialY ?? 0.5) * H;
      const radius = Math.hypot(p.x - cx, p.y - cy);
      patchBg({ radialSize: clamp(radius / (Math.hypot(W, H) / 2), 0.25, 2) });
    } else if (drag.type === 'radialWidth') {
      const cx = (bg.radialX ?? 0.5) * W;
      const cy = (bg.radialY ?? 0.5) * H;
      const R = Math.max(1, (Math.hypot(W, H) / 2) * (bg.radialSize ?? 1));
      const aspect = Math.hypot(p.x - cx, p.y - cy) / R;
      patchBg({ radialAspect: Math.round(clamp(aspect, 0.25, 2.5) * 100) / 100 });
    } else if (drag.type === 'angleEnd' || drag.type === 'angleStart') {
      const dx = p.x - W / 2;
      const dy = p.y - H / 2;
      let ang = Math.round((Math.atan2(dx, -dy) * 180) / Math.PI);
      if (drag.type === 'angleStart') ang += 180;
      patchBg({ angle: ((ang % 360) + 360) % 360 });
    } else if (drag.type === 'stop') {
      const t = axis.toParam(p, bg.stops[drag.index]?.pos);
      patchBg({
        stops: bg.stops.map((s, i) =>
          i === drag.index ? { ...s, pos: Math.round(t * 100) / 100 } : s,
        ),
      });
    }
  };

  const handleProps = (drag: Drag) => ({
    onPointerDown: startDrag(drag),
    onPointerMove,
    onPointerUp: endDrag,
    onLostPointerCapture: endDrag,
    style: { pointerEvents: 'auto' as const, cursor: 'grab' },
  });

  const addStopAt = (e: React.PointerEvent<SVGElement>) => {
    if (bg.stops.length >= maxGradientStops) return;
    e.stopPropagation();
    const t = Math.round(axis.toParam(toLocal(e)) * 100) / 100;
    const { color, alpha } = colorAtPos(bg.stops, t);
    patchBg({
      stops: [...bg.stops, { color, pos: t, ...(alpha < 0.995 ? { alpha } : {}) }],
    });
    setSelectedStop(bg.stops.length);
  };

  const removeStop = (index: number) => {
    if (bg.stops.length <= minGradientStops) return;
    patchBg({ stops: bg.stops.filter((_, i) => i !== index) });
    setSelectedStop(Math.max(0, Math.min(index, bg.stops.length - 2)));
  };

  // Rotation handle for angular/diamond, past the stop ring so they don't collide.
  const rotHandle =
    kind === 'angular' || kind === 'diamond'
      ? (() => {
          const rad = (bg.angle * Math.PI) / 180;
          const R = Math.min(W, H) * 0.45;
          return { x: W / 2 + Math.sin(rad) * R, y: H / 2 - Math.cos(rad) * R };
        })()
      : null;

  // Line-shaped stop tracks are clamped ALONG the axis (not pulled toward the
  // canvas center) so the drawn line, hit area, and stop dots stay collinear
  // even when the axis doesn't pass through the canvas center (radial).
  const stopRange =
    axis.shape === 'line'
      ? visibleRange(axis.a.x, axis.a.y, axis.b.x - axis.a.x, axis.b.y - axis.a.y, safe)
      : { lo: 0, hi: 1 };
  const trackA = axis.shape === 'line' ? axis.toPoint(stopRange.lo) : null;
  const trackB = axis.shape === 'line' ? axis.toPoint(stopRange.hi) : null;

  const radial =
    kind === 'radial'
      ? {
          center: { x: (bg.radialX ?? 0.5) * W, y: (bg.radialY ?? 0.5) * H },
          radius: (Math.hypot(W, H) / 2) * (bg.radialSize ?? 1),
          aspect: clamp(bg.radialAspect ?? 1, 0.2, 2.5),
        }
      : null;
  // Width handle: perpendicular to the stop axis, on the ellipse's vertical
  // extent (the Figma-style "roundness" dot). Clamped along its ray so it
  // stays reachable when the ellipse runs past the canvas.
  const radialWidthPt = radial
    ? (() => {
        const ry = radial.radius * radial.aspect;
        const range = visibleRange(radial.center.x, radial.center.y, 0, ry, safe);
        return { x: radial.center.x, y: radial.center.y + ry * range.hi };
      })()
    : null;

  const canAddStop = bg.stops.length < maxGradientStops;
  const stopHitProps = {
    onPointerDown: addStopAt,
    style: {
      pointerEvents: 'stroke' as const,
      cursor: canAddStop ? ('copy' as const) : ('default' as const),
    },
  };

  const badge = (() => {
    if (!dragUi) return null;
    if (dragUi.type === 'stop') {
      const s = bg.stops[dragUi.index];
      if (!s) return null;
      const pt = axis.toPoint(clamp(clamp(s.pos, 0, 1), stopRange.lo, stopRange.hi));
      return <GizmoBadge x={pt.x} y={pt.y} text={`${Math.round(s.pos * 100)}%`} hs={hs} />;
    }
    if (dragUi.type === 'angleEnd' || dragUi.type === 'angleStart') {
      const pt = kind === 'linear' ? (dragUi.type === 'angleStart' ? trackA : trackB) : rotHandle;
      return pt ? <GizmoBadge x={pt.x} y={pt.y} text={`${Math.round(bg.angle)}°`} hs={hs} /> : null;
    }
    if (dragUi.type === 'radialSize' && trackB) {
      return (
        <GizmoBadge
          x={trackB.x}
          y={trackB.y}
          text={`${Math.round((bg.radialSize ?? 1) * 100)}%`}
          hs={hs}
        />
      );
    }
    if (dragUi.type === 'radialWidth' && radialWidthPt) {
      return (
        <GizmoBadge
          x={radialWidthPt.x}
          y={radialWidthPt.y}
          text={`${Math.round((bg.radialAspect ?? 1) * 100)}%`}
          hs={hs}
        />
      );
    }
    return null;
  })();

  const stopDots = bg.stops.map((s, i) => {
    const t = clamp(clamp(s.pos, 0, 1), stopRange.lo, stopRange.hi);
    const pt = axis.toPoint(t);
    const selected = i === selectedStop;
    return (
      <circle
        key={i}
        cx={pt.x}
        cy={pt.y}
        r={hs * 0.8}
        fill={s.color}
        stroke={selected ? 'var(--accent)' : 'white'}
        strokeWidth={selected ? 2.5 : 1.5}
        vectorEffect="non-scaling-stroke"
        {...handleProps({ type: 'stop', index: i })}
        onDoubleClick={(e) => {
          e.stopPropagation();
          removeStop(i);
        }}
      />
    );
  });

  return (
    <svg
      ref={svgRef}
      viewBox={`${-M} ${-M} ${W + 2 * M} ${H + 2 * M}`}
      preserveAspectRatio="none"
      className="absolute"
      style={{
        pointerEvents: 'none',
        left: `${(-M / W) * 100}%`,
        top: `${(-M / H) * 100}%`,
        width: `${((W + 2 * M) / W) * 100}%`,
        height: `${((H + 2 * M) / H) * 100}%`,
      }}
    >
      {radial && (
        <>
          <ellipse
            cx={radial.center.x}
            cy={radial.center.y}
            rx={radial.radius}
            ry={radial.radius * radial.aspect}
            fill="none"
            stroke="white"
            strokeOpacity={0.4}
            strokeDasharray="6 6"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          {trackA && (
            <circle
              cx={trackA.x}
              cy={trackA.y}
              r={hs}
              fill="white"
              stroke="rgba(0,0,0,0.45)"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              {...handleProps({ type: 'radialCenter' })}
            />
          )}
        </>
      )}

      {rotHandle && (
        <>
          <line
            x1={W / 2}
            y1={H / 2}
            x2={rotHandle.x}
            y2={rotHandle.y}
            stroke="white"
            strokeOpacity={0.5}
            strokeWidth={1}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={rotHandle.x}
            cy={rotHandle.y}
            r={hs * 0.9}
            fill="white"
            stroke="rgba(0,0,0,0.45)"
            vectorEffect="non-scaling-stroke"
            {...handleProps({ type: 'angleEnd' })}
          />
        </>
      )}

      {/* Stop track: visible guide + fat invisible hit area for click-to-add. */}
      {axis.shape === 'line' && trackA && trackB && (
        <>
          <line
            x1={trackA.x}
            y1={trackA.y}
            x2={trackB.x}
            y2={trackB.y}
            stroke="white"
            strokeOpacity={0.65}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={trackA.x}
            y1={trackA.y}
            x2={trackB.x}
            y2={trackB.y}
            stroke="transparent"
            strokeWidth={hs * 2.2}
            {...stopHitProps}
          />
        </>
      )}
      {axis.shape === 'ring' && (
        <>
          <circle
            cx={axis.c.x}
            cy={axis.c.y}
            r={axis.r}
            fill="none"
            stroke="white"
            strokeOpacity={0.5}
            strokeWidth={1.5}
            strokeDasharray="6 6"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={axis.c.x}
            cy={axis.c.y}
            r={axis.r}
            fill="none"
            stroke="transparent"
            strokeWidth={hs * 2.2}
            {...stopHitProps}
          />
        </>
      )}

      {stopDots}

      {kind === 'linear' && trackA && trackB && (
        <>
          <rect
            x={trackA.x - hs * 0.7}
            y={trackA.y - hs * 0.7}
            width={hs * 1.4}
            height={hs * 1.4}
            fill="white"
            stroke="rgba(0,0,0,0.45)"
            vectorEffect="non-scaling-stroke"
            {...handleProps({ type: 'angleStart' })}
          />
          <rect
            x={trackB.x - hs * 0.7}
            y={trackB.y - hs * 0.7}
            width={hs * 1.4}
            height={hs * 1.4}
            fill="white"
            stroke="rgba(0,0,0,0.45)"
            vectorEffect="non-scaling-stroke"
            {...handleProps({ type: 'angleEnd' })}
          />
        </>
      )}

      {radial && trackB && (
        <circle
          cx={trackB.x}
          cy={trackB.y}
          r={hs * 0.75}
          fill="white"
          stroke="rgba(0,0,0,0.45)"
          vectorEffect="non-scaling-stroke"
          {...handleProps({ type: 'radialSize' })}
          style={{ pointerEvents: 'auto', cursor: 'ew-resize' }}
        />
      )}
      {radialWidthPt && (
        <circle
          cx={radialWidthPt.x}
          cy={radialWidthPt.y}
          r={hs * 0.75}
          fill="white"
          stroke="rgba(0,0,0,0.45)"
          vectorEffect="non-scaling-stroke"
          {...handleProps({ type: 'radialWidth' })}
          style={{ pointerEvents: 'auto', cursor: 'ns-resize' }}
        />
      )}

      {glows.map((g, i) => {
        const truePos = { x: g.cx * W, y: g.cy * H };
        const pos = pullIntoRect(truePos, center, safe);
        const R = g.r * Math.max(W, H);
        const selected = i === selectedOrb;
        // Size handle sits on the extent circle, on the side facing the canvas
        // center, so it stays on screen even for huge or off-canvas orbs.
        const toC = { x: center.x - truePos.x, y: center.y - truePos.y };
        const len = Math.hypot(toC.x, toC.y) || 1;
        const sizePos = pullIntoRect(
          { x: truePos.x + (toC.x / len) * R, y: truePos.y + (toC.y / len) * R },
          center,
          safe,
        );
        return (
          <g key={i}>
            {selected && (
              <>
                <circle
                  cx={truePos.x}
                  cy={truePos.y}
                  r={R}
                  fill="none"
                  stroke="white"
                  strokeOpacity={0.4}
                  strokeDasharray="6 6"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={sizePos.x}
                  cy={sizePos.y}
                  r={hs * 0.7}
                  fill="white"
                  stroke="rgba(0,0,0,0.45)"
                  vectorEffect="non-scaling-stroke"
                  {...handleProps({ type: 'orbSize', index: i })}
                  style={{ pointerEvents: 'auto', cursor: 'ew-resize' }}
                />
              </>
            )}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={hs}
              fill={g.color}
              stroke={selected ? 'var(--accent)' : 'white'}
              strokeWidth={selected ? 2.5 : 1.5}
              vectorEffect="non-scaling-stroke"
              {...handleProps({ type: 'orb', index: i })}
            />
          </g>
        );
      })}

      {badge}
    </svg>
  );
}
