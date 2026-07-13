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

function rgbToHex(c: { r: number; g: number; b: number }): string {
  const toHex = (v: number) => clamp(Math.round(v)).toString(16).padStart(2, '0');
  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
}

export interface ApparelColors {
  primary: string;
  secondary: string;
  trim: string;
  shirt: string;
  tie: string;
  pants: string;
  shoes?: string;
}

/**
 * Collapses an outfit's colors into shades of a single hue derived from
 * `primary`, the way high-contrast/monochrome popular skins read as one
 * cohesive silhouette. The single chroma "accent" is left to the eye
 * color, which this resolver never touches.
 */
export function resolveMonoAccentPalette(colors: ApparelColors): ApparelColors {
  const base = hexToRgb(colors.primary);
  const shade = (offset: number) => rgbToHex(applyHueShift(base.r, base.g, base.b, offset, false));

  return {
    ...colors,
    secondary: shade(-22),
    trim: shade(38),
    shirt: shade(-30),
    tie: shade(-40),
    pants: shade(-15),
    shoes: colors.shoes ? shade(-45) : colors.shoes,
  };
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

export function quantizeShade(offset: number, x: number, y: number, bandSize: number = 8, dither: boolean = true): number {
  const band = offset / bandSize;
  const flooredBand = Math.floor(band);
  const frac = band - flooredBand;
  const threshold = dither ? bayerThreshold(x, y) : 0.5;
  const steppedBand = frac > threshold ? flooredBand + 1 : flooredBand;
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
  | 'grunge'
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
  'grunge',
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
    case 'grunge': {
      // Irregular mottled/splotchy noise (worn fabric), not a repeating
      // tile: a handful of dark blotches over an otherwise flat field.
      const n = valueNoise2(x, y, 3, seed);
      return n > 0.62 ? -12 : n < 0.28 ? 5 : 0;
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
  /**
   * 'soft' (default) is the dithered multi-band ramp. 'graphic' collapses
   * non-skin materials to a hard two-tone lit/shadow split with no dither,
   * matching the cel-shaded look of high-contrast monochrome skins.
   */
  mode?: 'soft' | 'graphic';
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

  const mode = opts.mode ?? 'soft';

  let form: number;
  let pattern_: number;
  if (!isSkin && mode === 'graphic') {
    // Hard two-tone cel shading: one flat lit mass, one flat shadow mass,
    // no dither. The light-direction gradient still decides which side
    // falls in shadow, it's just binarized instead of banded.
    form = vertical + horizontal < 0 ? -14 : 0;
    pattern_ = pattern === 'grunge' ? patternOffset(pattern, x, y, seed) : 0;
  } else if (isSkin) {
    // Clean 3-tone ramp (base / core-shadow / highlight) so faces and bare
    // limbs read as deliberate flat shapes instead of noisy dithered mush.
    const raw = quantizeShade(vertical + horizontal, x, y, 5, false);
    form = Math.max(-5, Math.min(5, raw));
    pattern_ = 0;
  } else {
    // Cloth keeps its dithered texture, but widened bands + a softened
    // pattern contribution let the 3-band form shading dominate the read.
    form = quantizeShade(vertical + horizontal, x, y, 8);
    pattern_ = patternOffset(pattern, x, y, seed) * 0.75;
  }

  const aoEdges = opts.aoEdges ?? !isSkin;
  let ao = 0;
  if (aoEdges) {
    if (y === y2) ao -= isSkin ? 4 : 8;
    else if (y === y2 - 1 && !isSkin) ao -= 4;
    if (!isSkin && (x === x1 || x === x2)) ao -= 5;
    if (!isSkin && y === y1) ao -= 4;
  }

  const total = Math.round(form + ao + pattern_);

  return applyHueShift(r, g, b, total, isSkin);
}

/**
 * Selective contour/outline pass: darkens pixels that sit "underneath" a
 * higher-precedence material at a silhouette boundary (e.g. skin under a
 * hairline, garment against bare skin at a cuff), so shapes read as
 * deliberately illustrated instead of flat rectangles touching. Consults
 * only the material map, never shaded RGB, so cloth texture/dithering is
 * never mistaken for a boundary.
 */

// Highest precedence first: the material earlier in this list is treated as
// "on top" at a boundary, and the other side gets darkened.
const CONTOUR_PRECEDENCE: MaterialId[] = [
  'accessory',
  'hair',
  'eye',
  'garment-trim',
  'garment-secondary',
  'garment-tie',
  'garment-primary',
  'garment-shirt',
  'shoes',
  'pants',
  'skin',
];

function contourRank(m: MaterialId): number {
  const i = CONTOUR_PRECEDENCE.indexOf(m);
  return i === -1 ? CONTOUR_PRECEDENCE.length : i;
}

export function applyContourPass(
  rgba: Uint8Array,
  materialMap: Uint8Array,
  faceRects: ShadeBounds[]
): void {
  const materialAt = (x: number, y: number): MaterialId => MATERIAL_BY_INDEX[materialMap[y * 64 + x]] ?? 'none';

  for (const rect of faceRects) {
    for (let y = rect.y1; y <= rect.y2; y++) {
      for (let x = rect.x1; x <= rect.x2; x++) {
        const idx = (y * 64 + x) * 4;
        if (rgba[idx + 3] === 0) continue;
        const myMat = materialAt(x, y);
        if (myMat === 'none' || myMat === 'eye') continue;
        const myRank = contourRank(myMat);

        // Only look above/left/right — the shader's own bottom-edge AO
        // already darkens the underside of shapes, so skip "below" to
        // avoid double-darkening the same seam.
        const neighbors: [number, number][] = [
          [x, y - 1],
          [x - 1, y],
          [x + 1, y],
        ];

        let shouldDarken = false;
        for (const [nx, ny] of neighbors) {
          if (nx < rect.x1 || nx > rect.x2 || ny < rect.y1 || ny > rect.y2) continue;
          const nMat = materialAt(nx, ny);
          if (nMat === 'none' || nMat === myMat || nMat === 'eye') continue;
          if (contourRank(nMat) < myRank) shouldDarken = true;
        }

        if (shouldDarken) {
          const isHairline = myMat === 'skin';
          const strength = isHairline ? 22 : 18;
          const shaded = applyHueShift(rgba[idx], rgba[idx + 1], rgba[idx + 2], -strength, myMat === 'skin');
          rgba[idx] = shaded.r;
          rgba[idx + 1] = shaded.g;
          rgba[idx + 2] = shaded.b;
        }
      }
    }
  }
}

// The 64x64 skin base-layer UV faces, treated as independent islands so the
// contour pass never compares pixels that aren't actually adjacent in 3D.
export const BASE_FACE_RECTS: ShadeBounds[] = [
  // Head
  { x1: 8, y1: 8, x2: 15, y2: 15 },
  { x1: 0, y1: 8, x2: 7, y2: 15 },
  { x1: 16, y1: 8, x2: 23, y2: 15 },
  { x1: 24, y1: 8, x2: 31, y2: 15 },
  { x1: 8, y1: 0, x2: 15, y2: 7 },
  { x1: 16, y1: 0, x2: 23, y2: 7 },
  // Torso
  { x1: 20, y1: 20, x2: 27, y2: 31 },
  { x1: 32, y1: 20, x2: 39, y2: 31 },
  { x1: 16, y1: 20, x2: 19, y2: 31 },
  { x1: 28, y1: 20, x2: 31, y2: 31 },
  { x1: 20, y1: 16, x2: 27, y2: 19 },
  // Right arm (Steve bounds; Alex's extra column is transparent and skipped)
  { x1: 44, y1: 20, x2: 47, y2: 31 },
  { x1: 40, y1: 20, x2: 43, y2: 31 },
  { x1: 48, y1: 20, x2: 51, y2: 31 },
  { x1: 52, y1: 20, x2: 55, y2: 31 },
  { x1: 44, y1: 16, x2: 47, y2: 19 },
  // Left arm
  { x1: 36, y1: 52, x2: 39, y2: 63 },
  { x1: 32, y1: 52, x2: 35, y2: 63 },
  { x1: 40, y1: 52, x2: 43, y2: 63 },
  { x1: 44, y1: 52, x2: 47, y2: 63 },
  { x1: 36, y1: 48, x2: 39, y2: 51 },
  // Right leg
  { x1: 4, y1: 20, x2: 7, y2: 31 },
  { x1: 0, y1: 20, x2: 3, y2: 31 },
  { x1: 8, y1: 20, x2: 11, y2: 31 },
  { x1: 12, y1: 20, x2: 15, y2: 31 },
  { x1: 4, y1: 16, x2: 7, y2: 19 },
  // Left leg
  { x1: 20, y1: 52, x2: 23, y2: 63 },
  { x1: 16, y1: 52, x2: 19, y2: 63 },
  { x1: 24, y1: 52, x2: 27, y2: 63 },
  { x1: 28, y1: 52, x2: 31, y2: 63 },
  { x1: 20, y1: 48, x2: 23, y2: 51 },
];
