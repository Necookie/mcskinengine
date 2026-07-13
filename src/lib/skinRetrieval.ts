import { db } from "./db";

interface SkinReference {
  id: string;
  filename: string;
  cluster_id: number;
  description: string;
  dominant_colors: string;
  brightness_category: string;
  saturation_category: string;
  dominant_hue_category: string;
  apparel_result: string;
  features_json: string;
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
    if (lower.includes(keyword)) {
      // Find associated color
      let color = null;
      const keywordIndex = lower.indexOf(keyword);
      const before = lower.substring(Math.max(0, keywordIndex - 30), keywordIndex);
      
      for (const [colorName, colorHex] of Object.entries(COLOR_MAP)) {
        if (before.includes(colorName)) {
          color = colorHex;
          break;
        }
      }
      
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
    if (lower.includes(keyword)) {
      let color = null;
      const keywordIndex = lower.indexOf(keyword);
      const before = lower.substring(Math.max(0, keywordIndex - 30), keywordIndex);
      
      for (const [colorName, colorHex] of Object.entries(COLOR_MAP)) {
        if (before.includes(colorName)) {
          color = colorHex;
          break;
        }
      }
      
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
    if (lower.includes(keyword)) {
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
      if (lower.includes(keyword)) {
        brightness = category;
        break;
      }
    }
  }
  
  // Extract gender
  let gender: string | null = null;
  for (const [keyword, value] of Object.entries(GENDER_PATTERNS)) {
    if (lower.includes(keyword)) {
      gender = value;
      break;
    }
  }
  
  // Extract age
  let age: string | null = null;
  for (const [keyword, value] of Object.entries(AGE_PATTERNS)) {
    if (lower.includes(keyword)) {
      age = value;
      break;
    }
  }
  
  // Extract materials
  const materials: string[] = [];
  for (const [keyword, material] of Object.entries(MATERIAL_PATTERNS)) {
    if (lower.includes(keyword) && !materials.includes(material)) {
      materials.push(material);
    }
  }
  
  // Extract textures
  const textures: string[] = [];
  for (const [keyword, texture] of Object.entries(TEXTURE_PATTERNS)) {
    if (lower.includes(keyword) && !textures.includes(texture)) {
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
    if (lower.includes(keyword)) {
      let pantsColor = mapping.color;
      const keywordIndex = lower.indexOf(keyword);
      const before = lower.substring(Math.max(0, keywordIndex - 30), keywordIndex);
      
      for (const [colorName, colorHex] of Object.entries(COLOR_MAP)) {
        if (before.includes(colorName)) {
          pantsColor = colorHex;
          break;
        }
      }
      
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

async function querySimilarSkins(
  attributes: PromptAttributes,
  limit: number = 5
): Promise<SkinReference[]> {
  const conditions: string[] = [];
  const args: any[] = [];
  
  // Color matching
  if (attributes.colors.length > 0) {
    const colorConditions = attributes.colors.map(() => "dominant_hue_category = ?").join(" OR ");
    conditions.push(`(${colorConditions})`);
    args.push(...attributes.colors);
  }
  
  // Brightness matching
  if (attributes.brightness) {
    conditions.push("brightness_category = ?");
    args.push(attributes.brightness);
  }
  
  // Saturation matching
  if (attributes.saturation) {
    conditions.push("saturation_category = ?");
    args.push(attributes.saturation);
  }
  
  // Stencil matching
  if (attributes.explicitParams.stencilKey) {
    conditions.push("json_extract(apparel_result, '$.stencilKey') = ?");
    args.push(attributes.explicitParams.stencilKey);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  
  const sql = `
    SELECT id, filename, cluster_id, description, dominant_colors, 
           brightness_category, saturation_category, dominant_hue_category,
           apparel_result, features_json
    FROM skin_references
    ${whereClause}
    ORDER BY RANDOM()
    LIMIT ?
  `;
  args.push(limit);
  
  const result = await db.execute({ sql, args });
  let rows = result.rows as unknown as SkinReference[];
  
  // Fallback with relaxed constraints
  if (rows.length < limit && conditions.length > 1) {
    const relaxedSql = `
      SELECT id, filename, cluster_id, description, dominant_colors,
             brightness_category, saturation_category, dominant_hue_category,
             apparel_result, features_json
      FROM skin_references
      WHERE brightness_category = ?
      ORDER BY RANDOM()
      LIMIT ?
    `;
    const relaxedResult = await db.execute({ 
      sql: relaxedSql, 
      args: [attributes.brightness || "medium", limit - rows.length] 
    });
    const existingIds = new Set(rows.map(r => r.id));
    const relaxedRows = (relaxedResult.rows as unknown as SkinReference[]).filter(r => !existingIds.has(r.id));
    rows = [...rows, ...relaxedRows].slice(0, limit);
  }
  
  // Final fallback
  if (rows.length < limit) {
    const fallbackSql = `
      SELECT id, filename, cluster_id, description, dominant_colors,
             brightness_category, saturation_category, dominant_hue_category,
             apparel_result, features_json
      FROM skin_references
      ORDER BY RANDOM()
      LIMIT ?
    `;
    const fallbackResult = await db.execute({ sql: fallbackSql, args: [limit - rows.length] });
    const existingIds = new Set(rows.map(r => r.id));
    const fallbackRows = (fallbackResult.rows as unknown as SkinReference[]).filter(r => !existingIds.has(r.id));
    rows = [...rows, ...fallbackRows].slice(0, limit);
  }
  
  return rows;
}

function formatExamplesForPrompt(examples: RetrievedExample[], attributes: PromptAttributes): string {
  if (examples.length === 0) return "";
  
  const formatted = examples.map((ex, i) => {
    const r = ex.apparelResult;
    return `Reference ${i + 1}:
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
  
  instructions += `\n=== REFERENCE EXAMPLES ===\n`;
  instructions += `Study these examples that match the requested style:\n\n${formatted}\n`;
  
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
