import { useRef } from 'react';
import { useStore } from '../store';
import { useEditorUi } from '../editorUi';
import { BASE_DIMS } from '../render/ratio';
import { gradientEndpoints } from '../render/gradients';
import type { BackgroundDoc } from '../types';

type GradientBg = Extract<BackgroundDoc, { type: 'gradient' }>;

type Drag =
  | { type: 'orb'; index: number }
  | { type: 'orbSize'; index: number }
  | { type: 'angleEnd' }
  | { type: 'angleStart' }
  | { type: 'stop'; index: number };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Pulls `p` toward `anchor` until it sits inside `rect` (anchor assumed inside). */
function pullIntoRect(p: { x: number; y: number }, anchor: { x: number; y: number }, rect: Rect) {
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

/**
 * Direct-manipulation overlay for gradient backgrounds: drag orbs to place them,
 * drag the line ends to rotate the gradient, drag stop dots to reposition stops.
 * Rendered in the same coordinate space as the canvas via the SVG viewBox.
 */
export function CanvasGizmos() {
  const doc = useStore((s) => s.doc)!;
  const up = useStore((s) => s.updateDoc);
  const selectedOrb = useEditorUi((s) => s.selectedOrb);
  const setSelectedOrb = useEditorUi((s) => s.setSelectedOrb);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);

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

  const startDrag = (drag: Drag) => (e: React.PointerEvent<SVGElement>) => {
    e.stopPropagation();
    try {
      (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
    } catch {
      // stale/synthetic pointer id — dragging still works while the pointer stays over the svg
    }
    dragRef.current = drag;
    if (drag.type === 'orb' || drag.type === 'orbSize') setSelectedOrb(drag.index);
  };

  const endDrag = () => {
    dragRef.current = null;
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
    } else if (drag.type === 'angleEnd' || drag.type === 'angleStart') {
      const dx = p.x - W / 2;
      const dy = p.y - H / 2;
      let ang = Math.round((Math.atan2(dx, -dy) * 180) / Math.PI);
      if (drag.type === 'angleStart') ang += 180;
      patchBg({ angle: ((ang % 360) + 360) % 360 });
    } else if (drag.type === 'stop') {
      const { x0, y0, x1, y1 } = gradientEndpoints(bg.angle, W, H);
      const vx = x1 - x0;
      const vy = y1 - y0;
      const t = clamp(((p.x - x0) * vx + (p.y - y0) * vy) / (vx * vx + vy * vy), 0, 1);
      patchBg({
        stops: bg.stops.map((s, i) => (i === drag.index ? { ...s, pos: Math.round(t * 100) / 100 } : s)),
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

  const line = kind === 'linear' ? gradientEndpoints(bg.angle, W, H) : null;
  // Angular/diamond still honor the angle — give them a single rotation handle.
  const rotHandle =
    kind === 'angular' || kind === 'diamond'
      ? (() => {
          const rad = (bg.angle * Math.PI) / 180;
          const R = Math.min(W, H) * 0.35;
          return { x: W / 2 + Math.sin(rad) * R, y: H / 2 - Math.cos(rad) * R };
        })()
      : null;

  // Handles pulled back inside the bleed so they never get cropped out of reach.
  const startHandle = line ? pullIntoRect({ x: line.x0, y: line.y0 }, center, safe) : null;
  const endHandle = line ? pullIntoRect({ x: line.x1, y: line.y1 }, center, safe) : null;
  const stopRange = line ? visibleRange(line.x0, line.y0, line.x1 - line.x0, line.y1 - line.y0, safe) : null;

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
      {line && startHandle && endHandle && stopRange && (
        <>
          <line
            x1={startHandle.x}
            y1={startHandle.y}
            x2={endHandle.x}
            y2={endHandle.y}
            stroke="white"
            strokeOpacity={0.65}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          {bg.stops.map((s, i) => {
            const t = clamp(clamp(s.pos, 0, 1), stopRange.lo, stopRange.hi);
            return (
              <circle
                key={i}
                cx={line.x0 + (line.x1 - line.x0) * t}
                cy={line.y0 + (line.y1 - line.y0) * t}
                r={hs * 0.8}
                fill={s.color}
                stroke="white"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
                {...handleProps({ type: 'stop', index: i })}
              />
            );
          })}
          <rect
            x={startHandle.x - hs * 0.7}
            y={startHandle.y - hs * 0.7}
            width={hs * 1.4}
            height={hs * 1.4}
            fill="white"
            stroke="rgba(0,0,0,0.45)"
            vectorEffect="non-scaling-stroke"
            {...handleProps({ type: 'angleStart' })}
          />
          <rect
            x={endHandle.x - hs * 0.7}
            y={endHandle.y - hs * 0.7}
            width={hs * 1.4}
            height={hs * 1.4}
            fill="white"
            stroke="rgba(0,0,0,0.45)"
            vectorEffect="non-scaling-stroke"
            {...handleProps({ type: 'angleEnd' })}
          />
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
    </svg>
  );
}
