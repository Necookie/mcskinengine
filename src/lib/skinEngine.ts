import { DEMOGRAPHICS, STENCILS, Stencil, STUDENT_HOODIE_STENCIL } from "./stencils";
import {
  hexToRgb,
  clamp,
  applyHueShift,
  applyVolumeShaderV2,
  hash2,
  PatternType,
  ShadeBounds,
  ShadeOptions,
} from "./shading";

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
  }
): Uint8Array {
  // Initialize with transparent pixels
  const array = new Uint8Array(64 * 64 * 4);

  const demo = DEMOGRAPHICS[demographicKey] || DEMOGRAPHICS["East Asian"];
  const skinRgb = hexToRgb(traits?.skinColor || demo.skinColor);
  const hairRgb = hexToRgb(traits?.hairColor || demo.hairColor);
  const eyeRgb = hexToRgb(traits?.eyeColor || demo.eyeColor);
  const hairStyle = traits?.hairStyle || "messy-fringe";
  const eyeStyle = traits?.eyeStyle || "cool-highlight";
  const detailTexture = traits?.detailTexture || "none";

  // Helper to set a pixel color with chiaroscuro shading
  const setPixel = (x: number, y: number, r: number, g: number, b: number, a: number = 255, bounds?: { x1: number; y1: number; x2: number; y2: number }, isSkin: boolean = false, pattern: 'knit' | 'tweed' | 'pinstripe' | 'none' = 'none', applyShade: boolean = true) => {
    if (x < 0 || x >= 64 || y < 0 || y >= 64) return;
    const idx = (y * 64 + x) * 4;
    if (applyShade && a > 0) {
      const shaded = applyVolumeShader(x, y, r, g, b, bounds, isSkin, pattern);
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
  };

  // Helper to fill a rectangle
  const fillRect = (x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, a: number = 255, isSkin: boolean = false, pattern: 'knit' | 'tweed' | 'pinstripe' | 'none' = 'none') => {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        setPixel(x, y, r, g, b, a, { x1, y1, x2, y2 }, isSkin, pattern);
      }
    }
  };

  // Head Base: x in [0, 31], y in [0, 15]
  fillRect(0, 0, 31, 15, skinRgb.r, skinRgb.g, skinRgb.b, 255, true);

  // Hair - Draw base helmet on head back, left, right, and top
  fillRect(8, 0, 15, 7, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
  fillRect(0, 0, 7, 7, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
  fillRect(16, 0, 23, 7, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
  fillRect(24, 8, 31, 15, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
  fillRect(0, 8, 7, 11, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
  fillRect(16, 8, 23, 11, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);

  // Procedural Hair Style overlays:
  if (hairStyle === "undercut") {
    const shavedRgb = applyHueShift(hairRgb.r, hairRgb.g, hairRgb.b, -30, false);
    // Left/Right shaved sides:
    fillRect(0, 10, 7, 15, shavedRgb.r, shavedRgb.g, shavedRgb.b, 255, false);
    fillRect(16, 10, 23, 15, shavedRgb.r, shavedRgb.g, shavedRgb.b, 255, false);
    // High top front hair:
    fillRect(8, 8, 15, 8, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
  } else if (hairStyle === "long-curly") {
    // Back hair goes down all the way
    fillRect(24, 8, 31, 15, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
    // Shoulders front locks:
    fillRect(8, 8, 15, 9, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
    fillRect(8, 10, 8, 12, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
    fillRect(15, 10, 15, 12, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
    // Hair strands resting on Torso Base:
    fillRect(20, 16, 21, 19, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
    fillRect(26, 16, 27, 19, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
  } else if (hairStyle === "parted-curtains") {
    // Curtains fringe: parted in the middle
    fillRect(8, 8, 9, 10, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
    fillRect(14, 8, 15, 10, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
    fillRect(10, 8, 13, 8, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
    // Side locks:
    fillRect(7, 10, 7, 11, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
    fillRect(16, 10, 16, 11, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
  } else if (hairStyle === "short-spiky") {
    // Spiky hairline:
    fillRect(8, 8, 15, 8, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
    setPixel(9, 9, hairRgb.r, hairRgb.g, hairRgb.b, 255, undefined, false);
    setPixel(11, 9, hairRgb.r, hairRgb.g, hairRgb.b, 255, undefined, false);
    setPixel(13, 9, hairRgb.r, hairRgb.g, hairRgb.b, 255, undefined, false);
    setPixel(15, 9, hairRgb.r, hairRgb.g, hairRgb.b, 255, undefined, false);
  } else {
    // Default/messy-fringe:
    fillRect(8, 8, 15, 9, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
    fillRect(9, 10, 10, 10, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
    fillRect(13, 10, 14, 10, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
    fillRect(7, 10, 7, 12, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
    fillRect(16, 10, 16, 12, hairRgb.r, hairRgb.g, hairRgb.b, 255, false);
  }

  // Hair Highlight Halo around y = 10 (adds shine and volume to the hair)
  const hairHighlight = applyHueShift(hairRgb.r, hairRgb.g, hairRgb.b, 18, false);
  fillRect(9, 10, 14, 10, hairHighlight.r, hairHighlight.g, hairHighlight.b, 255, false);
  fillRect(1, 10, 6, 10, hairHighlight.r, hairHighlight.g, hairHighlight.b, 255, false);
  fillRect(17, 10, 22, 10, hairHighlight.r, hairHighlight.g, hairHighlight.b, 255, false);
  fillRect(25, 10, 30, 10, hairHighlight.r, hairHighlight.g, hairHighlight.b, 255, false);

  // Eyes on Head Front: (8, 8) to (15, 15)
  if (eyeStyle === "shadow-2x2") {
    fillRect(10, 12, 11, 13, clamp(eyeRgb.r - 30), clamp(eyeRgb.g - 30), clamp(eyeRgb.b - 30), 255);
    fillRect(13, 12, 14, 13, clamp(eyeRgb.r - 30), clamp(eyeRgb.g - 30), clamp(eyeRgb.b - 30), 255);
    setPixel(9, 12, 255, 255, 255, 255, undefined, false);
    setPixel(12, 12, 255, 255, 255, 255, undefined, false);
  } else if (eyeStyle === "anime-glowing") {
    const brightColor = applyHueShift(eyeRgb.r, eyeRgb.g, eyeRgb.b, 40, false);
    fillRect(10, 12, 11, 12, brightColor.r, brightColor.g, brightColor.b, 255, false);
    fillRect(13, 12, 14, 12, brightColor.r, brightColor.g, brightColor.b, 255, false);
    setPixel(9, 12, 255, 255, 255, 255, undefined, false);
    setPixel(12, 12, 255, 255, 255, 255, undefined, false);
  } else if (eyeStyle === "classic-simple") {
    setPixel(10, 12, 255, 255, 255, 255, undefined, false);
    setPixel(11, 12, eyeRgb.r, eyeRgb.g, eyeRgb.b, 255, undefined, false);
    setPixel(13, 12, eyeRgb.r, eyeRgb.g, eyeRgb.b, 255, undefined, false);
    setPixel(14, 12, 255, 255, 255, 255, undefined, false);
  } else {
    // cool-highlight default:
    setPixel(9, 12, 255, 255, 255, 255, undefined, false);
    setPixel(10, 12, 255, 255, 255, 255, undefined, false);
    setPixel(13, 12, 255, 255, 255, 255, undefined, false);
    setPixel(14, 12, 255, 255, 255, 255, undefined, false);
    
    setPixel(11, 12, eyeRgb.r, eyeRgb.g, eyeRgb.b, 255, undefined, false);
    setPixel(11, 13, clamp(eyeRgb.r - 20), clamp(eyeRgb.g - 20), clamp(eyeRgb.b - 20), 255, undefined, false);
    setPixel(12, 12, eyeRgb.r, eyeRgb.g, eyeRgb.b, 255, undefined, false);
    setPixel(12, 13, clamp(eyeRgb.r - 20), clamp(eyeRgb.g - 20), clamp(eyeRgb.b - 20), 255, undefined, false);
    
    setPixel(10, 12, 255, 255, 255, 220, undefined, false);
    setPixel(13, 12, 255, 255, 255, 220, undefined, false);
    fillRect(9, 11, 14, 11, clamp(skinRgb.r - 35), clamp(skinRgb.g - 45), clamp(skinRgb.b - 45), 255, true);
  }

  // Nose/Mouth details (optional, subtle skin color differences or shadow)
  setPixel(11, 13, clamp(skinRgb.r - 10), clamp(skinRgb.g - 15), clamp(skinRgb.b - 15), 255, undefined, false);
  setPixel(12, 13, clamp(skinRgb.r - 10), clamp(skinRgb.g - 15), clamp(skinRgb.b - 15), 255, undefined, false);

  if (accessories && Array.isArray(accessories)) {
    const darkColor = { r: 35, g: 30, b: 30 }; // dark charcoal
    
    if (accessories.includes("glasses")) {
      // Bridge between eyes: (12, 12)
      setPixel(12, 12, darkColor.r, darkColor.g, darkColor.b, 255, undefined, false);

      // Left frame box: border of (9, 11) to (12, 13)
      fillRect(9, 11, 12, 11, darkColor.r, darkColor.g, darkColor.b, 255);
      fillRect(9, 13, 12, 13, darkColor.r, darkColor.g, darkColor.b, 255);
      setPixel(9, 12, darkColor.r, darkColor.g, darkColor.b, 255, undefined, false);
      setPixel(12, 12, darkColor.r, darkColor.g, darkColor.b, 255, undefined, false);

      // Right frame box: border of (13, 11) to (16, 13)
      fillRect(13, 11, 16, 11, darkColor.r, darkColor.g, darkColor.b, 255);
      fillRect(13, 13, 16, 13, darkColor.r, darkColor.g, darkColor.b, 255);
      setPixel(13, 12, darkColor.r, darkColor.g, darkColor.b, 255, undefined, false);
      setPixel(16, 12, darkColor.r, darkColor.g, darkColor.b, 255, undefined, false);

      // Temples:
      fillRect(3, 12, 7, 12, darkColor.r, darkColor.g, darkColor.b, 255);
      fillRect(16, 12, 20, 12, darkColor.r, darkColor.g, darkColor.b, 255);
    }

    if (accessories.includes("headphones")) {
      const hpColor = hexToRgb(apparelColors.secondary || "#ff0000");
      // Band over head top (Front top rim: 8,0 to 15,0)
      fillRect(8, 0, 15, 0, hpColor.r, hpColor.g, hpColor.b, 255);
      // Sides down (4, 9 to 4, 11 on right, 19, 9 to 19, 11 on left)
      fillRect(4, 9, 4, 11, hpColor.r, hpColor.g, hpColor.b, 255);
      fillRect(19, 9, 19, 11, hpColor.r, hpColor.g, hpColor.b, 255);
      // Ear cups
      fillRect(3, 10, 5, 12, hpColor.r, hpColor.g, hpColor.b, 255);
      fillRect(18, 10, 20, 12, hpColor.r, hpColor.g, hpColor.b, 255);
    }

    if (accessories.includes("mask")) {
      const maskColor = hexToRgb(apparelColors.shirt || "#ffffff");
      fillRect(10, 13, 13, 14, maskColor.r, maskColor.g, maskColor.b, 255);
      // Mask straps
      setPixel(9, 13, maskColor.r, maskColor.g, maskColor.b, 255, undefined, false);
      setPixel(14, 13, maskColor.r, maskColor.g, maskColor.b, 255, undefined, false);
    }

    if (accessories.includes("beard")) {
      fillRect(9, 15, 14, 15, darkColor.r, darkColor.g, darkColor.b, 255);
      fillRect(8, 13, 8, 14, darkColor.r, darkColor.g, darkColor.b, 255);
      fillRect(15, 13, 15, 14, darkColor.r, darkColor.g, darkColor.b, 255);
    }

    if (accessories.includes("eyebrows")) {
      fillRect(9, 11, 11, 11, darkColor.r, darkColor.g, darkColor.b, 255);
      fillRect(12, 11, 14, 11, darkColor.r, darkColor.g, darkColor.b, 255);
    }
  }

  // Torso Base Layer:
  let torsoRgb = skinRgb;
  let torsoPattern: 'knit' | 'tweed' | 'pinstripe' | 'none' = 'none';
  let isTorsoSkin = true;

  if (detailTexture === "knit") torsoPattern = "knit";
  else if (detailTexture === "tweed" || detailTexture === "flannel") torsoPattern = "tweed";
  else if (detailTexture === "pinstripe" || detailTexture === "denim") torsoPattern = "pinstripe";
  else {
    if (stencilKey === "hoodie") torsoPattern = "knit";
    else if (stencilKey === "blazer") torsoPattern = "tweed";
  }

  if (stencilKey === "hoodie") {
    torsoRgb = hexToRgb(apparelColors.primary);
    isTorsoSkin = false;
  } else if (stencilKey === "blazer") {
    torsoRgb = hexToRgb(apparelColors.shirt);
    isTorsoSkin = false;
  } else if (stencilKey === "labcoat") {
    torsoRgb = hexToRgb(apparelColors.shirt);
    isTorsoSkin = false;
  }

  // Draw base torso (e.g. shirt underneath outer jacket overlay)
  fillRect(16, 16, 39, 31, torsoRgb.r, torsoRgb.g, torsoRgb.b, 255, isTorsoSkin, torsoPattern);

  if (!isTorsoSkin) {
    // V-neck cutout at front neck top: x in [22, 25], y in [20, 21]
    fillRect(22, 20, 25, 21, skinRgb.r, skinRgb.g, skinRgb.b, 255, true);
    
    // Draw base neck shadow
    setPixel(22, 20, clamp(skinRgb.r - 20), clamp(skinRgb.g - 25), clamp(skinRgb.b - 25), 255, undefined, false);
    setPixel(23, 20, clamp(skinRgb.r - 20), clamp(skinRgb.g - 25), clamp(skinRgb.b - 25), 255, undefined, false);
    setPixel(24, 20, clamp(skinRgb.r - 20), clamp(skinRgb.g - 25), clamp(skinRgb.b - 25), 255, undefined, false);
    setPixel(25, 20, clamp(skinRgb.r - 20), clamp(skinRgb.g - 25), clamp(skinRgb.b - 25), 255, undefined, false);
    
    // Draw base tie (underneath tweed jacket)
    if (stencilKey === "blazer") {
      const tieColor = hexToRgb(apparelColors.tie);
      fillRect(23, 21, 24, 27, tieColor.r, tieColor.g, tieColor.b, 255, false);
    }
  }

  // Legs Base Layer:
  const pantsColor = hexToRgb(apparelColors.pants);
  fillRect(0, 16, 15, 31, pantsColor.r, pantsColor.g, pantsColor.b, 255, false);
  fillRect(16, 48, 31, 63, pantsColor.r, pantsColor.g, pantsColor.b, 255, false);

  // Arms Base Layer:
  let sleeveRgb = skinRgb;
  let isArmSkin = true;
  let armPattern: 'knit' | 'tweed' | 'pinstripe' | 'none' = 'none';

  if (detailTexture === "knit") armPattern = "knit";
  else if (detailTexture === "tweed" || detailTexture === "flannel") armPattern = "tweed";
  else if (detailTexture === "pinstripe" || detailTexture === "denim") armPattern = "pinstripe";
  else {
    if (stencilKey === "hoodie") armPattern = "knit";
    else if (stencilKey === "blazer") armPattern = "tweed";
  }

  if (stencilKey === "hoodie") {
    sleeveRgb = hexToRgb(apparelColors.primary);
    isArmSkin = false;
  } else if (stencilKey === "blazer" || stencilKey === "labcoat") {
    sleeveRgb = hexToRgb(apparelColors.shirt); // shirt sleeve underneath jacket
    isArmSkin = false;
  }

  // Right Arm Base
  if (isAlex) {
    fillRect(40, 16, 54, 27, sleeveRgb.r, sleeveRgb.g, sleeveRgb.b, 255, isArmSkin, armPattern);
    fillRect(40, 28, 54, 31, skinRgb.r, skinRgb.g, skinRgb.b, 255, true);
  } else {
    fillRect(40, 16, 55, 27, sleeveRgb.r, sleeveRgb.g, sleeveRgb.b, 255, isArmSkin, armPattern);
    fillRect(40, 28, 55, 31, skinRgb.r, skinRgb.g, skinRgb.b, 255, true);
  }

  // Left Arm Base
  if (isAlex) {
    fillRect(32, 46, 46, 57, sleeveRgb.r, sleeveRgb.g, sleeveRgb.b, 255, isArmSkin, armPattern);
    fillRect(32, 58, 46, 61, skinRgb.r, skinRgb.g, skinRgb.b, 255, true);
  } else {
    fillRect(32, 48, 47, 59, sleeveRgb.r, sleeveRgb.g, sleeveRgb.b, 255, isArmSkin, armPattern);
    fillRect(32, 60, 47, 63, skinRgb.r, skinRgb.g, skinRgb.b, 255, true);
  }

  // --- 2. OVERLAY THE INSTITUTIONAL UNIFORM STENCIL ---

  const stencil: Stencil = STENCILS[stencilKey] || STUDENT_HOODIE_STENCIL;

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
    let pattern: 'knit' | 'tweed' | 'pinstripe' | 'none' = 'none';
    if (detailTexture === "knit") {
      pattern = 'knit';
    } else if (detailTexture === "tweed" || detailTexture === "flannel") {
      pattern = 'tweed';
    } else if (detailTexture === "pinstripe" || detailTexture === "denim") {
      pattern = 'pinstripe';
    } else {
      if (stencilKey === "hoodie" && (region.name.includes("Hoodie") || region.name.includes("Sleeve") || region.name.includes("Hood"))) {
        pattern = 'knit';
      } else if (stencilKey === "blazer" && (region.name.includes("Blazer") || region.name.includes("Sleeve"))) {
        pattern = 'tweed';
      }
    }

    if (isAlex && region.name.includes("Sleeve")) {
      if (region.name.includes("Right Sleeve")) {
        const adjustedX2 = Math.min(region.x2, 54);
        fillRect(region.x1, region.y1, adjustedX2, region.y2, rgb.r, rgb.g, rgb.b, 255, false, pattern);
      } else if (region.name.includes("Left Sleeve")) {
        const adjustedX2 = Math.min(region.x2, 62);
        fillRect(region.x1, region.y1, adjustedX2, region.y2, rgb.r, rgb.g, rgb.b, 255, false, pattern);
      } else {
        fillRect(region.x1, region.y1, region.x2, region.y2, rgb.r, rgb.g, rgb.b, 255, false, pattern);
      }
    } else {
      fillRect(region.x1, region.y1, region.x2, region.y2, rgb.r, rgb.g, rgb.b, 255, region.colorType === "skin", pattern);
    }
  }

  // Draw boots/shoes on leg bases (as decorative default elements)
  const shoeRgb = hexToRgb("#302015");
  fillRect(0, 30, 15, 31, shoeRgb.r, shoeRgb.g, shoeRgb.b, 255, false);
  fillRect(16, 62, 31, 63, shoeRgb.r, shoeRgb.g, shoeRgb.b, 255, false);

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
