import { db } from "./db";
import { colorSimilarity } from "./colorNaming";

interface SkinReference {
  id: string;
  filename: string;
  cluster_id: number;
  description: string;
  dominant_colors: string;
  clothing_hue_category: string;
  clothing_brightness_category: string;
  clothing_saturation_category: string;
  apparel_result: string;
  features_json: string;
}

interface ScoredSkinReference extends SkinReference {
  _score: number;
  _apparel: any;
}

interface RetrievedExample {
  apparelResult: any;
  description: string;
}

interface ExtractedEntity {
  type: string;
  value: string;
  color?: string;
  modifiers?: string[];
  confidence: number;
}

interface PromptAttributes {
  colors: string[];
  hueBuckets: string[];
  brightness: string | null;
  saturation: string | null;
  hasStyleMatch: boolean;
  clothingItems: ExtractedEntity[];
  accessories: ExtractedEntity[];
  explicitParams: Record<string, any>;
  gender: string | null;
  age: string | null;
  style: string | null;
  materials: string[];
  textures: string[];
  negations: string[];
}

const COLOR_MAP: Record<string, string> = {
  red: "#cc0000", crimson: "#dc143c", scarlet: "#ff2400", ruby: "#9b111e", maroon: "#800000",
  blue: "#3366cc", navy: "#000080", azure: "#007fff", cyan: "#00ffff", teal: "#008080",
  green: "#339933", emerald: "#50c878", lime: "#32cd32", olive: "#808000", forest: "#228b22",
  yellow: "#cccc00", gold: "#ffd700", amber: "#ffbf00", mustard: "#ffdb58",
  purple: "#9933cc", violet: "#8f00ff", lavender: "#e6e6fa", plum: "#dda0dd", mauve: "#e0b0ff",
  pink: "#ff66cc", rose: "#ff007f", magenta: "#ff00ff", fuchsia: "#ff00ff", pastel: "#ffd1dc",
  orange: "#ff9933", coral: "#ff7f50", peach: "#ffe5b4", tangerine: "#ff9966",
  brown: "#8b4513", tan: "#d2b48c", beige: "#f5f5dc", chocolate: "#7b3f00", coffee: "#6f4e37",
  black: "#1a1a1a", ebony: "#555d50", charcoal: "#36454f",
  white: "#ffffff", ivory: "#fffff0", cream: "#fffdd0", snow: "#fffafa",
  gray: "#808080", grey: "#808080", silver: "#c0c0c0",
};

const COLOR_KEYWORDS: Record<string, string[]> = {
  red: ["red", "crimson", "scarlet", "ruby", "maroon", "cherry", "burgundy"],
  blue: ["blue", "navy", "azure", "cyan", "teal", "sapphire", "indigo"],
  green: ["green", "emerald", "lime", "olive", "forest", "mint", "sage"],
  yellow: ["yellow", "gold", "amber", "mustard", "lemon", "sunflower"],
  purple: ["purple", "violet", "lavender", "plum", "mauve", "lilac"],
  pink: ["pink", "rose", "magenta", "fuchsia", "pastel", "salmon", "blush"],
  orange: ["orange", "coral", "peach", "tangerine", "carrot", "rust"],
  brown: ["brown", "tan", "beige", "chocolate", "coffee", "bronze", "copper"],
  black: ["black", "ebony", "charcoal", "jet", "onyx", "midnight"],
  white: ["white", "ivory", "cream", "snow", "pearl", "alabaster"],
  gray: ["gray", "grey", "silver", "slate", "ash", "steel"],
};

// Maps the color-name buckets above to the clothing_hue_category values
// actually stored in the DB (see src/lib/colorNaming.ts). Hue is undefined
// for near-grayscale colors, so black/white/gray map to "neutral" — matching
// them against a hue bucket like "red" would never hit any row.
const COLOR_TO_HUE_BUCKET: Record<string, string> = {
  red: "red", blue: "blue", green: "green", yellow: "yellow",
  purple: "purple", pink: "pink", orange: "orange", brown: "orange",
  black: "neutral", white: "neutral", gray: "neutral",
};

