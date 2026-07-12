// Helper to convert HEX color to RGB object
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Helper to clamp a number between 0 and 255
export function clamp(val: number): number {
  return Math.max(0, Math.min(255, val));
}

export function applyHueShift(
  r: number,
  g: number,
  b: number,
  offset: number,
  isSkin: boolean
): { r: number; g: number; b: number } {
  if (offset === 0) return { r, g, b };

  let targetR = r;
  let targetG = g;
  let targetB = b;

  if (isSkin) {
    if (offset > 0) {
      targetR = clamp(r + offset * 1.2);
      targetG = clamp(g + offset * 1.0);
      targetB = clamp(b + offset * 0.6);
    } else {
      targetR = clamp(r + offset * 0.8);
      targetG = clamp(g + offset * 1.2);
      targetB = clamp(b + offset * 1.3);
    }
  } else {
    if (offset > 0) {
      targetR = clamp(r + offset * 1.1);
      targetG = clamp(g + offset * 1.1);
      targetB = clamp(b + offset * 0.9);
    } else {
      targetR = clamp(r + offset * 1.3);
      targetG = clamp(g + offset * 1.1);
      targetB = clamp(b + offset * 0.7);
    }
  }

  return { r: targetR, g: targetG, b: targetB };
}

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

/**
 * Material identifiers used by the contour/outline pass to know which
 * shapes are touching, independent of their final shaded RGB values.
 */
export type MaterialId =
  | 'none'
  | 'skin'
  | 'hair'
  | 'eye'
  | 'garment-primary'
  | 'garment-secondary'
  | 'garment-trim'
  | 'garment-shirt'
  | 'garment-tie'
  | 'pants'
  | 'shoes'
  | 'accessory';

export const MATERIAL_INDEX: Record<MaterialId, number> = {
  none: 0,
  skin: 1,
  hair: 2,
  eye: 3,
  'garment-primary': 4,
  'garment-secondary': 5,
  'garment-trim': 6,
  'garment-shirt': 7,
  'garment-tie': 8,
  pants: 9,
  shoes: 10,
  accessory: 11,
};

export const MATERIAL_BY_INDEX: MaterialId[] = Object.keys(MATERIAL_INDEX) as MaterialId[];

/**
 * Per-pixel volume shader: stepped-band form shading with a configurable
 * light direction, plus seam/crease ambient occlusion and cloth texture.
 */

export interface ShadeBounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ShadeOptions {
  isSkin?: boolean;
  pattern?: PatternType;
  seed?: number;
  lightDir?: 'top-left' | 'top' | 'top-right';
  aoEdges?: boolean;
}

export function applyVolumeShaderV2(
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  bounds: ShadeBounds | undefined,
  opts: ShadeOptions = {}
): { r: number; g: number; b: number } {
  const seed = opts.seed ?? 0;
  const isSkin = opts.isSkin ?? false;
  const pattern = opts.pattern ?? 'none';

  if (!bounds) {
    const offset = patternOffset(pattern, x, y, seed) * 2;
    return applyHueShift(r, g, b, Math.round(offset), isSkin);
  }

  const { x1, y1, x2, y2 } = bounds;
  const dx = x2 - x1;
  const dy = y2 - y1;

  const pctX = dx > 0 ? (x - x1) / dx : 0.5;
  const pctY = dy > 0 ? (y - y1) / dy : 0.5;

  const lightDir = opts.lightDir ?? 'top';
  let sinePhase = pctX;
  if (lightDir === 'top-left') sinePhase = pctX * 0.85;
  else if (lightDir === 'top-right') sinePhase = 0.15 + pctX * 0.85;

  const vertical = (1 - pctY) * 12 - 6;
  const horizontal = Math.sin(sinePhase * Math.PI) * 14 - 7;
  const bandSize = isSkin ? 5 : 7;
  const form = quantizeShade(vertical + horizontal, x, y, bandSize);

  const aoEdges = opts.aoEdges ?? !isSkin;
  let ao = 0;
  if (aoEdges) {
    if (y === y2) ao -= isSkin ? 4 : 8;
    else if (y === y2 - 1 && !isSkin) ao -= 4;
    if (!isSkin && (x === x1 || x === x2)) ao -= 5;
    if (!isSkin && y === y1) ao -= 4;
  }

  const pattern_ = patternOffset(pattern, x, y, seed);
  const total = Math.round(form + ao + pattern_);

  return applyHueShift(r, g, b, total, isSkin);
}
