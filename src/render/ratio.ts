import type { Ratio } from '../types';

export interface Dims {
  w: number;
  h: number;
}

/** 1080-class base dimensions; the render core's coordinate space. */
export const BASE_DIMS: Record<Ratio, Dims> = {
  '16:9': { w: 1920, h: 1080 },
  '9:16': { w: 1080, h: 1920 },
  '1:1': { w: 1080, h: 1080 },
  '4:3': { w: 1440, h: 1080 },
  '3:4': { w: 1080, h: 1440 },
};

const DIMS_720: Record<Ratio, Dims> = {
  '16:9': { w: 1280, h: 720 },
  '9:16': { w: 720, h: 1280 },
  '1:1': { w: 720, h: 720 },
  '4:3': { w: 960, h: 720 },
  '3:4': { w: 720, h: 960 },
};

export type ResClass = 720 | 1080;

export function exportDims(ratio: Ratio, res: ResClass): Dims {
  return res === 720 ? DIMS_720[ratio] : BASE_DIMS[ratio];
}
