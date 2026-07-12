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
      { x1: 20, y1: 16, x2: 21, y2: 19 },
      { x1: 26, y1: 16, x2: 27, y2: 19 },
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
  },
  "long-straight": {
    name: "Long Straight",
    vibe: 'feminine',
    rects: [
      { x1: 24, y1: 8, x2: 31, y2: 15 },
      { x1: 7, y1: 10, x2: 7, y2: 15 },
      { x1: 16, y1: 10, x2: 16, y2: 15 },
      { x1: 20, y1: 16, x2: 21, y2: 21 },
      { x1: 26, y1: 16, x2: 27, y2: 21 },
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