const CLOTHING_PATTERNS: Record<string, { stencilKey: string; category: string; priority: number }> = {
  "dress": { stencilKey: "summer-dress", category: "dress", priority: 10 },
  "gown": { stencilKey: "summer-dress", category: "dress", priority: 10 },
  "skirt": { stencilKey: "skirt-top", category: "skirt", priority: 9 },
  "hoodie": { stencilKey: "hoodie", category: "top", priority: 8 },
  "sweatshirt": { stencilKey: "hoodie", category: "top", priority: 8 },
  "blazer": { stencilKey: "blazer", category: "jacket", priority: 9 },
  "jacket": { stencilKey: "bomber", category: "jacket", priority: 8 },
  "coat": { stencilKey: "bomber", category: "jacket", priority: 8 },
  "suit": { stencilKey: "blazer", category: "formal", priority: 10 },
  "tracksuit": { stencilKey: "tracksuit", category: "sporty", priority: 8 },
  "crewneck": { stencilKey: "crewneck", category: "top", priority: 7 },
  "sweater": { stencilKey: "crewneck", category: "top", priority: 7 },
  "pullover": { stencilKey: "crewneck", category: "top", priority: 7 },
  "lab coat": { stencilKey: "labcoat", category: "formal", priority: 9 },
  "t-shirt": { stencilKey: "crewneck", category: "top", priority: 6 },
  "tee": { stencilKey: "crewneck", category: "top", priority: 6 },
  "tank top": { stencilKey: "crewneck", category: "top", priority: 5 },
  "polo": { stencilKey: "crewneck", category: "top", priority: 7 },
  "shirt": { stencilKey: "crewneck", category: "top", priority: 7 },
  "blouse": { stencilKey: "summer-dress", category: "top", priority: 8 },
  "uniform": { stencilKey: "blazer", category: "formal", priority: 9 },
};

const BOTTOM_PATTERNS: Record<string, { color?: string; category: string }> = {
  "pants": { category: "bottom" },
  "jeans": { color: "#4a6fa5", category: "bottom" },
  "trousers": { category: "bottom" },
  "shorts": { category: "bottom" },
  "skirt": { category: "bottom" },
  "leggings": { category: "bottom" },
  "cargo": { category: "bottom" },
  "slacks": { category: "bottom" },
};

const ACCESSORY_PATTERNS: Record<string, { accessory: string; priority: number }> = {
  "tie": { accessory: "tie", priority: 10 },
  "necktie": { accessory: "tie", priority: 10 },
  "glasses": { accessory: "glasses", priority: 9 },
  "spectacles": { accessory: "glasses", priority: 9 },
  "headphones": { accessory: "headphones", priority: 8 },
  "earbuds": { accessory: "headphones", priority: 8 },
  "mask": { accessory: "mask", priority: 8 },
  "beard": { accessory: "beard", priority: 7 },
  "mustache": { accessory: "beard", priority: 7 },
  "earrings": { accessory: "earrings", priority: 7 },
  "necklace": { accessory: "necklace", priority: 6 },
  "hat": { accessory: "hat", priority: 7 },
  "cap": { accessory: "hat", priority: 7 },
  "headband": { accessory: "headband", priority: 6 },
  "scarf": { accessory: "scarf", priority: 7 },
  "bow": { accessory: "bow", priority: 6 },
  "ribbon": { accessory: "bow", priority: 6 },
};

