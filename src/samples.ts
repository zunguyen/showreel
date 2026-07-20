import espressoUrl from './assets/Espresso Maker and Mug.png';
import shoeUrl from './assets/Tying Athletic Shoe.png';
import portraitUrl from './assets/Confident Blue Portrait.png';
import oysterUrl from './assets/Iridescent Oyster Shell.png';
import particleUrl from './assets/Ethereal Particle Flow.png';

interface SampleSource {
  url: string;
  name: string;
}

/** The bundled photo sequence used by both first-run preview and “Try sample screens”. */
const SAMPLE_SOURCES: readonly SampleSource[] = [
  { url: espressoUrl, name: 'Espresso Maker and Mug.png' },
  { url: shoeUrl, name: 'Tying Athletic Shoe.png' },
  { url: portraitUrl, name: 'Confident Blue Portrait.png' },
  { url: oysterUrl, name: 'Iridescent Oyster Shell.png' },
  { url: particleUrl, name: 'Ethereal Particle Flow.png' },
];

export const BUNDLED_SAMPLE_NAMES = SAMPLE_SOURCES.map((source) => source.name);

export interface BundledSampleAsset {
  name: string;
  blob: Blob;
  width: number;
  height: number;
}

async function loadSampleBlob(source: SampleSource): Promise<Blob> {
  const response = await fetch(source.url);
  if (!response.ok) throw new Error(`Could not load sample image: ${source.name}`);
  return response.blob();
}

export async function generateSampleFiles(): Promise<File[]> {
  const assets = await loadBundledSampleAssets();
  return assets.map(
    ({ blob, name }) => new File([blob], name, { type: blob.type || 'image/png' }),
  );
}

/** Loads the current bundled files and reads dimensions from the image data itself. */
export async function loadBundledSampleAssets(): Promise<BundledSampleAsset[]> {
  return Promise.all(
    SAMPLE_SOURCES.map(async (source) => {
      const blob = await loadSampleBlob(source);
      const bitmap = await createImageBitmap(blob);
      const asset = { name: source.name, blob, width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return asset;
    }),
  );
}

/** Decoded, down-sized versions used by the read-only first-run preview. */
export async function generateSamplePreviewBitmaps(limit = 3): Promise<ImageBitmap[]> {
  return Promise.all(
    SAMPLE_SOURCES.slice(0, limit).map(async (source) => {
      const blob = await loadSampleBlob(source);
      const probe = await createImageBitmap(blob);
      if (probe.width <= 960) return probe;

      const resizeWidth = 960;
      const resizeHeight = Math.round((probe.height / probe.width) * resizeWidth);
      probe.close();
      return createImageBitmap(blob, {
        resizeWidth,
        resizeHeight,
        resizeQuality: 'high',
      });
    }),
  );
}
