/**
 * Deterministic film-grain tile, shared by preview and export.
 * No DOM dependencies — safe in the export worker; both JS contexts
 * build byte-identical tiles from the same fixed seed.
 */

const TILE_SIZE = 160;
const SEED = 0x5eed1e;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let tile: OffscreenCanvas | null = null;

/** Gray-centered noise (128 ± 60) so 'overlay' compositing stays brightness-neutral. */
export function getNoiseTile(): OffscreenCanvas {
  if (tile) return tile;
  const rand = mulberry32(SEED);
  const canvas = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(TILE_SIZE, TILE_SIZE);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = 128 + Math.round((rand() - 0.5) * 120);
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  tile = canvas;
  return tile;
}