const STYLE_PATTERNS: Record<string, { 
  brightness?: string; 
  saturation?: string; 
  hairStyles?: string[]; 
  eyeStyles?: string[];
  clothing?: string[];
  colors?: string[];
  vibe?: string;
}> = {
  "emo": { 
    brightness: "dark", 
    hairStyles: ["messy-fringe", "long-straight", "side-part"],
    eyeStyles: ["narrow-serious", "shadow-2x2", "cool-highlight"],
    colors: ["black", "purple", "red"],
    vibe: "alternative"
  },
  "goth": { 
    brightness: "dark", 
    hairStyles: ["long-straight", "long-curly"],
    eyeStyles: ["narrow-serious", "shadow-2x2"],
    colors: ["black", "purple", "dark red"],
    vibe: "dark"
  },
  "preppy": { 
    brightness: "light", 
    saturation: "vivid",
    hairStyles: ["side-part", "parted-curtains", "bob"],
    eyeStyles: ["classic-simple", "soft-round"],
    clothing: ["blazer", "shirt", "tie"],
    vibe: "formal"
  },
  "prep": { 
    brightness: "light", 
    saturation: "vivid",
    hairStyles: ["side-part", "parted-curtains", "bob"],
    eyeStyles: ["classic-simple", "soft-round"],
    vibe: "formal"
  },
  "sporty": { 
    saturation: "vivid",
    hairStyles: ["short-spiky", "ponytail", "buzz-cut"],
    eyeStyles: ["cool-highlight", "classic-simple"],
    clothing: ["tracksuit", "crewneck"],
    vibe: "athletic"
  },
  "casual": { 
    brightness: "medium",
    hairStyles: ["messy-fringe", "side-part", "bob"],
    eyeStyles: ["classic-simple", "soft-round"],
    vibe: "relaxed"
  },
  "formal": { 
    brightness: "medium",
    hairStyles: ["side-part", "parted-curtains", "bob"],
    eyeStyles: ["classic-simple", "soft-round"],
    clothing: ["blazer", "suit", "tie"],
    vibe: "professional"
  },
  "elegant": { 
    brightness: "light", 
    saturation: "moderate",
    hairStyles: ["long-straight", "bob", "ponytail"],
    eyeStyles: ["soft-round", "long-lashes"],
    vibe: "sophisticated"
  },
  "classy": { 
    brightness: "medium", 
    saturation: "moderate",
    vibe: "sophisticated"
  },
  "cute": { 
    brightness: "light", 
    saturation: "muted",
    hairStyles: ["bob", "twin-braids", "ponytail"],
    eyeStyles: ["soft-round", "long-lashes", "anime-glowing"],
    colors: ["pink", "pastel", "white"],
    vibe: "kawaii"
  },
  "kawaii": { 
    brightness: "light", 
    saturation: "muted",
    hairStyles: ["bob", "twin-braids", "ponytail"],
    eyeStyles: ["soft-round", "long-lashes", "anime-glowing"],
    colors: ["pink", "pastel"],
    vibe: "cute"
  },
  "soft": { 
    brightness: "light", 
    saturation: "muted",
    vibe: "gentle"
  },
  "nerd": { 
    brightness: "light",
    hairStyles: ["side-part", "parted-curtains"],
    eyeStyles: ["classic-simple"],
    clothing: ["shirt", "glasses"],
    vibe: "academic"
  },
  "geek": { 
    brightness: "light",
    vibe: "academic"
  },
  "punk": { 
    brightness: "dark",
    hairStyles: ["short-spiky", "messy-fringe", "undercut"],
    eyeStyles: ["narrow-serious", "cool-highlight"],
    colors: ["black", "red"],
    vibe: "rebellious"
  },
  "alternative": { 
    brightness: "dark",
    vibe: "nonconformist"
  },
  "hipster": { 
    brightness: "medium",
    hairStyles: ["messy-fringe", "side-part", "undercut"],
    eyeStyles: ["classic-simple", "soft-round"],
    vibe: "trendy"
  },
  "skater": { 
    brightness: "medium",
    hairStyles: ["messy-fringe", "short-spiky"],
    eyeStyles: ["classic-simple", "cool-highlight"],
    clothing: ["hoodie", "tracksuit"],
    vibe: "casual"
  },
  "cyberpunk": { 
    brightness: "dark", 
    saturation: "vivid",
    colors: ["neon", "black", "purple"],
    vibe: "futuristic"
  },
  "futuristic": { 
    brightness: "dark", 
    saturation: "vivid",
    vibe: "scifi"
  },
  "neon": { 
    brightness: "dark", 
    saturation: "vivid",
    colors: ["neon green", "neon pink", "electric blue"],
    vibe: "vibrant"
  },
  "fantasy": { 
    brightness: "medium",
    colors: ["purple", "gold", "emerald"],
    vibe: "magical"
  },
  "mage": { 
    brightness: "medium",
    colors: ["purple", "blue"],
    vibe: "magical"
  },
  "wizard": { 
    brightness: "medium",
    colors: ["purple", "blue", "gold"],
    vibe: "magical"
  },
  "medieval": { 
    brightness: "medium",
    colors: ["brown", "gray", "dark green"],
    vibe: "historical"
  },
  "knight": { 
    brightness: "medium",
    colors: ["gray", "silver", "dark blue"],
    vibe: "historical"
  },
  "student": { 
    brightness: "medium",
    vibe: "academic"
  },
  "school": { 
    brightness: "medium",
    vibe: "academic"
  },
  "college": { 
    brightness: "medium",
    vibe: "academic"
  },
  "dark": { 
    brightness: "dark",
    colors: ["black", "dark gray", "dark purple"]
  },
  "edgy": { 
    brightness: "dark",
    vibe: "bold"
  },
  "chill": { 
    brightness: "medium",
    vibe: "relaxed"
  },
  "relaxed": { 
    brightness: "medium",
    vibe: "casual"
  },
  "comfy": { 
    brightness: "medium",
    vibe: "comfortable"
  },
  "athletic": { 
    saturation: "vivid",
    vibe: "sporty"
  },
  "gym": { 
    saturation: "vivid",
    vibe: "sporty"
  },
  "active": { 
    saturation: "vivid",
    vibe: "sporty"
  },
};

const GENDER_PATTERNS: Record<string, string> = {
  "girl": "female",
  "woman": "female",
  "female": "female",
  "lady": "female",
  "she": "female",
  "her": "female",
  "boy": "male",
  "man": "male",
  "male": "male",
  "guy": "male",
  "he": "male",
  "him": "male",
  "person": "neutral",
  "character": "neutral",
};

