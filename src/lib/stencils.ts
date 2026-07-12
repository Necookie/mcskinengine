import { PatternType } from "./shading";

export interface StencilRegion {
  name: string;
  x1: number;
  y1: number;
  x2: number; // inclusive
  y2: number; // inclusive
  colorType: 'primary' | 'secondary' | 'trim' | 'shirt' | 'tie' | 'pants' | 'skin' | 'hair' | 'eyes' | 'accent';
  overlay?: boolean;
}

export interface Stencil {
  name: string;
  regions: StencilRegion[];
  /** What the torso base layer (under the overlay regions) is filled with. */
  baseTorso: 'skin' | 'primary' | 'secondary' | 'shirt';
  /** What the arm base layer (under the overlay regions) is filled with. */
  baseSleeve: 'skin' | 'primary' | 'secondary' | 'shirt';
  sleeveLength: 'long' | 'short' | 'none';
  legStyle: 'pants' | 'shorts' | 'skirt' | 'bare';
  /** Cloth pattern used when the caller doesn't request a specific detailTexture. */
  defaultPattern: PatternType;
  /** Style-axis metadata used for LLM prompt guidance/defaults, never a hard gate. */
  vibe: 'masculine' | 'feminine' | 'neutral';
  shoeStyle?: 'boots' | 'sneakers' | 'flats' | 'none';
  baseTie?: boolean;
}

// Coordinate definitions for Minecraft skins
// Torso overlay: (16,32) to (40,48)
// Right sleeve: (40,32) to (56,48)
// Left sleeve: (48,48) to (64,64)
// Pants overlay: (0,32) to (16,48) and (0,48) to (16,64)
// Hat / Hood overlay: (32,0) to (64,16)

export const STUDENT_HOODIE_STENCIL: Stencil = {
  name: "Casual Student Hoodie",
  baseTorso: 'primary',
  baseSleeve: 'primary',
  sleeveLength: 'long',
  legStyle: 'pants',
  defaultPattern: 'knit',
  vibe: 'neutral',
  shoeStyle: 'sneakers',
  regions: [
    // Hoodie Hood (Hat Overlay) - split to keep the face open
    { name: "Hood Top", x1: 40, y1: 0, x2: 47, y2: 7, colorType: "primary", overlay: true },
    { name: "Hood Bottom", x1: 48, y1: 0, x2: 55, y2: 7, colorType: "primary", overlay: true },
    { name: "Hood Right Side", x1: 32, y1: 8, x2: 39, y2: 15, colorType: "primary", overlay: true },
    { name: "Hood Left Side", x1: 48, y1: 8, x2: 55, y2: 15, colorType: "primary", overlay: true },
    { name: "Hood Back", x1: 56, y1: 8, x2: 63, y2: 15, colorType: "primary", overlay: true },
    { name: "Hood Front Rim Top", x1: 40, y1: 8, x2: 47, y2: 8, colorType: "primary", overlay: true },
    { name: "Hood Front Rim Left", x1: 40, y1: 9, x2: 40, y2: 15, colorType: "primary", overlay: true },
    { name: "Hood Front Rim Right", x1: 47, y1: 9, x2: 47, y2: 15, colorType: "primary", overlay: true },
    
    // Hoodie Torso Overlay
    { name: "Hoodie Torso", x1: 16, y1: 32, x2: 39, y2: 47, colorType: "primary", overlay: true },
    
    // Hoodie Pocket (Secondary Accent on Torso front)
    { name: "Hoodie Pocket", x1: 22, y1: 42, x2: 25, y2: 45, colorType: "secondary", overlay: true },
    
    // Hoodie Drawstrings (Trim)
    { name: "Drawstring Left", x1: 21, y1: 36, x2: 21, y2: 38, colorType: "trim", overlay: true },
    { name: "Drawstring Right", x1: 26, y1: 36, x2: 26, y2: 38, colorType: "trim", overlay: true },
    
    // Sleeves (Sleeve Overlays)
    { name: "Right Sleeve", x1: 40, y1: 32, x2: 55, y2: 47, colorType: "primary", overlay: true },
    { name: "Left Sleeve", x1: 48, y1: 48, x2: 63, y2: 63, colorType: "primary", overlay: true },
    
    // Sleeve cuffs (Secondary)
    { name: "Right Cuff", x1: 40, y1: 46, x2: 55, y2: 47, colorType: "secondary", overlay: true },
    { name: "Left Cuff", x1: 48, y1: 62, x2: 63, y2: 63, colorType: "secondary", overlay: true },
 
    // Pants (Pants overlays)
    { name: "Right Pants", x1: 0, y1: 32, x2: 15, y2: 47, colorType: "pants", overlay: true },
    { name: "Left Pants", x1: 0, y1: 48, x2: 15, y2: 63, colorType: "pants", overlay: true }
  ]
};

