export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
}

export const PALETTE_PRESETS: ColorPalette[] = [
  {
    id: "voxel",
    name: "Studio Voxel",
    colors: [
      "#1c1c1d", "#ffffff", "#ff2a85", "#b3d7df", "#ebd3be",
      "#f1e4d3", "#d2ebd9", "#704732", "#f3d0bc", "#e02424",
      "#eab308", "#22c55e", "#3b82f6", "#a855f7"
    ]
  },
  {
    id: "biome",
    name: "Biome & Earth",
    colors: [
      "#38271d", "#5c4033", "#866043", "#a88563", "#3a5f0b",
      "#557a2b", "#7fa238", "#596167", "#768087", "#9ea7ad",
      "#3b6f84", "#619bb3", "#d4c4a8", "#efe5d3"
    ]
  },
  {
    id: "retro",
    name: "8-Bit Arcade",
    colors: [
      "#0f380f", "#306230", "#8bac0f", "#9bbc0f", "#2c1e40",
      "#5a3286", "#9b51e0", "#e056fd", "#00d2d3", "#ff6b6b",
      "#feca57", "#ff9ff3", "#54a0ff", "#1dd1a1"
    ]
  },
  {
    id: "pastel",
    name: "Pastel & Skin",
    colors: [
      "#3d2314", "#663d23", "#a06c4a", "#c69472", "#e2b897",
      "#f5d6bd", "#ffdfdf", "#fce4ec", "#e8eaf6", "#e1f5fe",
      "#e8f5e9", "#fffde7", "#fff3e0", "#efebe9"
    ]
  }
];
