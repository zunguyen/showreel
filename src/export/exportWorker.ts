import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { renderFrame } from '../render/renderFrame';
import { totalDurationMs } from '../render/timing';
import type { FromWorker, StartMessage, ToWorker } from './messages';

const post = self.postMessage.bind(self) as (msg: FromWorker, transfer?: Transferable[]) => void;

let cancelled = false;

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  if (msg.type === 'cancel') {
    cancelled = true;
    return;
  }
  if (msg.type === 'start') {
    run(msg).catch((err: unknown) => {
      post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    });
  }
};

const yieldToEventLoop = () => new Promise<void>((r) => setTimeout(r, 0));

async function pickCodec(width: number, height: number, fps: number, bitrate: number): Promise<string> {
  const candidates = ['avc1.640034', 'avc1.640033', 'avc1.64002a', 'avc1.640028', 'avc1.4d0028', 'avc1.42e01f'];
  for (const codec of candidates) {
    const support = await VideoEncoder.isConfigSupported({ codec, width, height, framerate: fps, bitrate });
    if (support.supported) return codec;
  }
  throw new Error('No supported H.264 encoder configuration found in this browser.');
}

async function run(m: StartMessage): Promise<void> {
  const { doc, assetIds, bitmaps, width, height, fps, bitrate } = m;
  const assets = new Map<string, ImageBitmap>(assetIds.map((id, i) => [id, bitmaps[i]]));
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create an OffscreenCanvas 2D context.');

  const totalMs = totalDurationMs(doc);
  const frames = Math.max(1, Math.round((totalMs / 1000) * fps));

  const codec = await pickCodec(width, height, fps, bitrate);
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width, height },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  let encoderError: unknown = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encoderError = e;
    },
  });
  encoder.configure({ codec, width, height, bitrate, framerate: fps });

  for (let f = 0; f < frames; f++) {
    if (cancelled) {
      encoder.close();
      for (const b of bitmaps) b.close();
      post({ type: 'cancelled' });
      return;
    }
    if (encoderError) throw encoderError;

    const tMs = (f * 1000) / fps;
    renderFrame(ctx, doc, (id) => assets.get(id), tMs, width, height);
    const frame = new VideoFrame(canvas, {
      timestamp: Math.round((f * 1_000_000) / fps),
      duration: Math.round(1_000_000 / fps),
    });
    encoder.encode(frame, { keyFrame: f % (fps * 2) === 0 });
    frame.close();

    while (encoder.encodeQueueSize > 6) await yieldToEventLoop();
    if (f % 5 === 0) {
      post({ type: 'progress', done: f, total: frames });
      await yieldToEventLoop(); // lets cancel messages arrive
    }
  }

  await encoder.flush();
  if (encoderError) throw encoderError;
  muxer.finalize();
  for (const b of bitmaps) b.close();

  const buffer = (muxer.target as ArrayBufferTarget).buffer;
  post({ type: 'progress', done: frames, total: frames });
  post({ type: 'done', buffer }, [buffer]);
}