export const TWEED_BLAZER_STENCIL: Stencil = {
  name: "Professor Tweed Blazer",
  baseTorso: 'shirt',
  baseSleeve: 'shirt',
  sleeveLength: 'long',
  legStyle: 'pants',
  defaultPattern: 'tweed',
  vibe: 'masculine',
  shoeStyle: 'boots',
  baseTie: true,
  regions: [
    // Blazer Jacket on Torso Overlay (Tweed color)
    { name: "Blazer Torso", x1: 16, y1: 32, x2: 39, y2: 47, colorType: "primary", overlay: true },
    
    // Shirt Collar & V-Neck cut (Shirt color)
    { name: "Shirt Collar Front", x1: 23, y1: 34, x2: 24, y2: 36, colorType: "shirt", overlay: true },
    { name: "Shirt Collar Front Wide", x1: 22, y1: 32, x2: 25, y2: 33, colorType: "shirt", overlay: true },

    // Neck Tie (Tie color)
    { name: "Tie Knot", x1: 23, y1: 33, x2: 24, y2: 33, colorType: "tie", overlay: true },
    { name: "Tie Tail", x1: 23, y1: 34, x2: 23, y2: 38, colorType: "tie", overlay: true },
    
    // Blazer Sleeves (Primary tweed color) - MUST come before elbow patches
    { name: "Right Sleeve Blazer", x1: 40, y1: 32, x2: 55, y2: 47, colorType: "primary", overlay: true },
    { name: "Left Sleeve Blazer", x1: 48, y1: 48, x2: 63, y2: 63, colorType: "primary", overlay: true },

    // Elbow patches on sleeves (Trim color) - drawn AFTER sleeves so they're visible
    { name: "Right Elbow Patch", x1: 41, y1: 38, x2: 42, y2: 40, colorType: "trim", overlay: true },
    { name: "Left Elbow Patch", x1: 49, y1: 54, x2: 50, y2: 56, colorType: "trim", overlay: true },

    // Blazer Buttons (Gold/Secondary)
    { name: "Button Top", x1: 22, y1: 38, x2: 22, y2: 38, colorType: "secondary", overlay: true },
    { name: "Button Bottom", x1: 22, y1: 41, x2: 22, y2: 41, colorType: "secondary", overlay: true },

    // Pants (Pants color - dark brown/black)
    { name: "Right Pants", x1: 0, y1: 32, x2: 15, y2: 47, colorType: "pants", overlay: true },
    { name: "Left Pants", x1: 0, y1: 48, x2: 15, y2: 63, colorType: "pants", overlay: true }
  ]
};

export const LAB_COAT_STENCIL: Stencil = {
  name: "STEM Lab Coat",
  baseTorso: 'shirt',
  baseSleeve: 'shirt',
  sleeveLength: 'long',
  legStyle: 'pants',
  defaultPattern: 'none',
  vibe: 'neutral',
  shoeStyle: 'flats',
  regions: [
    // Lab Coat Torso Overlay (White)
    { name: "Lab Coat Torso", x1: 16, y1: 32, x2: 39, y2: 47, colorType: "primary", overlay: true },
    
    // Shirt underneath (Secondary/Blue)
    { name: "Shirt V-Neck", x1: 23, y1: 33, x2: 24, y2: 36, colorType: "shirt", overlay: true },
    
    // Pocket with Pens (Pocket is primary, pens are trim)
    { name: "Pocket Base", x1: 21, y1: 38, x2: 23, y2: 40, colorType: "primary", overlay: true },
    { name: "Pocket Pen Red", x1: 21, y1: 37, x2: 21, y2: 37, colorType: "trim", overlay: true },
    { name: "Pocket Pen Blue", x1: 22, y1: 37, x2: 22, y2: 37, colorType: "secondary", overlay: true },
    
    // Lab Coat Sleeves (White)
    { name: "Right Sleeve Coat", x1: 40, y1: 32, x2: 55, y2: 47, colorType: "primary", overlay: true },
    { name: "Left Sleeve Coat", x1: 48, y1: 48, x2: 63, y2: 63, colorType: "primary", overlay: true },
    
    // Wrist cuffs (Trim/Grey)
    { name: "Right Coat Cuff", x1: 40, y1: 46, x2: 55, y2: 47, colorType: "trim", overlay: true },
    { name: "Left Coat Cuff", x1: 48, y1: 62, x2: 63, y2: 63, colorType: "trim", overlay: true },

    // Pants (Pants color - dark grey/black)
    { name: "Right Pants", x1: 0, y1: 32, x2: 15, y2: 47, colorType: "pants", overlay: true },
    { name: "Left Pants", x1: 0, y1: 48, x2: 15, y2: 63, colorType: "pants", overlay: true }
  ]
};

