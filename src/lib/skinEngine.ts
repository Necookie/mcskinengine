import { DEMOGRAPHICS, STENCILS, Stencil, STUDENT_HOODIE_STENCIL } from "./stencils";
import {
  hexToRgb,
  clamp,
  applyHueShift,
  applyVolumeShaderV2,
  hash2,
  PatternType,
  PATTERN_KEYS,
  ShadeBounds,
  ShadeOptions,
  MaterialId,
  MATERIAL_INDEX,
  applyContourPass,
  BASE_FACE_RECTS,
  resolvePaletteByScheme,
  ColorScheme,
  ensureValueContrast,
} from "./shading";
import { HAIR_BASE, HAIR_STYLES } from "./hairStyles";
import { EYE_STYLES } from "./eyeStyles";

export { hexToRgb, clamp, applyHueShift };

/** @deprecated use applyVolumeShaderV2 from ./shading */
export function applyVolumeShader(
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  bounds?: ShadeBounds,
  isSkin: boolean = false,
  pattern: PatternType = 'none'
): { r: number; g: number; b: number } {
  return applyVolumeShaderV2(x, y, r, g, b, bounds, { isSkin, pattern });
}

/**
 * Creates a blank 64×64 Minecraft skin as a flat 1D RGBA Uint8Array (16,384 elements).
 * Every pixel is opaque white — suitable as a default mannequin base.
 */
export function createBlankSkinArray(): Uint8Array {
  const arr = new Uint8Array(64 * 64 * 4);
  for (let i = 0; i < arr.length; i += 4) {
    arr[i]     = 255; // R
    arr[i + 1] = 255; // G
    arr[i + 2] = 255; // B
    arr[i + 3] = 255; // A
  }
  return arr;
}

/**
 * Procedurally generates a 64×64 Minecraft skin as a flat 1D RGBA array (16,384 elements).
 */
