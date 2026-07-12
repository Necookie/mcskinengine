export const ACCESSORY_KEYS = [
  "glasses",
  "headphones",
  "mask",
  "beard",
  "eyebrows",
  "freckles",
  "blush",
  "lipstick",
  "earrings",
] as const;

export type AccessoryKey = (typeof ACCESSORY_KEYS)[number];
