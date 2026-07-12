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
 * Procedurally generates a 64x64 Minecraft skin as a flat 1D RGBA array (16,384 elements).
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
  const hairRgb = hexToRgb(traits?.hairColor || demo.hairColor);
  const eyeRgb = hexToRgb(traits?.eyeColor || demo.eyeColor);
  const styleVibe = traits?.styleVibe || "neutral";
  const vibeHairDefault = styleVibe === 'feminine' ? "long-straight" : styleVibe === 'masculine' ? "short-spiky" : "messy-fringe";
  const vibeEyeDefault = styleVibe === 'feminine' ? "long-lashes" : styleVibe === 'masculine' ? "narrow-serious" : "cool-highlight";
  const hairStyle = traits?.hairStyle || vibeHairDefault;
  const eyeStyle = traits?.eyeStyle || vibeEyeDefault;
  const detailTexture = traits?.detailTexture || "none";

  const seedBase = `${stencilKey}|${hairStyle}|${apparelColors.primary}`;
  const resolvedSeed =
    seed ??
    Math.floor(hash2(seedBase.length, seedBase.charCodeAt(0) + seedBase.length, 7) * 65536);

  // Helper to set a pixel color with chiaroscuro shading
  const setPixel = (x: number, y: number, r: number, g: number, b: number, a: number = 255, bounds?: ShadeBounds, isSkin: boolean = false, pattern: PatternType = 'none', applyShade: boolean = true, lightDir: ShadeOptions['lightDir'] = 'top', material: MaterialId = 'none') => {
    if (x < 0 || x >= 64 || y < 0 || y >= 64) return;
    const idx = (y * 64 + x) * 4;
    if (applyShade && a > 0) {
      const shaded = applyVolumeShaderV2(x, y, r, g, b, bounds, { isSkin, pattern, seed: resolvedSeed, lightDir });
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

  // Hair - Draw base helmet, then the chosen style's overlay rects
  for (const rect of HAIR_BASE) {
    fillRect(rect.x1, rect.y1, rect.x2, rect.y2, hairRgb.r, hairRgb.g, hairRgb.b, 255, false, 'none', 'top', 'hair');
  }

  const resolvedHairStyle = HAIR_STYLES[hairStyle] || HAIR_STYLES["messy-fringe"];
  for (const rect of resolvedHairStyle.rects) {
    const c = rect.shade ? applyHueShift(hairRgb.r, hairRgb.g, hairRgb.b, rect.shade, false) : hairRgb;
    fillRect(rect.x1, rect.y1, rect.x2, rect.y2, c.r, c.g, c.b, 255, false, 'none', 'top', 'hair');
  }

  // Hair Highlight Halo around y = 10 (adds shine and volume to the hair)
  const hairHighlight = applyHueShift(hairRgb.r, hairRgb.g, hairRgb.b, 18, false);
  fillRect(9, 10, 14, 10, hairHighlight.r, hairHighlight.g, hairHighlight.b, 255, false, 'none', 'top', 'hair');
  fillRect(1, 10, 6, 10, hairHighlight.r, hairHighlight.g, hairHighlight.b, 255, false, 'none', 'top', 'hair');
  fillRect(17, 10, 22, 10, hairHighlight.r, hairHighlight.g, hairHighlight.b, 255, false, 'none', 'top', 'hair');
  fillRect(25, 10, 30, 10, hairHighlight.r, hairHighlight.g, hairHighlight.b, 255, false, 'none', 'top', 'hair');

  // Eyes on Head Front: (8, 8) to (15, 15)
  const resolvedEyeStyle = EYE_STYLES[eyeStyle] || EYE_STYLES["cool-highlight"];
  resolvedEyeStyle.draw({
    setPixel: (x, y, r, g, b, a = 255, applyShade = true) => setPixel(x, y, r, g, b, a, undefined, false, 'none', applyShade, 'top', 'eye'),
    fillRect: (x1, y1, x2, y2, r, g, b, a = 255, isSkin = false) => fillRect(x1, y1, x2, y2, r, g, b, a, isSkin, 'none', 'top', isSkin ? 'skin' : 'eye'),
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
      fillRect(9, 11, 11, 11, darkColor.r, darkColor.g, darkColor.b, 255, false, 'none', 'top', 'accessory');
      fillRect(12, 11, 14, 11, darkColor.r, darkColor.g, darkColor.b, 255, false, 'none', 'top', 'accessory');
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

  applyContourPass(array, materialMap, BASE_FACE_RECTS);

  return array;
}

/**
 * Helper to convert Uint8Array back and forth to standard Base64 representation.
 */
export function skinToBase64(array: Uint8Array): string {
  const binary = Array.from(array)
    .map((b) => String.fromCharCode(b))
    .join("");
  return btoa(binary);
}

export function base64ToSkin(base64: string): Uint8Array {
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return array;
}
