import type { ProjectDoc } from '../types';
import { getCached, makeWorkingBitmap } from '../assets';
import { pickBitrate, type FromWorker, type StartMessage } from './messages';

export class ExportCancelled extends Error {
  constructor() {
    super('Export cancelled');
    this.name = 'ExportCancelled';
  }
}

export interface ExportOptions {
  width: number;
  height: number;
  fps: number;
}

export interface ExportHandle {
  promise: Promise<Blob>;
  cancel: () => void;
}

export function webCodecsSupported(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
}

export function startExport(
  doc: ProjectDoc,
  opts: ExportOptions,
  onProgress: (done: number, total: number) => void,
): ExportHandle {
  const worker = new Worker(new URL('./exportWorker.ts', import.meta.url), { type: 'module' });
  let cancelRequested = false;

  const promise = (async () => {
    // fresh bitmaps for the worker — the preview keeps its own cached copies
    const uniqueIds = [...new Set(doc.items.map((i) => i.assetId))];
    const bitmaps: ImageBitmap[] = [];
    for (const id of uniqueIds) {
      const cached = getCached(id);
      if (!cached) throw new Error('An image is missing from the local cache. Reload and try again.');
      bitmaps.push(await makeWorkingBitmap(cached.blob));
    }

    const msg: StartMessage = {
      type: 'start',
      doc,
      assetIds: uniqueIds,
      bitmaps,
      width: opts.width,
      height: opts.height,
      fps: opts.fps,
      bitrate: pickBitrate(opts.width, opts.height, opts.fps),
    };
    worker.postMessage(msg, bitmaps);

    return await new Promise<Blob>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<FromWorker>) => {
        const data = e.data;
        if (data.type === 'progress') onProgress(data.done, data.total);
        else if (data.type === 'done') resolve(new Blob([data.buffer], { type: 'video/mp4' }));
        else if (data.type === 'cancelled') reject(new ExportCancelled());
        else if (data.type === 'error') reject(new Error(data.message));
      };
      worker.onerror = (e) => reject(new Error(e.message || 'Export worker crashed'));
      if (cancelRequested) worker.postMessage({ type: 'cancel' });
    });
  })().finally(() => worker.terminate());

  return {
    promise,
    cancel: () => {
      cancelRequested = true;
      worker.postMessage({ type: 'cancel' });
    },
  };
}
