/**
 * Deterministic hash and value-noise primitives used to break up repetitive
 * procedural shading/texture patterns without relying on Math.random().
 */

export function hash2(x: number, y: number, seed: number): number {
  let h = x * 374761393 + y * 668265263 + seed * 1274126177;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 4294967296;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export function valueNoise2(x: number, y: number, scale: number, seed: number): number {
  const sx = x / scale;
  const sy = y / scale;
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = x0 + 1;
  const y1 = y0 + 1;

  const fx = smoothstep(sx - x0);
  const fy = smoothstep(sy - y0);

  const v00 = hash2(x0, y0, seed);
  const v10 = hash2(x1, y0, seed);
  const v01 = hash2(x0, y1, seed);
  const v11 = hash2(x1, y1, seed);

  const top = v00 + (v10 - v00) * fx;
  const bottom = v01 + (v11 - v01) * fx;
  return top + (bottom - top) * fy;
}

/**
 * Ordered (Bayer) dithering and stepped-band quantization, so shading reads
 * as deliberate pixel-art value bands instead of a smooth gradient.
 */

export const BAYER_4X4: number[][] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export function bayerThreshold(x: number, y: number): number {
  const row = ((y % 4) + 4) % 4;
  const col = ((x % 4) + 4) % 4;
  return (BAYER_4X4[row][col] + 0.5) / 16;
}

export function quantizeShade(offset: number, x: number, y: number, bandSize: number = 8): number {
  const band = offset / bandSize;
  const flooredBand = Math.floor(band);
  const frac = band - flooredBand;
  const steppedBand = frac > bayerThreshold(x, y) ? flooredBand + 1 : flooredBand;
  return steppedBand * bandSize;
}

/**
 * Cloth/material pattern offsets. Each pattern combines a structural element
 * with value noise so nothing tiles perfectly flat, unlike a raw modulo checker.
 */

export type PatternType =
  | 'knit'
  | 'tweed'
  | 'pinstripe'
  | 'denim'
  | 'flannel'
  | 'plaid'
  | 'corduroy'
  | 'ribbed'
  | 'leather'
  | 'none';

export const PATTERN_KEYS: PatternType[] = [
  'knit',
  'tweed',
  'pinstripe',
  'denim',
  'flannel',
  'plaid',
  'corduroy',
  'ribbed',
  'leather',
  'none',
];

export function patternOffset(pattern: PatternType, x: number, y: number, seed: number): number {
  switch (pattern) {
    case 'knit': {
      const noise = valueNoise2(x, y, 4, seed);
      const checker = (x + y) % 2 === 0 ? 3 : -3;
      return checker * (0.5 + noise) + (noise - 0.5) * 6;
    }
    case 'tweed': {
      const base = valueNoise2(x, y, 2, seed) * 14 - 7;
      const fleck = hash2(x, y, seed + 1) > 0.92 ? 8 : 0;
      return base + fleck;
    }
    case 'pinstripe': {
      const stripe = x % 4 === 0 ? 6 : 0;
      const jitter = hash2(0, y, seed) * 2;
      const grain = (valueNoise2(x, y, 5, seed) - 0.5) * 4;
      return stripe + jitter + grain;
    }
    case 'denim': {
      const twill = (x + y) % 3 === 0 ? -4 : 2;
      const wear = (valueNoise2(x, y, 3, seed) - 0.5) * 8;
      return twill + wear;
    }
    case 'flannel': {
      const a = x % 5 < 2 ? -5 : 0;
      const b = y % 5 < 2 ? -5 : 0;
      const noise = (valueNoise2(x, y, 4, seed) - 0.5) * 6;
      return a + b + noise;
    }
    case 'plaid': {
      const a = x % 6 < 2 ? -6 : 0;
      const b = y % 6 < 2 ? -6 : 0;
      const noise = (valueNoise2(x, y, 4, seed) - 0.5) * 6;
      return a + b + noise;
    }
    case 'corduroy': {
      const rib = x % 2 === 0 ? 4 : -4;
      return rib * (0.7 + valueNoise2(x, y, 6, seed) * 0.6);
    }
    case 'ribbed': {
      const rib = y % 2 === 0 ? 4 : -4;
      return rib * (0.7 + valueNoise2(x, y, 6, seed) * 0.6);
    }
    case 'leather': {
      const base = valueNoise2(x, y, 3, seed) * 10 - 5;
      const sheen = hash2(x, y, seed + 2) > 0.95 ? 10 : 0;
      return base + sheen;
    }
    case 'none':
    default: {
      return (valueNoise2(x, y, 4, seed) - 0.5) * 4;
    }
  }
}