export const CREWNECK_SWEATER_STENCIL: Stencil = {
  name: "Crewneck Sweater",
  baseTorso: 'primary',
  baseSleeve: 'primary',
  sleeveLength: 'long',
  legStyle: 'pants',
  defaultPattern: 'ribbed',
  vibe: 'neutral',
  shoeStyle: 'sneakers',
  regions: [
    { name: "Sweater Torso", x1: 16, y1: 32, x2: 39, y2: 47, colorType: "primary", overlay: true },
    // Crew collar band
    { name: "Collar Band", x1: 21, y1: 32, x2: 26, y2: 32, colorType: "trim", overlay: true },
    { name: "Sweater Right Sleeve", x1: 40, y1: 32, x2: 55, y2: 47, colorType: "primary", overlay: true },
    { name: "Sweater Left Sleeve", x1: 48, y1: 48, x2: 63, y2: 63, colorType: "primary", overlay: true },
    // Ribbed hem and cuffs (secondary)
    { name: "Hem", x1: 16, y1: 46, x2: 39, y2: 47, colorType: "secondary", overlay: true },
    { name: "Right Cuff", x1: 40, y1: 46, x2: 55, y2: 47, colorType: "secondary", overlay: true },
    { name: "Left Cuff", x1: 48, y1: 62, x2: 63, y2: 63, colorType: "secondary", overlay: true },
    { name: "Right Pants", x1: 0, y1: 32, x2: 15, y2: 47, colorType: "pants", overlay: true },
    { name: "Left Pants", x1: 0, y1: 48, x2: 15, y2: 63, colorType: "pants", overlay: true }
  ]
};

export const TRACKSUIT_STENCIL: Stencil = {
  name: "Athletic Tracksuit",
  baseTorso: 'primary',
  baseSleeve: 'primary',
  sleeveLength: 'long',
  legStyle: 'pants',
  defaultPattern: 'none',
  vibe: 'neutral',
  shoeStyle: 'sneakers',
  regions: [
    { name: "Tracksuit Torso", x1: 16, y1: 32, x2: 39, y2: 47, colorType: "primary", overlay: true },
    { name: "Side Stripe Left", x1: 16, y1: 32, x2: 17, y2: 47, colorType: "secondary", overlay: true },
    { name: "Side Stripe Right", x1: 38, y1: 32, x2: 39, y2: 47, colorType: "secondary", overlay: true },
    { name: "Zipper Line", x1: 27, y1: 32, x2: 28, y2: 47, colorType: "trim", overlay: true },
    { name: "Tracksuit Right Sleeve", x1: 40, y1: 32, x2: 55, y2: 47, colorType: "primary", overlay: true },
    { name: "Tracksuit Left Sleeve", x1: 48, y1: 48, x2: 63, y2: 63, colorType: "primary", overlay: true },
    { name: "Right Sleeve Stripe", x1: 40, y1: 32, x2: 55, y2: 33, colorType: "secondary", overlay: true },
    { name: "Left Sleeve Stripe", x1: 48, y1: 48, x2: 63, y2: 49, colorType: "secondary", overlay: true },
    { name: "Track Pants Right", x1: 0, y1: 32, x2: 15, y2: 47, colorType: "primary", overlay: true },
    { name: "Track Pants Left", x1: 0, y1: 48, x2: 15, y2: 63, colorType: "primary", overlay: true },
    { name: "Track Pants Right Stripe", x1: 0, y1: 32, x2: 1, y2: 47, colorType: "secondary", overlay: true },
    { name: "Track Pants Left Stripe", x1: 0, y1: 48, x2: 1, y2: 63, colorType: "secondary", overlay: true }
  ]
};

export const BOMBER_STREETWEAR_STENCIL: Stencil = {
  name: "Streetwear Bomber & Tee",
  baseTorso: 'shirt',
  baseSleeve: 'primary',
  sleeveLength: 'long',
  legStyle: 'pants',
  defaultPattern: 'leather',
  vibe: 'masculine',
  shoeStyle: 'sneakers',
  regions: [
    // Open jacket: sides only, center front left transparent to show the tee base
    { name: "Bomber Torso Left", x1: 16, y1: 32, x2: 20, y2: 47, colorType: "primary", overlay: true },
    { name: "Bomber Torso Right", x1: 34, y1: 32, x2: 39, y2: 47, colorType: "primary", overlay: true },
    { name: "Bomber Collar", x1: 21, y1: 32, x2: 33, y2: 32, colorType: "secondary", overlay: true },
    { name: "Bomber Right Sleeve", x1: 40, y1: 32, x2: 55, y2: 47, colorType: "primary", overlay: true },
    { name: "Bomber Left Sleeve", x1: 48, y1: 48, x2: 63, y2: 63, colorType: "primary", overlay: true },
    { name: "Right Ribbed Cuff", x1: 40, y1: 46, x2: 55, y2: 47, colorType: "secondary", overlay: true },
    { name: "Left Ribbed Cuff", x1: 48, y1: 62, x2: 63, y2: 63, colorType: "secondary", overlay: true },
    { name: "Right Pants", x1: 0, y1: 32, x2: 15, y2: 47, colorType: "pants", overlay: true },
    { name: "Left Pants", x1: 0, y1: 48, x2: 15, y2: 63, colorType: "pants", overlay: true }
  ]
};