const AGE_PATTERNS: Record<string, string> = {
  "kid": "child",
  "child": "child",
  "teen": "teen",
  "teenager": "teen",
  "adolescent": "teen",
  "young": "young adult",
  "adult": "adult",
  "old": "elderly",
  "elderly": "elderly",
  "senior": "elderly",
};

const MATERIAL_PATTERNS: Record<string, string> = {
  "leather": "leather",
  "denim": "denim",
  "cotton": "cotton",
  "silk": "silk",
  "wool": "wool",
  "linen": "linen",
  "velvet": "velvet",
  "suede": "suede",
  "canvas": "canvas",
  "mesh": "mesh",
  "lace": "lace",
  "satin": "satin",
  "chiffon": "chiffon",
  "flannel": "flannel",
  "tweed": "tweed",
  "corduroy": "corduroy",
  "knit": "knit",
  "ribbed": "ribbed",
};

const TEXTURE_PATTERNS: Record<string, string> = {
  "striped": "pinstripe",
  "stripes": "pinstripe",
  "plaid": "plaid",
  "checkered": "plaid",
  "check": "plaid",
  "floral": "floral",
  "flowers": "floral",
  "camo": "camo",
  "camouflage": "camo",
  "grunge": "grunge",
  "distressed": "grunge",
  "worn": "grunge",
  "solid": "solid",
  "plain": "solid",
};

const BRIGHTNESS_PATTERNS: Record<string, string> = {
  "dark": "dark",
  "dim": "dark",
  "shadow": "dark",
  "gloomy": "dark",
  "deep": "dark",
  "rich": "dark",
  "light": "light",
  "bright": "light",
  "pale": "light",
  "vivid": "light",
  "neon": "light",
  "soft": "light",
  "pastel": "light",
  "medium": "medium",
  "moderate": "medium",
};

/**
 * Finds the color name whose mention ends closest to the end of `before`
 * (i.e. immediately preceding the item keyword) rather than whichever color
 * happens to come first in COLOR_MAP's iteration order. Without this, "red
 * tie, ... black pants" would assign "red" to pants too, since "red" is
 * simply earlier in COLOR_MAP than "black" and both appear somewhere in the
 * lookback window.
 */
const wordBoundaryCache = new Map<string, RegExp>();

/**
 * Word-boundary keyword match. Plain `.includes()` false-positives constantly
 * against short dictionary keys — "suit" inside "tracksuit", "her" inside
 * "leather", "man" inside "woman", "hat" inside "what" — which silently
 * corrupts extraction (e.g. "black tracksuit" resolving to a blazer because
 * "suit" is a higher-priority keyword hiding inside it).
 */
function hasWord(text: string, keyword: string): boolean {
  let re = wordBoundaryCache.get(keyword);
  if (!re) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(`\\b${escaped}\\b`);
    wordBoundaryCache.set(keyword, re);
  }
  return re.test(text);
}

function nearestColorHexBefore(before: string): string | null {
  let bestHex: string | null = null;
  let bestIndex = -1;
  for (const [colorName, colorHex] of Object.entries(COLOR_MAP)) {
    const idx = before.lastIndexOf(colorName);
    if (idx > bestIndex) {
      bestIndex = idx;
      bestHex = colorHex;
    }
  }
  return bestHex;
}

function extractEntitiesFromPrompt(prompt: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const lower = prompt.toLowerCase();
  const words = lower.split(/\s+/);
  
  // Extract color entities with their associated items
  for (let i = 0; i < words.length; i++) {
    for (const [colorName, keywords] of Object.entries(COLOR_KEYWORDS)) {
      for (const keyword of keywords) {
        if (words[i] === keyword || words[i].includes(keyword)) {
          const colorHex = COLOR_MAP[colorName];
          if (colorHex) {
            // Look for nearby clothing items
            let associatedItem = null;
            for (let j = Math.max(0, i - 3); j < Math.min(words.length, i + 4); j++) {
              if (j !== i) {
                const word = words[j];
                if (CLOTHING_PATTERNS[word] || BOTTOM_PATTERNS[word] || ACCESSORY_PATTERNS[word]) {
                  associatedItem = word;
                  break;
                }
              }
            }
            
            entities.push({
              type: "color",
              value: colorName,
              color: colorHex,
              confidence: 0.9,
            });
          }
        }
      }
    }
  }
  
  // Extract clothing items
  for (const [keyword, mapping] of Object.entries(CLOTHING_PATTERNS)) {
    if (hasWord(lower, keyword)) {
      const keywordIndex = lower.indexOf(keyword);
      const before = lower.substring(Math.max(0, keywordIndex - 30), keywordIndex);
      const color = nearestColorHexBefore(before);

      entities.push({
        type: "clothing",
        value: keyword,
        color: color || undefined,
        confidence: 0.95,
      });
    }
  }
  
  // Extract accessories
  for (const [keyword, mapping] of Object.entries(ACCESSORY_PATTERNS)) {
    if (hasWord(lower, keyword)) {
      const keywordIndex = lower.indexOf(keyword);
      const before = lower.substring(Math.max(0, keywordIndex - 30), keywordIndex);
      const color = nearestColorHexBefore(before);

      entities.push({
        type: "accessory",
        value: keyword,
        color: color || undefined,
        confidence: 0.9,
      });
    }
  }
  
  return entities;
}

