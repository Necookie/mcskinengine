import { DEMOGRAPHICS, STENCILS, Stencil, STUDENT_HOODIE_STENCIL } from "./stencils";

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

// Procedural 3D shading: Sunlight gradient (Y) + Cylindrical Curve (X) + Random Texture Grain
export function applyVolumeShader(
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  bounds?: { x1: number; y1: number; x2: number; y2: number }
): { r: number; g: number; b: number } {
  if (!bounds) {
    const offset = Math.floor(Math.random() * 25) - 12;
    return { r: clamp(r + offset), g: clamp(g + offset), b: clamp(b + offset) };
  }

  const { x1, y1, x2, y2 } = bounds;
  const dx = x2 - x1;
  const dy = y2 - y1;

  const pctX = dx > 0 ? (x - x1) / dx : 0.5;
  const pctY = dy > 0 ? (y - y1) / dy : 0.5;

  // 1. Vertical Sunlight Gradient (lighter at top, darker at bottom)
  const verticalOffset = (1 - pctY) * 16 - 8; // -8 to +8

  // 2. Horizontal Cylinder Curve (brighter center, darker edges)
  const horizontalOffset = Math.sin(pctX * Math.PI) * 14 - 7; // -7 to +7

  // 3. Subtle Texture Grain (adds fabric details)
  const grain = Math.floor(Math.random() * 10) - 5; // -5 to +5

  const totalOffset = Math.round(verticalOffset + horizontalOffset + grain);

  return {
    r: clamp(r + totalOffset),
    g: clamp(g + totalOffset),
    b: clamp(b + totalOffset),
  };
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
  accessories: string[] = []
): Uint8Array {
  // Initialize with transparent pixels
  const array = new Uint8Array(64 * 64 * 4);

  const demo = DEMOGRAPHICS[demographicKey] || DEMOGRAPHICS["East Asian"];
  const skinRgb = hexToRgb(demo.skinColor);
  const hairRgb = hexToRgb(demo.hairColor);
  const eyeRgb = hexToRgb(demo.eyeColor);

  // Helper to set a pixel color with chiaroscuro shading
  const setPixel = (x: number, y: number, r: number, g: number, b: number, a: number = 255, bounds?: { x1: number; y1: number; x2: number; y2: number }, applyShade: boolean = true) => {
    if (x < 0 || x >= 64 || y < 0 || y >= 64) return;
    const idx = (y * 64 + x) * 4;
    if (applyShade && a > 0) {
      const shaded = applyVolumeShader(x, y, r, g, b, bounds);
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
  const fillRect = (x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, a: number = 255) => {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        setPixel(x, y, r, g, b, a, { x1, y1, x2, y2 });
      }
    }
  };

  // --- 1. DRAW DEMOGRAPHIC BASE BODY ---

  // Head Base: x in [0, 31], y in [0, 15]
  fillRect(0, 0, 31, 15, skinRgb.r, skinRgb.g, skinRgb.b);

  // Hair - Draw on head back, left, right, and top
  // Hair on head top: (8, 0) to (15, 7)
  fillRect(8, 0, 15, 7, hairRgb.r, hairRgb.g, hairRgb.b);
  // Hair on sides: Right (0, 0)-(7, 7) and Left (16, 0)-(23, 7)
  fillRect(0, 0, 7, 7, hairRgb.r, hairRgb.g, hairRgb.b);
  fillRect(16, 0, 23, 7, hairRgb.r, hairRgb.g, hairRgb.b);
  // Hair on head back: (24, 8) to (31, 15)
  fillRect(24, 8, 31, 15, hairRgb.r, hairRgb.g, hairRgb.b);
  // Hair sides down: (0, 8) to (7, 15) and (16, 8) to (23, 15) upper parts
  fillRect(0, 8, 7, 11, hairRgb.r, hairRgb.g, hairRgb.b);
  fillRect(16, 8, 23, 11, hairRgb.r, hairRgb.g, hairRgb.b);
  // Forehead hairline on Head Front (8,8) to (15,15)
  fillRect(8, 8, 15, 9, hairRgb.r, hairRgb.g, hairRgb.b);
  fillRect(8, 10, 8, 10, hairRgb.r, hairRgb.g, hairRgb.b); // hair side lock
  fillRect(15, 10, 15, 10, hairRgb.r, hairRgb.g, hairRgb.b); // hair side lock

  // Eyes on Head Front: (8, 8) to (15, 15)
  // Left eye: (10, 12) white, (11, 12) eye color
  setPixel(10, 12, 255, 255, 255, 255, false);
  setPixel(11, 12, eyeRgb.r, eyeRgb.g, eyeRgb.b, 255, false);
  // Right eye: (13, 12) eye color, (14, 12) white
  setPixel(13, 12, eyeRgb.r, eyeRgb.g, eyeRgb.b, 255, false);
  setPixel(14, 12, 255, 255, 255, 255, false);

  // Nose/Mouth details (optional, subtle skin color differences or shadow)
  setPixel(11, 13, clamp(skinRgb.r - 10), clamp(skinRgb.g - 15), clamp(skinRgb.b - 15), 255, false);
  setPixel(12, 13, clamp(skinRgb.r - 10), clamp(skinRgb.g - 15), clamp(skinRgb.b - 15), 255, false);

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

  // Torso Base: (16, 16) to (40, 32)
  fillRect(16, 16, 39, 31, skinRgb.r, skinRgb.g, skinRgb.b);

  // Right Leg Base: (0, 16) to (15, 32)
  fillRect(0, 16, 15, 31, skinRgb.r, skinRgb.g, skinRgb.b);

  // Left Leg Base: (16, 48) to (31, 64)
  fillRect(16, 48, 31, 63, skinRgb.r, skinRgb.g, skinRgb.b);

  // Arms Base depending on Steve vs Alex
  if (isAlex) {
    // Alex right arm base: (40, 16) to (54, 32)
    fillRect(40, 16, 54, 31, skinRgb.r, skinRgb.g, skinRgb.b);
    // Alex left arm base: (32, 46) to (46, 62)
    fillRect(32, 46, 46, 61, skinRgb.r, skinRgb.g, skinRgb.b);
  } else {
    // Steve right arm base: (40, 16) to (55, 32)
    fillRect(40, 16, 55, 31, skinRgb.r, skinRgb.g, skinRgb.b);
    // Steve left arm base: (32, 48) to (47, 64)
    fillRect(32, 48, 47, 63, skinRgb.r, skinRgb.g, skinRgb.b);
  }

  // --- 2. OVERLAY THE INSTITUTIONAL UNIFORM STENCIL ---

  const stencil: Stencil = STENCILS[stencilKey] || STUDENT_HOODIE_STENCIL;

  for (const region of stencil.regions) {
    // Get colors mapping to the type
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

    // If it's an arm sleeve region, handle Alex arm adjustment
    if (isAlex && region.name.includes("Sleeve")) {
      // Alex sleeve overlays are slightly smaller (3px instead of 4px wide)
      if (region.name.includes("Right Sleeve")) {
        // Right sleeve overlay coordinates for Alex are x in [40, 54], y in [32, 47]
        const adjustedX2 = Math.min(region.x2, 54);
        fillRect(region.x1, region.y1, adjustedX2, region.y2, rgb.r, rgb.g, rgb.b);
      } else if (region.name.includes("Left Sleeve")) {
        // Left sleeve overlay coordinates for Alex are x in [48, 62], y in [48, 63]
        const adjustedX2 = Math.min(region.x2, 62);
        fillRect(region.x1, region.y1, adjustedX2, region.y2, rgb.r, rgb.g, rgb.b);
      } else {
        fillRect(region.x1, region.y1, region.x2, region.y2, rgb.r, rgb.g, rgb.b);
      }
    } else {
      fillRect(region.x1, region.y1, region.x2, region.y2, rgb.r, rgb.g, rgb.b);
    }
  }

  // Draw boots/shoes on leg bases (as decorative default elements)
  const shoeRgb = hexToRgb("#302015");
  // Right boot on bottom of Right Leg (0, 16)-(15, 32). Bottom is y=31
  fillRect(0, 30, 15, 31, shoeRgb.r, shoeRgb.g, shoeRgb.b);
  // Left boot on bottom of Left Leg (16, 48)-(31, 64). Bottom is y=63
  fillRect(16, 62, 31, 63, shoeRgb.r, shoeRgb.g, shoeRgb.b);

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
