import { applyHueShift, clamp } from "./shading";

export interface EyeDrawCtx {
  setPixel: (x: number, y: number, r: number, g: number, b: number, a?: number, applyShade?: boolean) => void;
  fillRect: (x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, a?: number, isSkin?: boolean) => void;
  eyeRgb: { r: number; g: number; b: number };
  skinRgb: { r: number; g: number; b: number };
}

export interface EyeStyle {
  name: string;
  vibe: 'masculine' | 'feminine' | 'neutral';
  draw: (ctx: EyeDrawCtx) => void;
}

export const EYE_STYLES: Record<string, EyeStyle> = {
  "cool-highlight": {
    name: "Cool Highlight",
    vibe: 'neutral',
    draw: ({ setPixel, fillRect, eyeRgb, skinRgb }) => {
      setPixel(9, 12, 255, 255, 255, 255, false);
      setPixel(10, 12, 255, 255, 255, 255, false);
      setPixel(13, 12, 255, 255, 255, 255, false);
      setPixel(14, 12, 255, 255, 255, 255, false);

      setPixel(11, 12, eyeRgb.r, eyeRgb.g, eyeRgb.b, 255, false);
      setPixel(11, 13, clamp(eyeRgb.r - 20), clamp(eyeRgb.g - 20), clamp(eyeRgb.b - 20), 255, false);
      setPixel(12, 12, eyeRgb.r, eyeRgb.g, eyeRgb.b, 255, false);
      setPixel(12, 13, clamp(eyeRgb.r - 20), clamp(eyeRgb.g - 20), clamp(eyeRgb.b - 20), 255, false);

      setPixel(10, 12, 255, 255, 255, 220, false);
      setPixel(13, 12, 255, 255, 255, 220, false);
      fillRect(9, 11, 14, 11, clamp(skinRgb.r - 35), clamp(skinRgb.g - 45), clamp(skinRgb.b - 45), 255, true);
    },
  },
  "shadow-2x2": {
    name: "Shadow 2x2",
    vibe: 'masculine',
    draw: ({ setPixel, fillRect, eyeRgb }) => {
      fillRect(10, 12, 11, 13, clamp(eyeRgb.r - 30), clamp(eyeRgb.g - 30), clamp(eyeRgb.b - 30), 255);
      fillRect(13, 12, 14, 13, clamp(eyeRgb.r - 30), clamp(eyeRgb.g - 30), clamp(eyeRgb.b - 30), 255);
      setPixel(9, 12, 255, 255, 255, 255, false);
      setPixel(12, 12, 255, 255, 255, 255, false);
    },
  },
  "anime-glowing": {
    name: "Anime Glowing",
    vibe: 'feminine',
    draw: ({ setPixel, fillRect, eyeRgb }) => {
      const bright = applyHueShift(eyeRgb.r, eyeRgb.g, eyeRgb.b, 40, false);
      fillRect(10, 12, 11, 12, bright.r, bright.g, bright.b, 255, false);
      fillRect(13, 12, 14, 12, bright.r, bright.g, bright.b, 255, false);
      setPixel(9, 12, 255, 255, 255, 255, false);
      setPixel(12, 12, 255, 255, 255, 255, false);
    },
  },
  "classic-simple": {
    name: "Classic Simple",
    vibe: 'neutral',
    draw: ({ setPixel, eyeRgb }) => {
      setPixel(10, 12, 255, 255, 255, 255, false);
      setPixel(11, 12, eyeRgb.r, eyeRgb.g, eyeRgb.b, 255, false);
      setPixel(13, 12, eyeRgb.r, eyeRgb.g, eyeRgb.b, 255, false);
      setPixel(14, 12, 255, 255, 255, 255, false);
    },
  },
  "long-lashes": {
    name: "Long Lashes",
    vibe: 'feminine',
    draw: ({ setPixel, fillRect, eyeRgb }) => {
      fillRect(10, 12, 11, 13, eyeRgb.r, eyeRgb.g, eyeRgb.b, 255, false);
      fillRect(13, 12, 14, 13, eyeRgb.r, eyeRgb.g, eyeRgb.b, 255, false);
      setPixel(9, 12, 255, 255, 255, 255, false);
      setPixel(12, 12, 255, 255, 255, 255, false);
      setPixel(9, 11, 20, 15, 15, 255, false);
      setPixel(10, 11, 20, 15, 15, 255, false);
      setPixel(13, 11, 20, 15, 15, 255, false);
      setPixel(14, 11, 20, 15, 15, 255, false);
      setPixel(8, 11, 20, 15, 15, 255, false);
      setPixel(15, 11, 20, 15, 15, 255, false);
    },
  },
  "soft-round": {
    name: "Soft Round",
    vibe: 'feminine',
    draw: ({ setPixel, fillRect, eyeRgb, skinRgb }) => {
      fillRect(10, 12, 11, 13, eyeRgb.r, eyeRgb.g, eyeRgb.b, 255, false);
      fillRect(13, 12, 14, 13, eyeRgb.r, eyeRgb.g, eyeRgb.b, 255, false);
      setPixel(10, 12, 255, 255, 255, 230, false);
      setPixel(13, 12, 255, 255, 255, 230, false);
      fillRect(9, 14, 14, 14, clamp(skinRgb.r - 15), clamp(skinRgb.g - 20), clamp(skinRgb.b - 20), 255, true);
    },
  },
  "narrow-serious": {
    name: "Narrow Serious",
    vibe: 'masculine',
    draw: ({ setPixel, eyeRgb }) => {
      setPixel(9, 12, clamp(eyeRgb.r - 10), clamp(eyeRgb.g - 10), clamp(eyeRgb.b - 10), 255, false);
      setPixel(10, 12, eyeRgb.r, eyeRgb.g, eyeRgb.b, 255, false);
      setPixel(13, 12, eyeRgb.r, eyeRgb.g, eyeRgb.b, 255, false);
      setPixel(14, 12, clamp(eyeRgb.r - 10), clamp(eyeRgb.g - 10), clamp(eyeRgb.b - 10), 255, false);
      setPixel(9, 11, 15, 12, 12, 255, false);
      setPixel(10, 11, 15, 12, 12, 255, false);
      setPixel(13, 11, 15, 12, 12, 255, false);
      setPixel(14, 11, 15, 12, 12, 255, false);
    },
  },
};

export const EYE_STYLE_KEYS = Object.keys(EYE_STYLES);