export function extractPromptAttributes(prompt: string): PromptAttributes {
  const lower = prompt.toLowerCase();
  const entities = extractEntitiesFromPrompt(prompt);
  
  // Extract colors
  const colors: string[] = [];
  for (const entity of entities) {
    if (entity.type === "color" && !colors.includes(entity.value)) {
      colors.push(entity.value);
    }
  }
  
  // Extract style
  let style: string | null = null;
  let brightness: string | null = null;
  let saturation: string | null = null;
  let hasStyleMatch = false;
  let matchedHairStyles: string[] = [];
  let matchedEyeStyles: string[] = [];
  let matchedVibe: string | null = null;
  
  for (const [keyword, attrs] of Object.entries(STYLE_PATTERNS)) {
    if (hasWord(lower, keyword)) {
      hasStyleMatch = true;
      style = keyword;
      if (attrs.brightness && !brightness) brightness = attrs.brightness;
      if (attrs.saturation && !saturation) saturation = attrs.saturation;
      if (attrs.vibe && !matchedVibe) matchedVibe = attrs.vibe;
      if (attrs.hairStyles) matchedHairStyles.push(...attrs.hairStyles);
      if (attrs.eyeStyles) matchedEyeStyles.push(...attrs.eyeStyles);
      if (attrs.colors) {
        for (const color of attrs.colors) {
          if (!colors.includes(color)) colors.push(color);
        }
      }
    }
  }
  
  // Extract brightness if not found in style
  if (!brightness) {
    for (const [keyword, category] of Object.entries(BRIGHTNESS_PATTERNS)) {
      if (hasWord(lower, keyword)) {
        brightness = category;
        break;
      }
    }
  }

  // Colors imply a brightness even without an explicit adjective — "black
  // pants" should bias toward dark reference skins, "white dress" toward light.
  if (!brightness) {
    if (colors.includes("black")) brightness = "dark";
    else if (colors.includes("white")) brightness = "light";
  }

  // Translate color-name buckets into the clothing_hue_category values
  // actually stored in the DB (black/white/gray have no hue, so they map
  // to "neutral" instead of being dropped from matching entirely).
  const hueBuckets = [...new Set(colors.map((c) => COLOR_TO_HUE_BUCKET[c]).filter((v): v is string => !!v))];

  // Extract gender
  let gender: string | null = null;
  for (const [keyword, value] of Object.entries(GENDER_PATTERNS)) {
    if (hasWord(lower, keyword)) {
      gender = value;
      break;
    }
  }
  
  // Extract age. A literal "N year(s) old" always wins over keyword
  // matching — otherwise "18 year old" would trip the "old" -> elderly
  // keyword below, since "old" is a substring match on its own.
  let age: string | null = null;
  const numericAgeMatch = lower.match(/(\d{1,3})\s*(?:years?|yrs?)?\s*old/);
  if (numericAgeMatch) {
    const n = parseInt(numericAgeMatch[1], 10);
    age = n < 13 ? "child" : n < 20 ? "teen" : n < 60 ? "adult" : "elderly";
  } else {
    for (const [keyword, value] of Object.entries(AGE_PATTERNS)) {
      if (hasWord(lower, keyword)) {
        age = value;
        break;
      }
    }
  }
  
  // Extract materials
  const materials: string[] = [];
  for (const [keyword, material] of Object.entries(MATERIAL_PATTERNS)) {
    if (hasWord(lower, keyword) && !materials.includes(material)) {
      materials.push(material);
    }
  }
  
  // Extract textures
  const textures: string[] = [];
  for (const [keyword, texture] of Object.entries(TEXTURE_PATTERNS)) {
    if (hasWord(lower, keyword) && !textures.includes(texture)) {
      textures.push(texture);
    }
  }
  
  // Extract negations
  const negations: string[] = [];
  const negationPatterns = [
    /no\s+(\w+)/g,
    /without\s+(\w+)/g,
    /don't\s+want\s+(\w+)/g,
    /avoid\s+(\w+)/g,
  ];
  
  for (const pattern of negationPatterns) {
    let match;
    while ((match = pattern.exec(lower)) !== null) {
      negations.push(match[1]);
    }
  }
  
  // Build explicit parameters from entities
  const explicitParams: Record<string, any> = {};
  const clothingItems: ExtractedEntity[] = [];
  const accessories: ExtractedEntity[] = [];
  
  for (const entity of entities) {
    if (entity.type === "clothing") {
      clothingItems.push(entity);
      
      const mapping = CLOTHING_PATTERNS[entity.value];
      if (mapping) {
        // Use highest priority clothing item
        if (!explicitParams.stencilKey || mapping.priority > (explicitParams._priority || 0)) {
          explicitParams.stencilKey = mapping.stencilKey;
          explicitParams._priority = mapping.priority;
        }
        
        if (entity.color) {
          explicitParams.primary = entity.color;
        }
      }
    } else if (entity.type === "accessory") {
      accessories.push(entity);
      
      const mapping = ACCESSORY_PATTERNS[entity.value];
      if (mapping) {
        if (!explicitParams.accessories) {
          explicitParams.accessories = [];
        }
        if (!explicitParams.accessories.includes(mapping.accessory)) {
          explicitParams.accessories.push(mapping.accessory);
        }
        
        if (entity.color && mapping.accessory === "tie") {
          explicitParams.tie = entity.color;
        }
      }
    }
  }
  
  // Handle bottom wear
  for (const [keyword, mapping] of Object.entries(BOTTOM_PATTERNS)) {
    if (hasWord(lower, keyword)) {
      const keywordIndex = lower.indexOf(keyword);
      const before = lower.substring(Math.max(0, keywordIndex - 30), keywordIndex);
      const pantsColor = nearestColorHexBefore(before) || mapping.color;

      if (pantsColor) {
        explicitParams.pants = pantsColor;
      }
    }
  }
  
  // Add style preferences
  if (matchedHairStyles.length > 0) {
    explicitParams.preferredHairStyles = [...new Set(matchedHairStyles)];
  }
  if (matchedEyeStyles.length > 0) {
    explicitParams.preferredEyeStyles = [...new Set(matchedEyeStyles)];
  }
  if (matchedVibe) {
    explicitParams.styleVibe = matchedVibe;
  }
  if (gender) {
    explicitParams.gender = gender;
  }
  if (age) {
    explicitParams.age = age;
  }
  
  // Clean up temporary fields
  delete explicitParams._priority;
  
  return {
    colors,
    hueBuckets,
    brightness,
    saturation, 
    hasStyleMatch,
    clothingItems,
    accessories,
    explicitParams,
    gender,
    age,
    style,
    materials,
    textures,
    negations,
  };
}