export const SUMMER_DRESS_STENCIL: Stencil = {
  name: "Summer Dress",
  baseTorso: 'primary',
  baseSleeve: 'skin',
  sleeveLength: 'none',
  legStyle: 'skirt',
  defaultPattern: 'none',
  vibe: 'feminine',
  shoeStyle: 'flats',
  regions: [
    { name: "Dress Torso", x1: 16, y1: 32, x2: 39, y2: 47, colorType: "primary", overlay: true },
    { name: "Shoulder Strap Left", x1: 21, y1: 32, x2: 22, y2: 32, colorType: "primary", overlay: true },
    { name: "Shoulder Strap Right", x1: 25, y1: 32, x2: 26, y2: 32, colorType: "primary", overlay: true },
    { name: "Waist Sash", x1: 16, y1: 40, x2: 39, y2: 40, colorType: "secondary", overlay: true },
    { name: "Skirt Right", x1: 0, y1: 32, x2: 15, y2: 38, colorType: "primary", overlay: true },
    { name: "Skirt Left", x1: 0, y1: 48, x2: 15, y2: 54, colorType: "primary", overlay: true },
    { name: "Skirt Hem Right", x1: 0, y1: 37, x2: 15, y2: 38, colorType: "trim", overlay: true },
    { name: "Skirt Hem Left", x1: 0, y1: 53, x2: 15, y2: 54, colorType: "trim", overlay: true }
  ]
};

export const SKIRT_TOP_STENCIL: Stencil = {
  name: "Skirt & Fitted Top",
  baseTorso: 'skin',
  baseSleeve: 'skin',
  sleeveLength: 'short',
  legStyle: 'skirt',
  defaultPattern: 'ribbed',
  vibe: 'feminine',
  shoeStyle: 'flats',
  regions: [
    // Fitted crop top: leaves a scoop neckline and crop hem open to skin
    { name: "Top Torso", x1: 16, y1: 32, x2: 39, y2: 42, colorType: "primary", overlay: true },
    { name: "Top Neckline", x1: 22, y1: 32, x2: 25, y2: 33, colorType: "skin", overlay: true },
    { name: "Top Right Sleeve", x1: 40, y1: 32, x2: 55, y2: 37, colorType: "primary", overlay: true },
    { name: "Top Left Sleeve", x1: 48, y1: 48, x2: 63, y2: 53, colorType: "primary", overlay: true },
    { name: "Skirt Right", x1: 0, y1: 32, x2: 15, y2: 37, colorType: "secondary", overlay: true },
    { name: "Skirt Left", x1: 0, y1: 48, x2: 15, y2: 53, colorType: "secondary", overlay: true },
    { name: "Skirt Hem Right", x1: 0, y1: 36, x2: 15, y2: 37, colorType: "trim", overlay: true },
    { name: "Skirt Hem Left", x1: 0, y1: 52, x2: 15, y2: 53, colorType: "trim", overlay: true }
  ]
};

export const STENCILS: Record<string, Stencil> = {
  hoodie: STUDENT_HOODIE_STENCIL,
  blazer: TWEED_BLAZER_STENCIL,
  labcoat: LAB_COAT_STENCIL,
  crewneck: CREWNECK_SWEATER_STENCIL,
  tracksuit: TRACKSUIT_STENCIL,
  bomber: BOMBER_STREETWEAR_STENCIL,
  "summer-dress": SUMMER_DRESS_STENCIL,
  "skirt-top": SKIRT_TOP_STENCIL
};

export const STENCIL_KEYS = Object.keys(STENCILS);

export interface DemographicConfig {
  skinColor: string;
  hairColor: string;
  eyeColor: string;
}

export const DEMOGRAPHICS: Record<string, DemographicConfig> = {
  "East Asian": {
    skinColor: "#fce3c6",
    hairColor: "#1c120c",
    eyeColor: "#3a2412"
  },
  "South Asian": {
    skinColor: "#d09c74",
    hairColor: "#0c0c0c",
    eyeColor: "#261608"
  },
  "Caucasian": {
    skinColor: "#f3d0bc",
    hairColor: "#ebd382", // Blonde
    eyeColor: "#426bf2"  // Blue
  },
  "Black": {
    skinColor: "#704732",
    hairColor: "#111111",
    eyeColor: "#2e1b0b"
  }
};
