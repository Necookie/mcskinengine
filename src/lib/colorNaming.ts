/**
 * Shared color-naming and HSV-bucketing helpers.
 *
 * The bucket boundaries mirror scripts/extract_features.py's
 * categorize_hue/brightness/saturation so that categories computed here
 * line up with any data reprocessed by the Python pipeline.
 */

export const NAMED_COLORS: Record<string, string> = {
  red: "#cc0000", crimson: "#dc143c", scarlet: "#ff2400", ruby: "#9b111e", maroon: "#800000",
  blue: "#3366cc", navy: "#000080", azure: "#007fff", cyan: "#00ffff", teal: "#008080",
  green: "#339933", emerald: "#50c878", lime: "#32cd32", olive: "#808000", forest: "#228b22",
  yellow: "#cccc00", gold: "#ffd700", amber: "#ffbf00", mustard: "#ffdb58",
  purple: "#9933cc", violet: "#8f00ff", lavender: "#e6e6fa", plum: "#dda0dd", mauve: "#e0b0ff",
  pink: "#ff66cc", rose: "#ff007f", magenta: "#ff00ff", fuchsia: "#ff00ff",
  orange: "#ff9933", coral: "#ff7f50", peach: "#ffe5b4", tangerine: "#ff9966",
  brown: "#8b4513", tan: "#d2b48c", beige: "#f5f5dc", chocolate: "#7b3f00", coffee: "#6f4e37",
  black: "#1a1a1a", charcoal: "#36454f",
  white: "#ffffff", ivory: "#fffff0", cream: "#fffdd0",
  gray: "#808080", silver: "#c0c0c0",
};

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return [h, s, v];
}

/** Nearest named color to a hex value, by squared RGB distance. */
export function nearestColorName(hex: string): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return "neutral";
  const [r, g, b] = hexToRgb(hex);
  let best = "neutral";
  let bestDist = Infinity;
  for (const [name, candidate] of Object.entries(NAMED_COLORS)) {
    const [cr, cg, cb] = hexToRgb(candidate);
    const dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = name;
    }
  }
  return best;
}

export function categorizeHue(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s] = rgbToHsv(r, g, b);
  // Hue is meaningless for near-grayscale colors (black/white/gray) — without
  // this they'd fall through to "red" (hue defaults to 0), silently polluting
  // every red-clothing match with black and white items.
  if (s < 0.15) return "neutral";
  if (h < 0.02 || h > 0.98) return "red";
  if (h < 0.08) return "orange";
  if (h < 0.18) return "yellow";
  if (h < 0.42) return "green";
  if (h < 0.52) return "cyan";
  if (h < 0.70) return "blue";
  if (h < 0.85) return "purple";
  return "pink";
}

export function categorizeBrightness(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const [, , v] = rgbToHsv(r, g, b);
  if (v < 0.3) return "dark";
  if (v < 0.7) return "medium";
  return "light";
}

export function categorizeSaturation(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const [, s] = rgbToHsv(r, g, b);
  if (s < 0.3) return "muted";
  if (s < 0.7) return "moderate";
  return "vivid";
}
