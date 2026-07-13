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

interface PromptAttributes {
  colors: string[];
  brightness: string | null;
  saturation: string | null;
  hasStyleMatch: boolean;
  clothingItems: string[];
  accessories: string[];
  explicitParams: Record<string, any>;
}

const COLOR_KEYWORDS: Record<string, string[]> = {
  red: ["red", "crimson", "scarlet", "ruby", "maroon"],
  blue: ["blue", "navy", "azure", "cyan", "teal"],
  green: ["green", "emerald", "lime", "olive", "forest"],
  yellow: ["yellow", "gold", "amber", "mustard"],
  purple: ["purple", "violet", "lavender", "plum", "mauve"],
  pink: ["pink", "rose", "magenta", "fuchsia", "pastel"],
  orange: ["orange", "coral", "peach", "tangerine"],
  brown: ["brown", "tan", "beige", "chocolate", "coffee"],
  black: ["black", "ebony", "charcoal"],
  white: ["white", "ivory", "cream", "snow"],
};

const STYLE_KEYWORDS: Record<string, { brightness?: string; hue?: string; saturation?: string; hairStyles?: string[]; eyeStyles?: string[] }> = {
  emo: { 
    brightness: "dark", 
    hue: "black",
    hairStyles: ["messy-fringe", "long-straight", "side-part"],
    eyeStyles: ["narrow-serious", "shadow-2x2", "cool-highlight"]
  },
  goth: { 
    brightness: "dark", 
    hue: "purple",
    hairStyles: ["long-straight", "long-curly"],
    eyeStyles: ["narrow-serious", "shadow-2x2"]
  },
  dark: { brightness: "dark" },
  edgy: { brightness: "dark" },
  preppy: { 
    brightness: "light", 
    saturation: "vivid",
    hairStyles: ["side-part", "parted-curtains", "bob"],
    eyeStyles: ["classic-simple", "soft-round"]
  },
  prep: { 
    brightness: "light", 
    saturation: "vivid",
    hairStyles: ["side-part", "parted-curtains", "bob"],
    eyeStyles: ["classic-simple", "soft-round"]
  },
  classy: { brightness: "medium", saturation: "moderate" },
  elegant: { brightness: "light", saturation: "moderate" },
  formal: { brightness: "medium" },
  casual: { brightness: "medium" },
  chill: { brightness: "medium" },
  relaxed: { brightness: "medium" },
  comfy: { brightness: "medium" },
  sporty: { 
    saturation: "vivid",
    hairStyles: ["short-spiky", "ponytail", "buzz-cut"],
    eyeStyles: ["cool-highlight", "classic-simple"]
  },
  athletic: { saturation: "vivid" },
  gym: { saturation: "vivid" },
  active: { saturation: "vivid" },
  fantasy: { brightness: "medium", hue: "purple" },
  mage: { brightness: "medium", hue: "purple" },
  wizard: { brightness: "medium", hue: "purple" },
  medieval: { brightness: "medium", hue: "brown" },
  knight: { brightness: "medium", hue: "brown" },
  cyberpunk: { brightness: "dark", saturation: "vivid" },
  futuristic: { brightness: "dark", saturation: "vivid" },
  neon: { brightness: "dark", saturation: "vivid" },
  cute: { brightness: "light", saturation: "muted" },
  kawaii: { brightness: "light", saturation: "muted" },
  soft: { brightness: "light", saturation: "muted" },
  student: { brightness: "medium" },
  school: { brightness: "medium" },
  college: { brightness: "medium" },
  nerd: { 
    brightness: "light",
    hairStyles: ["side-part", "parted-curtains"],
    eyeStyles: ["classic-simple"]
  },
  geek: { brightness: "light" },
  skater: { brightness: "medium" },
  punk: { brightness: "dark" },
  alternative: { brightness: "dark" },
  hipster: { brightness: "medium" },
};

const CLOTHING_KEYWORDS: Record<string, { stencilKey?: string; primary?: string; secondary?: string; trim?: string }> = {
  "dress": { stencilKey: "summer-dress" },
  "white dress": { stencilKey: "summer-dress", primary: "#ffffff", secondary: "#f0f0f0" },
  "black dress": { stencilKey: "summer-dress", primary: "#1a1a1a", secondary: "#2a2a2a" },
  "red dress": { stencilKey: "summer-dress", primary: "#cc0000", secondary: "#990000" },
  "skirt": { stencilKey: "skirt-top" },
  "hoodie": { stencilKey: "hoodie" },
  "blazer": { stencilKey: "blazer" },
  "jacket": { stencilKey: "bomber" },
  "suit": { stencilKey: "blazer" },
  "tracksuit": { stencilKey: "tracksuit" },
  "crewneck": { stencilKey: "crewneck" },
  "sweater": { stencilKey: "crewneck" },
  "lab coat": { stencilKey: "labcoat" },
  "pants": { pants: "#000000" },
  "black pants": { pants: "#1a1a1a" },
  "jeans": { pants: "#4a6fa5" },
  "shorts": { pants: "#5a5a5a" },
};

const ACCESSORY_KEYWORDS: Record<string, string> = {
  "tie": "tie",
  "red tie": "tie",
  "glasses": "glasses",
  "headphones": "headphones",
  "mask": "mask",
  "beard": "beard",
  "earrings": "earrings",
  "necklace": "necklace",
  "hat": "hat",
};

const BRIGHTNESS_KEYWORDS: Record<string, string> = {
  dark: "dark",
  dim: "dark",
  shadow: "dark",
  gloomy: "dark",
  light: "light",
  bright: "light",
  pale: "light",
  vivid: "light",
};