const CANDIDATE_POOL_SIZE = 300;

const CANDIDATE_SELECT = `id, filename, cluster_id, description, dominant_colors,
           clothing_hue_category, clothing_brightness_category, clothing_saturation_category,
           apparel_result, features_json`;

function buildConditions(attributes: PromptAttributes): { clause: string; args: any[] }[] {
  const parts: { clause: string; args: any[] }[] = [];
  if (attributes.hueBuckets.length > 0) {
    parts.push({
      clause: `clothing_hue_category IN (${attributes.hueBuckets.map(() => "?").join(",")})`,
      args: [...attributes.hueBuckets],
    });
  }
  if (attributes.brightness) {
    parts.push({ clause: "clothing_brightness_category = ?", args: [attributes.brightness] });
  }
  if (attributes.explicitParams.stencilKey) {
    parts.push({ clause: "json_extract(apparel_result, '$.stencilKey') = ?", args: [attributes.explicitParams.stencilKey] });
  }
  if (attributes.explicitParams.accessories?.length) {
    for (const accessory of attributes.explicitParams.accessories) {
      parts.push({ clause: "json_extract(apparel_result, '$.accessories') LIKE ?", args: [`%"${accessory}"%`] });
    }
  }
  return parts;
}

/**
 * Fetches a broad, relevant candidate pool of dataset rows to use as
 * few-shot reference material for the AI (never as final output pixels —
 * see retrieveAndFormatExamples). Runs a strict AND query first so rows
 * matching *every* extracted attribute (e.g. hue=blue AND stencil=hoodie)
 * are guaranteed to be in the pool instead of relying on a random OR'd
 * sample to happen to include them, then tops up with a looser OR'd pool
 * for scoring diversity and as a fallback when nothing matches everything.
 */
