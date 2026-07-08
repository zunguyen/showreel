import type { ProjectDoc } from '../types';

export interface StartMessage {
  type: 'start';
  doc: ProjectDoc;
  assetIds: string[];
  bitmaps: ImageBitmap[];
  width: number;
  height: number;
  fps: number;
  bitrate: number;
}

export interface CancelMessage {
  type: 'cancel';
}

export type ToWorker = StartMessage | CancelMessage;

export type FromWorker =
  | { type: 'progress'; done: number; total: number }
  | { type: 'done'; buffer: ArrayBuffer }
  | { type: 'cancelled' }
  | { type: 'error'; message: string };

export function pickBitrate(width: number, height: number, fps: number): number {
  // ~0.1 bit/pixel/frame ≈ 6.2 Mbps at 1080p30 — good quality for UI content
  return Math.min(20_000_000, Math.round(width * height * fps * 0.1));
}