export function generateSkinArray(
  demographicKey: string,
  stencilKey: string,
  apparelColors: {
    primary: string;
    secondary: string;
    trim: string;
    shirt: string;
    tie: string;
    pants: string;
    shoes?: string;
  },
  isAlex: boolean,
  accessories: string[] = [],
  traits?: {
    skinColor?: string;
    hairColor?: string;
    eyeColor?: string;
    hairStyle?: string;
    eyeStyle?: string;
    detailTexture?: string;
    styleVibe?: 'masculine' | 'feminine' | 'neutral';
    shadingMode?: 'soft' | 'graphic';
    paletteMode?: 'full' | ColorScheme;
  },
  seed?: number
): Uint8Array {
  // Initialize with transparent pixels
  const array = new Uint8Array(64 * 64 * 4);
  // Tracks which "material" occupies each pixel, independent of its shaded
  // RGB value, so a later contour pass can tell shapes apart reliably.
  const materialMap = new Uint8Array(64 * 64);

  const demo = DEMOGRAPHICS[demographicKey] || DEMOGRAPHICS["East Asian"];
  const skinRgb = hexToRgb(traits?.skinColor || demo.skinColor);
  let hairRgb = hexToRgb(traits?.hairColor || demo.hairColor);
  const eyeRgb = hexToRgb(traits?.eyeColor || demo.eyeColor);
  const styleVibe = traits?.styleVibe || "neutral";
  const vibeHairDefault = styleVibe === 'feminine' ? "long-straight" : styleVibe === 'masculine' ? "short-spiky" : "messy-fringe";
  const vibeEyeDefault = styleVibe === 'feminine' ? "long-lashes" : styleVibe === 'masculine' ? "narrow-serious" : "cool-highlight";
  const hairStyle = traits?.hairStyle || vibeHairDefault;
  const eyeStyle = traits?.eyeStyle || vibeEyeDefault;
  const detailTexture = traits?.detailTexture || "none";
  const shadingMode = traits?.shadingMode || "soft";
  const paletteMode = traits?.paletteMode || "full";

  if (paletteMode !== "full") {
    apparelColors = resolvePaletteByScheme(apparelColors, paletteMode);
  }

  // The AI often picks hairColor equal (or nearly equal) to the outfit
  // primary; when both hue and lightness coincide the head melts into the
  // torso as one slab. Push the hair's lightness apart so it reads as its
  // own shape against the garment.
  hairRgb = ensureValueContrast(hexToRgb(apparelColors.primary), hairRgb);

  const seedBase = `${stencilKey}|${hairStyle}|${apparelColors.primary}`;
  const resolvedSeed =
    seed ??
    Math.floor(hash2(seedBase.length, seedBase.charCodeAt(0) + seedBase.length, 7) * 65536);

  // Helper to set a pixel color with chiaroscuro shading
  const setPixel = (x: number, y: number, r: number, g: number, b: number, a: number = 255, bounds?: ShadeBounds, isSkin: boolean = false, pattern: PatternType = 'none', applyShade: boolean = true, lightDir: ShadeOptions['lightDir'] = 'top', material: MaterialId = 'none') => {
    if (x < 0 || x >= 64 || y < 0 || y >= 64) return;
    const idx = (y * 64 + x) * 4;
    if (applyShade && a > 0) {
      const shaded = applyVolumeShaderV2(x, y, r, g, b, bounds, { isSkin, pattern, seed: resolvedSeed, lightDir, mode: shadingMode });
      array[idx] = shaded.r;
      array[idx + 1] = shaded.g;
      array[idx + 2] = shaded.b;
      array[idx + 3] = a;
    } else {
      array[idx] = r;
      array[idx + 1] = g;
      array[idx + 2] = b;
      array[idx + 3] = a;
    }
    if (a > 0 && material !== 'none') {
      materialMap[y * 64 + x] = MATERIAL_INDEX[material];
    }
  };

  // Helper to fill a rectangle
  const fillRect = (x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, a: number = 255, isSkin: boolean = false, pattern: PatternType = 'none', lightDir: ShadeOptions['lightDir'] = 'top', material: MaterialId = 'none') => {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        setPixel(x, y, r, g, b, a, { x1, y1, x2, y2 }, isSkin, pattern, true, lightDir, material);
      }
    }
  };

  // Head Base: x in [0, 31], y in [0, 15]
  fillRect(0, 0, 31, 15, skinRgb.r, skinRgb.g, skinRgb.b, 255, true, 'none', 'top', 'skin');

  // Every reference skin renders hair as vertical multi-tone STRANDS, not
  // a flat fill: adjacent 1px columns alternate between 3-4 shades of the
  // hair color, running continuously down the head so they read as
  // individual locks. Keyed on x alone (not y) so a strand stays one shade
  // across stacked rects, and deterministic from the seed.
  const hairStreak = (x: number): number => {
    const n = hash2(x, 0, resolvedSeed + 11);
    return n < 0.28 ? -16 : n < 0.52 ? 0 : n < 0.78 ? -7 : 12;
  };
  const fillHairRect = (x1: number, y1: number, x2: number, y2: number, baseShade: number = 0) => {
    for (let x = x1; x <= x2; x++) {
      const c = applyHueShift(hairRgb.r, hairRgb.g, hairRgb.b, baseShade + hairStreak(x), false);
      for (let y = y1; y <= y2; y++) {
        setPixel(x, y, c.r, c.g, c.b, 255, { x1, y1, x2, y2 }, false, 'none', true, 'top', 'hair');
      }
    }
  };

  // Hair - Draw base helmet, then the chosen style's overlay rects
  for (const rect of HAIR_BASE) {
    fillHairRect(rect.x1, rect.y1, rect.x2, rect.y2);
  }

  const resolvedHairStyle = HAIR_STYLES[hairStyle] || HAIR_STYLES["messy-fringe"];
  for (const rect of resolvedHairStyle.rects) {
    fillHairRect(rect.x1, rect.y1, rect.x2, rect.y2, rect.shade ?? 0);
  }

  // Hat-layer hair strands (poke over the forehead/sides for extra depth).
  // Skipped when the outfit already claims the head overlay UV (e.g. a hood).
  const stencilForHat: Stencil = STENCILS[stencilKey] || STUDENT_HOODIE_STENCIL;
  const stencilUsesHatLayer = stencilForHat.regions.some((r) => r.x1 >= 32 && r.y2 <= 15);
  if (!stencilUsesHatLayer && resolvedHairStyle.hatRects) {
    for (const rect of resolvedHairStyle.hatRects) {
      fillHairRect(rect.x1, rect.y1, rect.x2, rect.y2, rect.shade ?? 0);
    }
  }

  // Hair shine band around y = 10; drawn per-column so the streaks stay
  // visible through the highlight instead of being flattened by it.
  fillHairRect(9, 10, 14, 10, 18);
  fillHairRect(1, 10, 6, 10, 18);
  fillHairRect(17, 10, 22, 10, 18);
  fillHairRect(25, 10, 30, 10, 18);

  // Eyes on Head Front: (8, 8) to (15, 15)
  const resolvedEyeStyle = EYE_STYLES[eyeStyle] || EYE_STYLES["cool-highlight"];
  resolvedEyeStyle.draw({
    setPixel: (x, y, r, g, b, a = 255, applyShade = true) => setPixel(x, y, r, g, b, a, undefined, false, 'none', applyShade, 'top', 'eye'),
    // Eyes are tiny (2-3px) stylized shapes, not lit surfaces: routing them
    // through the engine's fillRect would apply the cloth dither/volume
    // shader (isSkin=false) and speckle the iris with noise. Only actual
    // skin fills (under-eye shadow) get the clean skin shading ramp.
    fillRect: (x1, y1, x2, y2, r, g, b, a = 255, isSkin = false) => {
      for (let yy = y1; yy <= y2; yy++) {
        for (let xx = x1; xx <= x2; xx++) {
          setPixel(xx, yy, r, g, b, a, undefined, isSkin, 'none', isSkin, 'top', isSkin ? 'skin' : 'eye');
        }
      }
    },
    eyeRgb,
    skinRgb,
  });

  // Nose/Mouth details (optional, subtle skin color differences or shadow)
  setPixel(11, 13, clamp(skinRgb.r - 10), clamp(skinRgb.g - 15), clamp(skinRgb.b - 15), 255, undefined, false, 'none', true, 'top', 'skin');
  setPixel(12, 13, clamp(skinRgb.r - 10), clamp(skinRgb.g - 15), clamp(skinRgb.b - 15), 255, undefined, false, 'none', true, 'top', 'skin');

  if (accessories && Array.isArray(accessories)) {
    const darkColor = { r: 35, g: 30, b: 30 }; // dark charcoal
    
    if (accessories.includes("glasses")) {
      // Bridge between eyes: (12, 12)
      setPixel(12, 12, darkColor.r, darkColor.g, darkColor.b, 255, undefined, false, 'none', true, 'top', 'accessory');

      // Left frame box: border of (9, 11) to (12, 13)
      fillRect(9, 11, 12, 11, darkColor.r, darkColor.g, darkColor.b, 255, false, 'none', 'top', 'accessory');
      fillRect(9, 13, 12, 13, darkColor.r, darkColor.g, darkColor.b, 255, false, 'none', 'top', 'accessory');
      setPixel(9, 12, darkColor.r, darkColor.g, darkColor.b, 255, undefined, false, 'none', true, 'top', 'accessory');
      setPixel(12, 12, darkColor.r, darkColor.g, darkColor.b, 255, undefined, false, 'none', true, 'top', 'accessory');

      // Right frame box: border of (13, 11) to (16, 13)
      fillRect(13, 11, 16, 11, darkColor.r, darkColor.g, darkColor.b, 255, false, 'none', 'top', 'accessory');
      fillRect(13, 13, 16, 13, darkColor.r, darkColor.g, darkColor.b, 255, false, 'none', 'top', 'accessory');
      setPixel(13, 12, darkColor.r, darkColor.g, darkColor.b, 255, undefined, false, 'none', true, 'top', 'accessory');
      setPixel(16, 12, darkColor.r, darkColor.g, darkColor.b, 255, undefined, false, 'none', true, 'top', 'accessory');

      // Temples:
      fillRect(3, 12, 7, 12, darkColor.r, darkColor.g, darkColor.b, 255, false, 'none', 'top', 'accessory');
      fillRect(16, 12, 20, 12, darkColor.r, darkColor.g, darkColor.b, 255, false, 'none', 'top', 'accessory');
    }

    if (accessories.includes("headphones")) {
      const hpColor = hexToRgb(apparelColors.secondary || "#ff0000");
      // Band over head top (Front top rim: 8,0 to 15,0)
      fillRect(8, 0, 15, 0, hpColor.r, hpColor.g, hpColor.b, 255, false, 'none', 'top', 'accessory');
      // Sides down (4, 9 to 4, 11 on right, 19, 9 to 19, 11 on left)
      fillRect(4, 9, 4, 11, hpColor.r, hpColor.g, hpColor.b, 255, false, 'none', 'top', 'accessory');
      fillRect(19, 9, 19, 11, hpColor.r, hpColor.g, hpColor.b, 255, false, 'none', 'top', 'accessory');
      // Ear cups
      fillRect(3, 10, 5, 12, hpColor.r, hpColor.g, hpColor.b, 255, false, 'none', 'top', 'accessory');
      fillRect(18, 10, 20, 12, hpColor.r, hpColor.g, hpColor.b, 255, false, 'none', 'top', 'accessory');
    }

    if (accessories.includes("mask")) {
      const maskColor = hexToRgb(apparelColors.shirt || "#ffffff");
      fillRect(10, 13, 13, 14, maskColor.r, maskColor.g, maskColor.b, 255, false, 'none', 'top', 'accessory');
      // Mask straps
      setPixel(9, 13, maskColor.r, maskColor.g, maskColor.b, 255, undefined, false, 'none', true, 'top', 'accessory');
      setPixel(14, 13, maskColor.r, maskColor.g, maskColor.b, 255, undefined, false, 'none', true, 'top', 'accessory');
    }

    if (accessories.includes("beard")) {
      fillRect(9, 15, 14, 15, darkColor.r, darkColor.g, darkColor.b, 255, false, 'none', 'top', 'accessory');
      fillRect(8, 13, 8, 14, darkColor.r, darkColor.g, darkColor.b, 255, false, 'none', 'top', 'accessory');
      fillRect(15, 13, 15, 14, darkColor.r, darkColor.g, darkColor.b, 255, false, 'none', 'top', 'accessory');
    }

    if (accessories.includes("eyebrows")) {
      // Short 2px dash above EACH eye (eyes are vertical columns at x=10
      // and x=13 starting at y=11): drawn at y=10 in a hair-derived tone.
      // The old version was two 3px near-black bars ON the eye row itself,
      // meeting at the nose bridge - which read as a glasses frame.
      const browRgb = applyHueShift(hairRgb.r, hairRgb.g, hairRgb.b, -25, false);
      fillRect(9, 10, 10, 10, browRgb.r, browRgb.g, browRgb.b, 255, false, 'none', 'top', 'accessory');
      fillRect(13, 10, 14, 10, browRgb.r, browRgb.g, browRgb.b, 255, false, 'none', 'top', 'accessory');
    }

    if (accessories.includes("freckles")) {
      const freckleRgb = { r: clamp(skinRgb.r - 45), g: clamp(skinRgb.g - 45), b: clamp(skinRgb.b - 55) };
      const spots: Array<[number, number]> = [[9, 13], [10, 14], [13, 14], [14, 13], [9, 14], [14, 14]];
      for (const [x, y] of spots) {
        if (hash2(x, y, resolvedSeed) > 0.4) {
          setPixel(x, y, freckleRgb.r, freckleRgb.g, freckleRgb.b, 255, undefined, false, 'none', true, 'top', 'accessory');
        }
      }
    }

    if (accessories.includes("blush")) {
      const blushRgb = applyHueShift(skinRgb.r, skinRgb.g, skinRgb.b, 22, true);
      setPixel(8, 13, blushRgb.r, blushRgb.g, blushRgb.b, 200, undefined, false, 'none', true, 'top', 'accessory');
      setPixel(15, 13, blushRgb.r, blushRgb.g, blushRgb.b, 200, undefined, false, 'none', true, 'top', 'accessory');
    }

    if (accessories.includes("lipstick")) {
      const lipRgb = hexToRgb("#b03a4a");
      setPixel(11, 14, lipRgb.r, lipRgb.g, lipRgb.b, 255, undefined, false, 'none', true, 'top', 'accessory');
      setPixel(12, 14, lipRgb.r, lipRgb.g, lipRgb.b, 255, undefined, false, 'none', true, 'top', 'accessory');
    }

    if (accessories.includes("earrings")) {
      const earringRgb = hexToRgb(apparelColors.trim || "#d4af37");
      setPixel(7, 13, earringRgb.r, earringRgb.g, earringRgb.b, 255, undefined, false, 'none', true, 'top', 'accessory');
      setPixel(16, 13, earringRgb.r, earringRgb.g, earringRgb.b, 255, undefined, false, 'none', true, 'top', 'accessory');
    }
  }

  // Resolve the outfit stencil early so base-layer fills can be data-driven.
  const stencil: Stencil = STENCILS[stencilKey] || STUDENT_HOODIE_STENCIL;

  const layerColor = (source: 'skin' | 'primary' | 'secondary' | 'shirt'): { r: number; g: number; b: number } => {
    if (source === 'skin') return skinRgb;
    if (source === 'primary') return hexToRgb(apparelColors.primary);
    if (source === 'secondary') return hexToRgb(apparelColors.secondary);
    return hexToRgb(apparelColors.shirt);
  };

  const layerMaterial = (source: 'skin' | 'primary' | 'secondary' | 'shirt'): MaterialId =>
    source === 'skin' ? 'skin' : (`garment-${source}` as MaterialId);

  const resolvedPattern = (fallback: PatternType): PatternType =>
    PATTERN_KEYS.includes(detailTexture as PatternType) && detailTexture !== "none"
      ? (detailTexture as PatternType)
      : fallback;

  // Torso Base Layer:
  const torsoRgb = layerColor(stencil.baseTorso);
  const isTorsoSkin = stencil.baseTorso === 'skin';
  const torsoMaterial = layerMaterial(stencil.baseTorso);
  const torsoPattern = resolvedPattern(stencil.defaultPattern);

  // Draw base torso (e.g. shirt underneath outer jacket overlay)
  fillRect(16, 16, 39, 31, torsoRgb.r, torsoRgb.g, torsoRgb.b, 255, isTorsoSkin, torsoPattern, 'top', torsoMaterial);

  if (!isTorsoSkin) {
    // V-neck cutout at front neck top: x in [22, 25], y in [20, 21]
    fillRect(22, 20, 25, 21, skinRgb.r, skinRgb.g, skinRgb.b, 255, true, 'none', 'top', 'skin');

    // Draw base neck shadow
    setPixel(22, 20, clamp(skinRgb.r - 20), clamp(skinRgb.g - 25), clamp(skinRgb.b - 25), 255, undefined, false, 'none', true, 'top', 'skin');
    setPixel(23, 20, clamp(skinRgb.r - 20), clamp(skinRgb.g - 25), clamp(skinRgb.b - 25), 255, undefined, false, 'none', true, 'top', 'skin');
    setPixel(24, 20, clamp(skinRgb.r - 20), clamp(skinRgb.g - 25), clamp(skinRgb.b - 25), 255, undefined, false, 'none', true, 'top', 'skin');
    setPixel(25, 20, clamp(skinRgb.r - 20), clamp(skinRgb.g - 25), clamp(skinRgb.b - 25), 255, undefined, false, 'none', true, 'top', 'skin');

    // Draw base tie (underneath jacket)
    if (stencil.baseTie) {
      const tieColor = hexToRgb(apparelColors.tie);
      fillRect(23, 21, 24, 27, tieColor.r, tieColor.g, tieColor.b, 255, false, 'none', 'top', 'garment-tie');
    }
  }

  // Legs Base Layer:
  const pantsColor = hexToRgb(apparelColors.pants);
  const legHem = stencil.legStyle === 'shorts' ? 4 : stencil.legStyle === 'skirt' ? 3 : stencil.legStyle === 'bare' ? -1 : 16;
  if (legHem >= 0) {
    fillRect(0, 16, 15, 16 + legHem - 1, pantsColor.r, pantsColor.g, pantsColor.b, 255, false, 'none', 'top-right', 'pants');
    fillRect(16, 48, 31, 48 + legHem - 1, pantsColor.r, pantsColor.g, pantsColor.b, 255, false, 'none', 'top-left', 'pants');
  }

  // Arms Base Layer:
  const sleeveRgb = layerColor(stencil.baseSleeve);
  const isArmSkin = stencil.baseSleeve === 'skin';
  const armMaterial = layerMaterial(stencil.baseSleeve);
  const armPattern = resolvedPattern(stencil.defaultPattern);
  const shortSleeveRows = 6;

  // Right Arm Base
  if (isAlex) {
    if (stencil.sleeveLength === 'short') {
      fillRect(40, 16, 54, 16 + shortSleeveRows - 1, sleeveRgb.r, sleeveRgb.g, sleeveRgb.b, 255, isArmSkin, armPattern, 'top-right', armMaterial);
      fillRect(40, 16 + shortSleeveRows, 54, 31, skinRgb.r, skinRgb.g, skinRgb.b, 255, true, 'none', 'top-right', 'skin');
    } else if (stencil.sleeveLength === 'none') {
      fillRect(40, 16, 54, 31, skinRgb.r, skinRgb.g, skinRgb.b, 255, true, 'none', 'top-right', 'skin');
    } else {
      fillRect(40, 16, 54, 27, sleeveRgb.r, sleeveRgb.g, sleeveRgb.b, 255, isArmSkin, armPattern, 'top-right', armMaterial);
      fillRect(40, 28, 54, 31, skinRgb.r, skinRgb.g, skinRgb.b, 255, true, 'none', 'top-right', 'skin');
    }
  } else {
    if (stencil.sleeveLength === 'short') {
      fillRect(40, 16, 55, 16 + shortSleeveRows - 1, sleeveRgb.r, sleeveRgb.g, sleeveRgb.b, 255, isArmSkin, armPattern, 'top-right', armMaterial);
      fillRect(40, 16 + shortSleeveRows, 55, 31, skinRgb.r, skinRgb.g, skinRgb.b, 255, true, 'none', 'top-right', 'skin');
    } else if (stencil.sleeveLength === 'none') {
      fillRect(40, 16, 55, 31, skinRgb.r, skinRgb.g, skinRgb.b, 255, true, 'none', 'top-right', 'skin');
    } else {
      fillRect(40, 16, 55, 27, sleeveRgb.r, sleeveRgb.g, sleeveRgb.b, 255, isArmSkin, armPattern, 'top-right', armMaterial);
      fillRect(40, 28, 55, 31, skinRgb.r, skinRgb.g, skinRgb.b, 255, true, 'none', 'top-right', 'skin');
    }
  }

  // Left Arm Base
  if (isAlex) {
    if (stencil.sleeveLength === 'short') {
      fillRect(32, 46, 46, 46 + shortSleeveRows - 1, sleeveRgb.r, sleeveRgb.g, sleeveRgb.b, 255, isArmSkin, armPattern, 'top-left', armMaterial);
      fillRect(32, 46 + shortSleeveRows, 46, 61, skinRgb.r, skinRgb.g, skinRgb.b, 255, true, 'none', 'top-left', 'skin');
    } else if (stencil.sleeveLength === 'none') {
      fillRect(32, 46, 46, 61, skinRgb.r, skinRgb.g, skinRgb.b, 255, true, 'none', 'top-left', 'skin');
    } else {
      fillRect(32, 46, 46, 57, sleeveRgb.r, sleeveRgb.g, sleeveRgb.b, 255, isArmSkin, armPattern, 'top-left', armMaterial);
      fillRect(32, 58, 46, 61, skinRgb.r, skinRgb.g, skinRgb.b, 255, true, 'none', 'top-left', 'skin');
    }
  } else {
    if (stencil.sleeveLength === 'short') {
      fillRect(32, 48, 47, 48 + shortSleeveRows - 1, sleeveRgb.r, sleeveRgb.g, sleeveRgb.b, 255, isArmSkin, armPattern, 'top-left', armMaterial);
      fillRect(32, 48 + shortSleeveRows, 47, 63, skinRgb.r, skinRgb.g, skinRgb.b, 255, true, 'none', 'top-left', 'skin');
    } else if (stencil.sleeveLength === 'none') {
      fillRect(32, 48, 47, 63, skinRgb.r, skinRgb.g, skinRgb.b, 255, true, 'none', 'top-left', 'skin');
    } else {
      fillRect(32, 48, 47, 59, sleeveRgb.r, sleeveRgb.g, sleeveRgb.b, 255, isArmSkin, armPattern, 'top-left', armMaterial);
      fillRect(32, 60, 47, 63, skinRgb.r, skinRgb.g, skinRgb.b, 255, true, 'none', 'top-left', 'skin');
    }
  }

  // --- 2. OVERLAY THE INSTITUTIONAL UNIFORM STENCIL ---

  for (const region of stencil.regions) {
    let hex = "#ffffff";
    if (region.colorType === "primary") hex = apparelColors.primary;
    else if (region.colorType === "secondary") hex = apparelColors.secondary;
    else if (region.colorType === "trim") hex = apparelColors.trim;
    else if (region.colorType === "shirt") hex = apparelColors.shirt;
    else if (region.colorType === "tie") hex = apparelColors.tie;
    else if (region.colorType === "pants") hex = apparelColors.pants;
    else if (region.colorType === "skin") hex = demo.skinColor;
    else if (region.colorType === "hair") hex = demo.hairColor;
    else if (region.colorType === "eyes") hex = demo.eyeColor;

    const rgb = hexToRgb(hex);
    
    // Choose appropriate texture pattern
    let pattern: PatternType = 'none';
    if (PATTERN_KEYS.includes(detailTexture as PatternType) && detailTexture !== "none") {
      pattern = detailTexture as PatternType;
    } else {
      if (stencilKey === "hoodie" && (region.name.includes("Hoodie") || region.name.includes("Sleeve") || region.name.includes("Hood"))) {
        pattern = 'knit';
      } else if (stencilKey === "blazer" && (region.name.includes("Blazer") || region.name.includes("Sleeve"))) {
        pattern = 'tweed';
      }
    }

    const regionLightDir: ShadeOptions['lightDir'] = region.name.includes("Right")
      ? 'top-right'
      : region.name.includes("Left")
      ? 'top-left'
      : 'top';

    const regionMaterial: MaterialId =
      region.colorType === 'pants'
        ? 'pants'
        : region.colorType === 'skin'
        ? 'skin'
        : region.colorType === 'hair'
        ? 'hair'
        : region.colorType === 'eyes'
        ? 'eye'
        : (`garment-${region.colorType === 'accent' ? 'secondary' : region.colorType}` as MaterialId);

    if (isAlex && region.name.includes("Sleeve")) {
      if (region.name.includes("Right Sleeve")) {
        const adjustedX2 = Math.min(region.x2, 54);
        fillRect(region.x1, region.y1, adjustedX2, region.y2, rgb.r, rgb.g, rgb.b, 255, false, pattern, regionLightDir, regionMaterial);
      } else if (region.name.includes("Left Sleeve")) {
        const adjustedX2 = Math.min(region.x2, 62);
        fillRect(region.x1, region.y1, adjustedX2, region.y2, rgb.r, rgb.g, rgb.b, 255, false, pattern, regionLightDir, regionMaterial);
      } else {
        fillRect(region.x1, region.y1, region.x2, region.y2, rgb.r, rgb.g, rgb.b, 255, false, pattern, regionLightDir, regionMaterial);
      }
    } else {
      fillRect(region.x1, region.y1, region.x2, region.y2, rgb.r, rgb.g, rgb.b, 255, region.colorType === "skin", pattern, regionLightDir, regionMaterial);
    }
  }

  // Draw stencil-appropriate shoes on the leg bases
  const shoeStyle = stencil.shoeStyle || 'boots';
  const shoeRgb = hexToRgb(apparelColors.shoes || "#302015");
  if (shoeStyle === 'boots') {
    fillRect(0, 29, 15, 31, shoeRgb.r, shoeRgb.g, shoeRgb.b, 255, false, 'none', 'top', 'shoes');
    fillRect(16, 61, 31, 63, shoeRgb.r, shoeRgb.g, shoeRgb.b, 255, false, 'none', 'top', 'shoes');
  } else if (shoeStyle === 'sneakers') {
    fillRect(0, 30, 15, 30, shoeRgb.r, shoeRgb.g, shoeRgb.b, 255, false, 'none', 'top', 'shoes');
    fillRect(0, 31, 15, 31, 235, 235, 235, 255, false, 'none', 'top', 'shoes');
    fillRect(16, 62, 31, 62, shoeRgb.r, shoeRgb.g, shoeRgb.b, 255, false, 'none', 'top', 'shoes');
    fillRect(16, 63, 31, 63, 235, 235, 235, 255, false, 'none', 'top', 'shoes');
  } else if (shoeStyle === 'flats') {
    fillRect(0, 31, 15, 31, shoeRgb.r, shoeRgb.g, shoeRgb.b, 255, false, 'none', 'top', 'shoes');
    fillRect(16, 63, 31, 63, shoeRgb.r, shoeRgb.g, shoeRgb.b, 255, false, 'none', 'top', 'shoes');
  }

  // Long hair drapes in front of the torso, so it has to be painted last -
  // after the base torso layer AND the outfit's overlay regions - or it
  // would be silently painted over the moment the body/garment finishes.
  if (resolvedHairStyle.shoulderRects) {
    for (const rect of resolvedHairStyle.shoulderRects) {
      fillHairRect(rect.x1, rect.y1, rect.x2, rect.y2, rect.shade ?? 0);
      // Also paint the torso OVERLAY UV (base front + 16 rows down): any
      // stencil that dresses the torso overlay would otherwise composite
      // its garment over the drape and swallow the hair entirely. On the
      // overlay the strands also render on the inflated shell, floating
      // slightly off the chest the way draped hair should.
      fillHairRect(rect.x1, rect.y1 + 16, rect.x2, rect.y2 + 16, rect.shade ?? 0);
    }
  }

  applyContourPass(array, materialMap, BASE_FACE_RECTS);

  return array;
}

/**
 * Encodes a raw RGBA Uint8Array (16,384 bytes for a 64×64 skin) into a
 * Base64 string suitable for JSON transport or `<img src>` data URLs.
 *
 * @param array - The flat RGBA skin array produced by `generateSkinArray`.
 * @returns Standard Base64-encoded string of the raw bytes.
 */
export function skinToBase64(array: Uint8Array): string {
  const binary = Array.from(array)
    .map((b) => String.fromCharCode(b))
    .join("");
  return btoa(binary);
}

/**
 * Decodes a Base64 string (as produced by `skinToBase64`) back into a raw
 * RGBA Uint8Array for use with Canvas APIs or the skin engine.
 *
 * @param base64 - A Base64 string representing a 64×64 Minecraft skin.
 * @returns Flat RGBA Uint8Array with 16,384 elements.
 */
export function base64ToSkin(base64: string): Uint8Array {
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return array;
}