async function fetchCandidatePool(attributes: PromptAttributes): Promise<SkinReference[]> {
  const conditions = buildConditions(attributes);
  const rowsById = new Map<string, SkinReference>();

  if (conditions.length > 1) {
    const clause = conditions.map((c) => c.clause).join(" AND ");
    const args = conditions.flatMap((c) => c.args);
    const strict = await db.execute({
      sql: `SELECT ${CANDIDATE_SELECT} FROM skin_references WHERE ${clause} ORDER BY RANDOM() LIMIT ?`,
      args: [...args, CANDIDATE_POOL_SIZE],
    });
    for (const row of strict.rows as unknown as SkinReference[]) rowsById.set(row.id, row);
  }

  if (conditions.length > 0 && rowsById.size < CANDIDATE_POOL_SIZE) {
    const clause = conditions.map((c) => c.clause).join(" OR ");
    const args = conditions.flatMap((c) => c.args);
    const loose = await db.execute({
      sql: `SELECT ${CANDIDATE_SELECT} FROM skin_references WHERE ${clause} ORDER BY RANDOM() LIMIT ?`,
      args: [...args, CANDIDATE_POOL_SIZE],
    });
    for (const row of loose.rows as unknown as SkinReference[]) rowsById.set(row.id, row);
  }

  // No attributes matched anything specific enough — fall back to a random
  // pool so the caller still has something to rank/return.
  if (rowsById.size === 0) {
    const fallback = await db.execute({
      sql: `SELECT ${CANDIDATE_SELECT} FROM skin_references ORDER BY RANDOM() LIMIT ?`,
      args: [CANDIDATE_POOL_SIZE],
    });
    for (const row of fallback.rows as unknown as SkinReference[]) rowsById.set(row.id, row);
  }

  return [...rowsById.values()];
}

/** Higher is a better match for the extracted prompt attributes. */
function scoreCandidate(row: SkinReference, attributes: PromptAttributes): ScoredSkinReference {
  let apparel: any = {};
  try {
    apparel = row.apparel_result ? JSON.parse(row.apparel_result) : {};
  } catch {
    apparel = {};
  }

  let score = 0;

  if (attributes.explicitParams.stencilKey && apparel.stencilKey === attributes.explicitParams.stencilKey) {
    score += 40;
  }

  // The literal color word tied to the requested garment ("white dress") is
  // a stronger, more specific signal than the prompt's overall inferred
  // brightness (e.g. a "dark"-vibe style like "emo" elsewhere in the same
  // prompt) — so it's weighted well above the generic hue/brightness match
  // below, and compared by RGB distance rather than exact hex/bucket
  // equality so a slightly warm "white" in the dataset still scores well
  // against a pure #ffffff ask instead of getting zero credit.
  if (attributes.explicitParams.primary && apparel.primary) {
    score += 35 * Math.max(0, colorSimilarity(attributes.explicitParams.primary, apparel.primary));
  } else {
    if (attributes.hueBuckets.includes(row.clothing_hue_category)) score += 20;
    if (attributes.brightness && row.clothing_brightness_category === attributes.brightness) score += 15;
  }
  if (attributes.saturation && row.clothing_saturation_category === attributes.saturation) score += 10;

  const wantedAccessories: string[] = attributes.explicitParams.accessories || [];
  if (wantedAccessories.length && Array.isArray(apparel.accessories)) {
    const overlap = wantedAccessories.filter((a) => apparel.accessories.includes(a)).length;
    score += overlap * 15;
  }

  if (attributes.gender === "female" && apparel.styleVibe === "feminine") score += 8;
  if (attributes.gender === "male" && apparel.styleVibe === "masculine") score += 8;

  const preferredHair: string[] = attributes.explicitParams.preferredHairStyles || [];
  if (preferredHair.includes(apparel.hairStyle)) score += 10;
  const preferredEyes: string[] = attributes.explicitParams.preferredEyeStyles || [];
  if (preferredEyes.includes(apparel.eyeStyle)) score += 10;

  if (attributes.textures.length && attributes.textures.includes(apparel.detailTexture)) score += 8;

  // Explicit pants/tie/shirt color asks: reward a close RGB match.
  for (const field of ["pants", "tie", "shirt"] as const) {
    const wanted = attributes.explicitParams[field];
    if (wanted && apparel[field]) {
      score += 12 * Math.max(0, colorSimilarity(wanted, apparel[field]));
    }
  }

  return { ...row, _score: score, _apparel: apparel };
}

function rankCandidates(rows: SkinReference[], attributes: PromptAttributes): ScoredSkinReference[] {
  return rows.map((row) => scoreCandidate(row, attributes)).sort((a, b) => b._score - a._score);
}

async function querySimilarSkins(
  attributes: PromptAttributes,
  limit: number = 5
): Promise<SkinReference[]> {
  const pool = await fetchCandidatePool(attributes);
  return rankCandidates(pool, attributes).slice(0, limit);
}

