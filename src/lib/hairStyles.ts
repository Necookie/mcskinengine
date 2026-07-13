export interface HairRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Hue-shift offset relative to the base hair color (e.g. -30 for shaved sides). */
  shade?: number;
}

export interface HairStyle {
  name: string;
  rects: HairRect[];
  vibe: 'masculine' | 'feminine' | 'neutral';
  /**
   * Optional strands drawn on the head's second/hat UV layer (32,0-63,15).
   * Rendered slightly offset from the base head in-game, giving hair a
   * subtle 3D "poof" over the forehead/sides instead of reading as flat.
   * Skipped automatically when the outfit stencil already claims the hat
   * layer (e.g. a hoodie hood).
   */
  hatRects?: HairRect[];
  /**
   * Long strands that drape down over the front of the torso/shoulders.
   * Drawn dead last, after the outfit's base layer AND overlay garment
   * regions, so hair actually appears in front of the clothing instead
   * of being silently painted over by the torso fill that runs right
   * after the early hair pass.
   */
  shoulderRects?: HairRect[];
}

// Base "helmet" fill shared by every style: back, left, right, and top of the head.
export const HAIR_BASE: HairRect[] = [
  { x1: 8, y1: 0, x2: 15, y2: 7 },
  { x1: 0, y1: 0, x2: 7, y2: 7 },
  { x1: 16, y1: 0, x2: 23, y2: 7 },
  { x1: 24, y1: 8, x2: 31, y2: 15 },
  { x1: 0, y1: 8, x2: 7, y2: 11 },
  { x1: 16, y1: 8, x2: 23, y2: 11 },
];