function extractColorForItem(prompt: string, item: string): string | null {
  const lower = prompt.toLowerCase();
  const itemIndex = lower.indexOf(item);
  
  if (itemIndex === -1) return null;
  
  const before = lower.substring(Math.max(0, itemIndex - 30), itemIndex);
  
  for (const [color, keywords] of Object.entries(COLOR_KEYWORDS)) {
    if (keywords.some(kw => before.includes(kw))) {
      const colorMap: Record<string, string> = {
        red: "#cc0000",
        blue: "#3366cc",
        green: "#339933",
        yellow: "#cccc00",
        purple: "#9933cc",
        pink: "#ff66cc",
        orange: "#ff9933",
        brown: "#8b4513",
        black: "#1a1a1a",
        white: "#ffffff",
      };
      return colorMap[color] || null;
    }
  }
  
  return null;
}

export function extractPromptAttributes(prompt: string): PromptAttributes {
  const lower = prompt.toLowerCase();
  
  const colors: string[] = [];
  for (const [color, keywords] of Object.entries(COLOR_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      colors.push(color);
    }
  }
  
  let brightness: string | null = null;
  let saturation: string | null = null;
  let hasStyleMatch = false;
  let matchedHairStyles: string[] = [];
  let matchedEyeStyles: string[] = [];
  
  for (const [keyword, attrs] of Object.entries(STYLE_KEYWORDS)) {
    if (lower.includes(keyword)) {
      hasStyleMatch = true;
      if (attrs.brightness && !brightness) brightness = attrs.brightness;
      if (attrs.saturation && !saturation) saturation = attrs.saturation;
      if (attrs.hue && !colors.includes(attrs.hue)) colors.push(attrs.hue);
      if (attrs.hairStyles) matchedHairStyles.push(...attrs.hairStyles);
      if (attrs.eyeStyles) matchedEyeStyles.push(...attrs.eyeStyles);
    }
  }
  
  if (!brightness) {
    for (const [keyword, category] of Object.entries(BRIGHTNESS_KEYWORDS)) {
      if (lower.includes(keyword)) {
        brightness = category;
        break;
      }
    }
  }
  
  const clothingItems: string[] = [];
  const explicitParams: Record<string, any> = {};
  
  for (const [keyword, mapping] of Object.entries(CLOTHING_KEYWORDS)) {
    if (lower.includes(keyword)) {
      clothingItems.push(keyword);
      if (mapping.stencilKey) explicitParams.stencilKey = mapping.stencilKey;
      if (mapping.primary) {
        const itemColor = extractColorForItem(prompt, keyword);
        if (itemColor) {
          explicitParams.primary = itemColor;
        } else {
          explicitParams.primary = mapping.primary;
        }
      }
      if (mapping.secondary) explicitParams.secondary = mapping.secondary;
      if (mapping.trim) explicitParams.trim = mapping.trim;
      if (mapping.pants) {
        const pantsColor = extractColorForItem(prompt, keyword);
        explicitParams.pants = pantsColor || mapping.pants;
      }
    }
  }
  
  const accessories: string[] = [];
  for (const [keyword, accessory] of Object.entries(ACCESSORY_KEYWORDS)) {
    if (lower.includes(keyword)) {
      accessories.push(accessory);
      if (keyword.includes("tie")) {
        const tieColor = extractColorForItem(prompt, keyword);
        if (tieColor) explicitParams.tie = tieColor;
      }
    }
  }
  
  if (matchedHairStyles.length > 0) {
    explicitParams.preferredHairStyles = matchedHairStyles;
  }
  if (matchedEyeStyles.length > 0) {
    explicitParams.preferredEyeStyles = matchedEyeStyles;
  }
  
  return { 
    colors, 
    brightness, 
    saturation, 
    hasStyleMatch,
    clothingItems,
    accessories,
    explicitParams
  };
}

async function querySimilarSkins(
  attributes: PromptAttributes,
  limit: number = 5
): Promise<SkinReference[]> {
  const conditions: string[] = [];
  const args: any[] = [];
  
  if (attributes.colors.length > 0) {
    const colorConditions = attributes.colors.map(() => "dominant_hue_category = ?").join(" OR ");
    conditions.push(`(${colorConditions})`);
    args.push(...attributes.colors);
  }
  
  if (attributes.brightness) {
    conditions.push("brightness_category = ?");
    args.push(attributes.brightness);
  }
  
  if (attributes.saturation) {
    conditions.push("saturation_category = ?");
    args.push(attributes.saturation);
  }
  
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
  
  let instructions = "\n\nCRITICAL: The user requested specific items. You MUST include them:\n";
  
  if (attributes.explicitParams.stencilKey) {
    instructions += `- Use stencilKey: "${attributes.explicitParams.stencilKey}"\n`;
  }
  if (attributes.explicitParams.primary) {
    instructions += `- Primary color must be: ${attributes.explicitParams.primary}\n`;
  }
  if (attributes.explicitParams.pants) {
    instructions += `- Pants color must be: ${attributes.explicitParams.pants}\n`;
  }
  if (attributes.explicitParams.tie) {
    instructions += `- Tie color must be: ${attributes.explicitParams.tie}\n`;
    if (!attributes.accessories.includes("tie")) {
      attributes.accessories.push("tie");
    }
  }
  if (attributes.accessories.length > 0) {
    instructions += `- Must include accessories: ${JSON.stringify(attributes.accessories)}\n`;
  }
  if (attributes.explicitParams.preferredHairStyles) {
    instructions += `- Preferred hair styles: ${attributes.explicitParams.preferredHairStyles.join(", ")}\n`;
  }
  if (attributes.explicitParams.preferredEyeStyles) {
    instructions += `- Preferred eye styles: ${attributes.explicitParams.preferredEyeStyles.join(", ")}\n`;
  }
  
  instructions += `\nHere are reference examples matching the requested style:\n\n${formatted}\n`;
  
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