function formatExamplesForPrompt(examples: RetrievedExample[], attributes: PromptAttributes): string {
  if (examples.length === 0) return "";
  
  const formatted = examples.map((ex, i) => {
    const r = ex.apparelResult;
    return `Reference ${i + 1}${ex.description ? ` (${ex.description})` : ""}:
${JSON.stringify({
  stencilKey: r.stencilKey,
  primary: r.primary,
  secondary: r.secondary,
  trim: r.trim,
  pants: r.pants,
  shirt: r.shirt,
  tie: r.tie,
  hairColor: r.hairColor,
  hairStyle: r.hairStyle,
  eyeStyle: r.eyeStyle,
  shadingMode: r.shadingMode,
  paletteMode: r.paletteMode,
  detailTexture: r.detailTexture,
  accessories: r.accessories,
  styleVibe: r.styleVibe,
}, null, 2)}`;
  }).join("\n\n");
  
  let instructions = "\n\n=== CRITICAL REQUIREMENTS ===\n";
  instructions += "The user has specified specific items. You MUST include ALL of them:\n\n";
  
  if (attributes.explicitParams.stencilKey) {
    instructions += `✓ REQUIRED: stencilKey = "${attributes.explicitParams.stencilKey}"\n`;
  }
  if (attributes.explicitParams.primary) {
    instructions += `✓ REQUIRED: primary color = ${attributes.explicitParams.primary}\n`;
  }
  if (attributes.explicitParams.pants) {
    instructions += `✓ REQUIRED: pants color = ${attributes.explicitParams.pants}\n`;
  }
  if (attributes.explicitParams.tie) {
    instructions += `✓ REQUIRED: tie color = ${attributes.explicitParams.tie}\n`;
    if (!attributes.explicitParams.accessories) {
      attributes.explicitParams.accessories = [];
    }
    if (!attributes.explicitParams.accessories.includes("tie")) {
      attributes.explicitParams.accessories.push("tie");
    }
  }
  if (attributes.explicitParams.accessories && attributes.explicitParams.accessories.length > 0) {
    instructions += `✓ REQUIRED: accessories = ${JSON.stringify(attributes.explicitParams.accessories)}\n`;
  }
  if (attributes.explicitParams.preferredHairStyles) {
    instructions += `✓ PREFERRED hair styles: ${attributes.explicitParams.preferredHairStyles.join(", ")}\n`;
  }
  if (attributes.explicitParams.preferredEyeStyles) {
    instructions += `✓ PREFERRED eye styles: ${attributes.explicitParams.preferredEyeStyles.join(", ")}\n`;
  }
  if (attributes.gender) {
    instructions += `✓ Gender presentation: ${attributes.gender}\n`;
  }
  if (attributes.style) {
    instructions += `✓ Style: ${attributes.style}\n`;
  }
  if (attributes.materials.length > 0) {
    instructions += `✓ Materials: ${attributes.materials.join(", ")}\n`;
  }
  if (attributes.textures.length > 0) {
    instructions += `✓ Textures: ${attributes.textures.join(", ")}\n`;
  }
  if (attributes.negations.length > 0) {
    instructions += `✗ AVOID: ${attributes.negations.join(", ")}\n`;
  }
  
  instructions += `\n=== STYLE INSPIRATION (NOT A TEMPLATE) ===\n`;
  instructions += `These are existing dataset skins with a similar vibe to the request, shown ONLY to calibrate what a plausible combination of stencil/colors/hair/eyes looks like. Do not copy one verbatim and do not let them override anything the user actually asked for above — where a reference conflicts with the user's request, the user's request wins:\n\n${formatted}\n`;

  return instructions;
}

export async function retrieveAndFormatExamples(
  userPrompt: string,
  maxExamples: number = 5
): Promise<string> {
  try {
    const attributes = extractPromptAttributes(userPrompt);
    
    const references = await querySimilarSkins(attributes, maxExamples);
    
    if (references.length === 0) {
      return "";
    }
    
    const examples: RetrievedExample[] = references
      .filter(ref => ref.apparel_result)
      .map(ref => {
        let apparelResult;
        try {
          apparelResult = JSON.parse(ref.apparel_result);
        } catch {
          return null;
        }
        
        return {
          apparelResult,
          description: ref.description,
        };
      })
      .filter((ex): ex is RetrievedExample => ex !== null);
    
    if (examples.length === 0) {
      return "";
    }
    
    return formatExamplesForPrompt(examples, attributes);
  } catch (error) {
    console.error("Failed to retrieve skin examples:", error);
    return "";
  }
}

