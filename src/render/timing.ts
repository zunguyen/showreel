import type { ProjectDoc } from '../types';

export interface FrameState {
  aIndex: number;
  /** entering item index, or null when no transition is in flight */
  bIndex: number | null;
  /** raw (uneased) transition progress 0..1 */
  p: number;
  /** display progress of the current item 0..1 (drives scroll / slow zoom) */
  aProg: number;
  totalMs: number;
  displayMs: number;
}

export function totalDurationMs(doc: ProjectDoc): number {
  return Math.max(1, doc.items.length) * doc.itemDurationMs;
}

/**
 * Timing model: item i owns [i*D, (i+1)*D). It is fully displayed for D-T,
 * then transitions into item i+1 during the last T. With loop on, the final
 * item transitions back into item 0, so frame(total) === frame(0).
 */
export function getFrameState(doc: ProjectDoc, tMs: number): FrameState {
  const N = doc.items.length;
  const D = doc.itemDurationMs;
  const T = Math.min(doc.transitionMs, D * 0.9);
  const total = N * D;
  const t = ((tMs % total) + total) % total;
  const i = Math.min(N - 1, Math.floor(t / D));
  const local = t - i * D;
  const displayMs = D - T;
  const isLastWithoutLoop = i === N - 1 && !doc.loop;

  if (N === 1 || local < displayMs || isLastWithoutLoop) {
    const denom = isLastWithoutLoop ? D : displayMs;
    return {
      aIndex: i,
      bIndex: null,
      p: 0,
      aProg: Math.min(1, local / Math.max(1, denom)),
      totalMs: total,
      displayMs,
    };
  }

  return {
    aIndex: i,
    bIndex: (i + 1) % N,
    p: (local - displayMs) / T,
    aProg: 1,
    totalMs: total,
    displayMs,
  };
}
