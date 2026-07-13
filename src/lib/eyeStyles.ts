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

type RGB = { r: number; g: number; b: number };

/**
 * Draws one eye as a single-pixel-wide VERTICAL column (tall, not wide).
 * At this pixel budget a horizontal pair of blocks with bright top corners
 * reads as a pair of glasses lenses; a narrow vertical strip with a light
 * top / darker bottom reads as an eye instead. `height` is 2 or 3 rows.
 * No black outline/pupil is drawn — depth comes purely from the tonal
 * ramp within the eye's own hue, not from an added dark stroke.
 */
function verticalEye(setPixel: EyeDrawCtx['setPixel'], cx: number, topY: number, eyeRgb: RGB, height: 2 | 3, glossy: boolean = true) {
  const top = glossy ? applyHueShift(eyeRgb.r, eyeRgb.g, eyeRgb.b, 50, false) : eyeRgb;
  const bottom = { r: clamp(eyeRgb.r - 30), g: clamp(eyeRgb.g - 30), b: clamp(eyeRgb.b - 30) };

  if (height === 3) {
    setPixel(cx, topY, top.r, top.g, top.b, 255, false);
    setPixel(cx, topY + 1, eyeRgb.r, eyeRgb.g, eyeRgb.b, 255, false);
    setPixel(cx, topY + 2, bottom.r, bottom.g, bottom.b, 255, false);
  } else {
    setPixel(cx, topY, glossy ? top.r : eyeRgb.r, glossy ? top.g : eyeRgb.g, glossy ? top.b : eyeRgb.b, 255, false);
    setPixel(cx, topY + 1, bottom.r, bottom.g, bottom.b, 255, false);
  }
}

// Left eye sits at x=10, right eye at x=13 for every style below, leaving
// x=11-12 (the nose bridge) untouched. Nothing is ever drawn as a single
// shape spanning both eyes (no continuous brow/frame bar) so the pair
// reads as two eyes, not a pair of glasses.
const LEFT_X = 10;
const RIGHT_X = 13;

export const EYE_STYLES: Record<string, EyeStyle> = {
  "cool-highlight": {
    name: "Cool Highlight",
    vibe: 'neutral',
    draw: ({ setPixel, eyeRgb }) => {
      verticalEye(setPixel, LEFT_X, 11, eyeRgb, 3);
      verticalEye(setPixel, RIGHT_X, 11, eyeRgb, 3);
    },
  },
  "shadow-2x2": {
    name: "Shadow 2x2",
    vibe: 'masculine',
    draw: ({ setPixel, eyeRgb }) => {
      const deep = { r: clamp(eyeRgb.r - 15), g: clamp(eyeRgb.g - 15), b: clamp(eyeRgb.b - 15) };
      verticalEye(setPixel, LEFT_X, 12, deep, 2, false);
      verticalEye(setPixel, RIGHT_X, 12, deep, 2, false);
      // Short brow dash above each eye independently, never connected.
      setPixel(LEFT_X, 10, 30, 25, 22, 255, false);
      setPixel(RIGHT_X, 10, 30, 25, 22, 255, false);
    },
  },
  "anime-glowing": {
    name: "Anime Glowing",
    vibe: 'feminine',
    draw: ({ setPixel, eyeRgb, skinRgb }) => {
      const bright = applyHueShift(eyeRgb.r, eyeRgb.g, eyeRgb.b, 45, false);
      verticalEye(setPixel, LEFT_X, 11, bright, 3);
      verticalEye(setPixel, RIGHT_X, 11, bright, 3);
      // A single soft glow pixel on the outer side of each eye, blended
      // toward skin tone (not a hard white dot) for an emissive read.
      const halo = {
        r: Math.round((skinRgb.r + bright.r) / 2),
        g: Math.round((skinRgb.g + bright.g) / 2),
        b: Math.round((skinRgb.b + bright.b) / 2),
      };
      setPixel(LEFT_X - 1, 12, halo.r, halo.g, halo.b, 255, false);
      setPixel(RIGHT_X + 1, 12, halo.r, halo.g, halo.b, 255, false);
    },
  },
  "classic-simple": {
    name: "Classic Simple",
    vibe: 'neutral',
    draw: ({ setPixel, eyeRgb }) => {
      verticalEye(setPixel, LEFT_X, 12, eyeRgb, 2, false);
      verticalEye(setPixel, RIGHT_X, 12, eyeRgb, 2, false);
    },
  },
  "long-lashes": {
    name: "Long Lashes",
    vibe: 'feminine',
    draw: ({ setPixel, fillRect, eyeRgb, skinRgb }) => {
      verticalEye(setPixel, LEFT_X, 11, eyeRgb, 3);
      verticalEye(setPixel, RIGHT_X, 11, eyeRgb, 3);
      // Outward lash flick, one per eye, on the outer side only.
      setPixel(LEFT_X - 1, 10, 30, 24, 22, 255, false);
      setPixel(RIGHT_X + 1, 10, 30, 24, 22, 255, false);
      // Soft under-eye shadow, per eye, not a bar spanning the bridge.
      fillRect(LEFT_X, 14, LEFT_X, 14, clamp(skinRgb.r - 15), clamp(skinRgb.g - 18), clamp(skinRgb.b - 18), 255, true);
      fillRect(RIGHT_X, 14, RIGHT_X, 14, clamp(skinRgb.r - 15), clamp(skinRgb.g - 18), clamp(skinRgb.b - 18), 255, true);
    },
  },
  "soft-round": {
    name: "Soft Round",
    vibe: 'feminine',
    draw: ({ setPixel, eyeRgb, skinRgb }) => {
      const top = applyHueShift(eyeRgb.r, eyeRgb.g, eyeRgb.b, 45, false);
      const fade = {
        r: Math.round((eyeRgb.r + skinRgb.r) / 2),
        g: Math.round((eyeRgb.g + skinRgb.g) / 2),
        b: Math.round((eyeRgb.b + skinRgb.b) / 2),
      };
      for (const cx of [LEFT_X, RIGHT_X]) {
        setPixel(cx, 11, top.r, top.g, top.b, 255, false);
        setPixel(cx, 12, eyeRgb.r, eyeRgb.g, eyeRgb.b, 255, false);
        setPixel(cx, 13, fade.r, fade.g, fade.b, 255, false);
      }
    },
  },
  "narrow-serious": {
    name: "Narrow Serious",
    vibe: 'masculine',
    draw: ({ setPixel, eyeRgb }) => {
      const dark = { r: clamp(eyeRgb.r - 15), g: clamp(eyeRgb.g - 15), b: clamp(eyeRgb.b - 15) };
      verticalEye(setPixel, LEFT_X, 12, dark, 2, false);
      verticalEye(setPixel, RIGHT_X, 12, dark, 2, false);
      setPixel(LEFT_X, 10, 20, 16, 14, 255, false);
      setPixel(RIGHT_X, 10, 20, 16, 14, 255, false);
    },
  },
};

export const EYE_STYLE_KEYS = Object.keys(EYE_STYLES);
