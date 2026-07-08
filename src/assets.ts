/**
 * In-memory asset cache: decoded working-copy bitmaps + object URLs for thumbs.
 * Kept outside the zustand store because bitmaps are large mutable handles;
 * the store bumps `assetsVersion` to signal React when the cache changes.
 */
export interface CachedAsset {
  bitmap: ImageBitmap;
  url: string;
  blob: Blob;
}

const cache = new Map<string, CachedAsset>();

export const WORKING_MAX_WIDTH = 2400;

/** Decode a blob, downscaling to cap memory while staying above export needs. */
export async function makeWorkingBitmap(blob: Blob, maxWidth = WORKING_MAX_WIDTH): Promise<ImageBitmap> {
  const probe = await createImageBitmap(blob);
  if (probe.width <= maxWidth) return probe;
  probe.close();
  return createImageBitmap(blob, { resizeWidth: maxWidth, resizeQuality: 'high' });
}

export async function loadIntoCache(assetId: string, blob: Blob): Promise<CachedAsset> {
  const existing = cache.get(assetId);
  if (existing) return existing;
  const bitmap = await makeWorkingBitmap(blob);
  const entry: CachedAsset = { bitmap, url: URL.createObjectURL(blob), blob };
  cache.set(assetId, entry);
  return entry;
}

export function getCached(assetId: string): CachedAsset | undefined {
  return cache.get(assetId);
}

export function getBitmap(assetId: string): ImageBitmap | undefined {
  return cache.get(assetId)?.bitmap;
}

export function evictAsset(assetId: string): void {
  const entry = cache.get(assetId);
  if (!entry) return;
  entry.bitmap.close();
  URL.revokeObjectURL(entry.url);
  cache.delete(assetId);
}

export function clearAssetCache(): void {
  for (const id of [...cache.keys()]) evictAsset(id);
}