export const HAIR_STYLES: Record<string, HairStyle> = {
  "messy-fringe": {
    name: "Messy Fringe",
    vibe: 'neutral',
    rects: [
      { x1: 8, y1: 8, x2: 15, y2: 9 },
      { x1: 9, y1: 10, x2: 10, y2: 10 },
      { x1: 13, y1: 10, x2: 14, y2: 10 },
      { x1: 7, y1: 10, x2: 7, y2: 12 },
      { x1: 16, y1: 10, x2: 16, y2: 12 },
    ],
    hatRects: [
      { x1: 40, y1: 8, x2: 47, y2: 8 },
      { x1: 41, y1: 9, x2: 42, y2: 9, shade: -10 },
      { x1: 45, y1: 9, x2: 46, y2: 9 },
    ],
  },
  undercut: {
    name: "Undercut",
    vibe: 'masculine',
    rects: [
      { x1: 0, y1: 10, x2: 7, y2: 15, shade: -30 },
      { x1: 16, y1: 10, x2: 23, y2: 15, shade: -30 },
      { x1: 8, y1: 8, x2: 15, y2: 8 },
    ],
  },
  "long-curly": {
    name: "Long Curly",
    vibe: 'neutral',
    rects: [
      { x1: 24, y1: 8, x2: 31, y2: 15 },
      { x1: 8, y1: 8, x2: 15, y2: 9 },
      { x1: 8, y1: 10, x2: 8, y2: 12 },
      { x1: 15, y1: 10, x2: 15, y2: 12 },
    ],
    hatRects: [
      { x1: 40, y1: 8, x2: 47, y2: 9 },
      { x1: 48, y1: 8, x2: 49, y2: 12 },
      { x1: 38, y1: 8, x2: 39, y2: 12 },
      { x1: 56, y1: 8, x2: 63, y2: 11 },
    ],
    shoulderRects: [
      // Front torso face is x20-27,y20-31; the old y16-19 coordinates were
      // the barely-visible shoulder-TOP surface, not the chest front.
      { x1: 20, y1: 20, x2: 21, y2: 25, shade: -8 },
      { x1: 26, y1: 20, x2: 27, y2: 25, shade: 8 },
    ],
  },
  "parted-curtains": {
    name: "Parted Curtains",
    vibe: 'masculine',
    rects: [
      { x1: 8, y1: 8, x2: 9, y2: 10 },
      { x1: 14, y1: 8, x2: 15, y2: 10 },
      { x1: 10, y1: 8, x2: 13, y2: 8 },
      { x1: 7, y1: 10, x2: 7, y2: 11 },
      { x1: 16, y1: 10, x2: 16, y2: 11 },
    ],
  },
  "short-spiky": {
    name: "Short Spiky",
    vibe: 'masculine',
    rects: [
      { x1: 8, y1: 8, x2: 15, y2: 8 },
      { x1: 9, y1: 9, x2: 9, y2: 9 },
      { x1: 11, y1: 9, x2: 11, y2: 9 },
      { x1: 13, y1: 9, x2: 13, y2: 9 },
      { x1: 15, y1: 9, x2: 15, y2: 9 },
    ],
  },
  ponytail: {
    name: "Ponytail",
    vibe: 'feminine',
    rects: [
      { x1: 8, y1: 8, x2: 15, y2: 8 },
      { x1: 24, y1: 8, x2: 31, y2: 15 },
      { x1: 26, y1: 16, x2: 27, y2: 19, shade: 10 },
    ],
    hatRects: [
      { x1: 56, y1: 8, x2: 61, y2: 12, shade: 6 },
    ],
  },
  "twin-braids": {
    name: "Twin Braids",
    vibe: 'feminine',
    rects: [
      { x1: 8, y1: 8, x2: 9, y2: 10 },
      { x1: 14, y1: 8, x2: 15, y2: 10 },
      { x1: 10, y1: 8, x2: 13, y2: 8 },
      { x1: 7, y1: 10, x2: 7, y2: 15, shade: 5 },
      { x1: 16, y1: 10, x2: 16, y2: 15, shade: -5 },
      { x1: 20, y1: 16, x2: 20, y2: 19, shade: 5 },
      { x1: 27, y1: 16, x2: 27, y2: 19, shade: -5 },
    ],
    hatRects: [
      { x1: 48, y1: 10, x2: 48, y2: 15, shade: 5 },
      { x1: 39, y1: 10, x2: 39, y2: 15, shade: -5 },
    ],
  },
  "long-straight": {
    name: "Long Straight",
    vibe: 'feminine',
    rects: [
      { x1: 24, y1: 8, x2: 31, y2: 15 },
      // Full uneven fringe: every forehead column gets hair, with varied
      // lengths (deepest at the outer edges, shortest at the center part)
      // so the hairline reads as individual locks instead of a bald
      // forehead with two corner wisps. Ends at y=10; eyes start at y=11.
      { x1: 8, y1: 8, x2: 8, y2: 10, shade: -6 },
      { x1: 9, y1: 8, x2: 9, y2: 9 },
      { x1: 10, y1: 8, x2: 10, y2: 10, shade: -10 },
      { x1: 11, y1: 8, x2: 11, y2: 8, shade: 8 },
      { x1: 12, y1: 8, x2: 12, y2: 9 },
      { x1: 13, y1: 8, x2: 13, y2: 8, shade: 8 },
      { x1: 14, y1: 8, x2: 14, y2: 10, shade: -6 },
      { x1: 15, y1: 8, x2: 15, y2: 9 },
      // Side strands framing the cheeks down to the jaw.
      { x1: 7, y1: 9, x2: 7, y2: 15, shade: -6 },
      { x1: 8, y1: 11, x2: 8, y2: 13, shade: -10 },
      { x1: 16, y1: 9, x2: 16, y2: 15, shade: 6 },
      { x1: 15, y1: 11, x2: 15, y2: 13, shade: 10 },
    ],
    hatRects: [
      { x1: 48, y1: 8, x2: 48, y2: 15 },
      { x1: 39, y1: 8, x2: 39, y2: 15 },
      { x1: 56, y1: 8, x2: 63, y2: 13, shade: -8 },
      { x1: 40, y1: 8, x2: 47, y2: 8, shade: 12 },
    ],
    shoulderRects: [
      // Front torso face is x20-27,y20-31; draped down to mid-chest with
      // the two sides hue-shifted apart so the strands read as separate.
      { x1: 20, y1: 20, x2: 21, y2: 27, shade: -8 },
      { x1: 26, y1: 20, x2: 27, y2: 27, shade: 8 },
    ],
  },
  bob: {
    name: "Bob",
    vibe: 'neutral',
    rects: [
      { x1: 8, y1: 8, x2: 15, y2: 9 },
      { x1: 0, y1: 10, x2: 7, y2: 13 },
      { x1: 16, y1: 10, x2: 23, y2: 13 },
    ],
    hatRects: [
      { x1: 48, y1: 8, x2: 55, y2: 11 },
      { x1: 32, y1: 8, x2: 39, y2: 11 },
      { x1: 40, y1: 8, x2: 47, y2: 8 },
    ],
  },
  "buzz-cut": {
    name: "Buzz Cut",
    vibe: 'masculine',
    rects: [
      { x1: 8, y1: 0, x2: 15, y2: 7, shade: -25 },
      { x1: 0, y1: 0, x2: 7, y2: 7, shade: -25 },
      { x1: 16, y1: 0, x2: 23, y2: 7, shade: -25 },
      { x1: 24, y1: 8, x2: 31, y2: 15, shade: -25 },
      { x1: 0, y1: 8, x2: 7, y2: 11, shade: -25 },
      { x1: 16, y1: 8, x2: 23, y2: 11, shade: -25 },
      { x1: 8, y1: 8, x2: 15, y2: 8, shade: -25 },
    ],
  },
  "side-part": {
    name: "Side Part",
    vibe: 'masculine',
    rects: [
      { x1: 8, y1: 8, x2: 15, y2: 8 },
      { x1: 8, y1: 9, x2: 11, y2: 9 },
      { x1: 12, y1: 9, x2: 12, y2: 9, shade: -15 },
    ],
  },
};

export const HAIR_STYLE_KEYS = Object.keys(HAIR_STYLES);
