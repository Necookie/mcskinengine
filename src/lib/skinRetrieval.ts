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

const STYLE_KEYWORDS: Record<string, { brightness?: string; hue?: string; saturation?: string }> = {
  emo: { brightness: "dark", hue: "black" },
  goth: { brightness: "dark", hue: "purple" },
  dark: { brightness: "dark" },
  edgy: { brightness: "dark" },
  preppy: { brightness: "light", saturation: "vivid" },
  prep: { brightness: "light", saturation: "vivid" },
  classy: { brightness: "medium", saturation: "moderate" },
  elegant: { brightness: "light", saturation: "moderate" },
  formal: { brightness: "medium" },
  casual: { brightness: "medium" },
  chill: { brightness: "medium" },
  relaxed: { brightness: "medium" },
  comfy: { brightness: "medium" },
  sporty: { saturation: "vivid" },
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
  nerd: { brightness: "light" },
  geek: { brightness: "light" },
  skater: { brightness: "medium" },
  punk: { brightness: "dark" },
  alternative: { brightness: "dark" },
  hipster: { brightness: "medium" },
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

function extractPromptAttributes(prompt: string): {
  colors: string[];
  brightness: string | null;
  saturation: string | null;
  hasStyleMatch: boolean;
} {
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
  
  for (const [keyword, attrs] of Object.entries(STYLE_KEYWORDS)) {
    if (lower.includes(keyword)) {
      hasStyleMatch = true;
      if (attrs.brightness && !brightness) brightness = attrs.brightness;
      if (attrs.saturation && !saturation) saturation = attrs.saturation;
      if (attrs.hue && !colors.includes(attrs.hue)) colors.push(attrs.hue);
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
  
  return { colors, brightness, saturation, hasStyleMatch };
}

async function querySimilarSkins(
  colors: string[],
  brightness: string | null,
  saturation: string | null,
  hasStyleMatch: boolean,
  limit: number = 5
): Promise<SkinReference[]> {
  const conditions: string[] = [];
  const args: any[] = [];
  
  if (colors.length > 0) {
    const colorConditions = colors.map(() => "dominant_hue_category = ?").join(" OR ");
    conditions.push(`(${colorConditions})`);
    args.push(...colors);
  }
  
  if (brightness) {
    conditions.push("brightness_category = ?");
    args.push(brightness);
  }
  
  if (saturation) {
    conditions.push("saturation_category = ?");
    args.push(saturation);
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

function formatExamplesForPrompt(examples: RetrievedExample[]): string {
  if (examples.length === 0) return "";
  
  const formatted = examples.map((ex, i) => {
    const r = ex.apparelResult;
    return `Reference ${i + 1} (${r.styleVibe || "neutral"} ${r.shadingMode || "soft"} style):
${JSON.stringify({
  stencilKey: r.stencilKey,
  primary: r.primary,
  secondary: r.secondary,
  trim: r.trim,
  hairColor: r.hairColor,
  hairStyle: r.hairStyle,
  eyeStyle: r.eyeStyle,
  shadingMode: r.shadingMode,
  paletteMode: r.paletteMode,
  detailTexture: r.detailTexture,
  accessories: r.accessories,
}, null, 2)}`;
  }).join("\n\n");
  
  return `\n\nHere are real reference skins with their design parameters. Use these as inspiration for color palettes, style combinations, and attribute choices — vary your output based on these references:\n\n${formatted}\n`;
}

export async function retrieveAndFormatExamples(
  userPrompt: string,
  maxExamples: number = 3
): Promise<string> {
  try {
    const { colors, brightness, saturation, hasStyleMatch } = extractPromptAttributes(userPrompt);
    
    const references = await querySimilarSkins(colors, brightness, saturation, hasStyleMatch, maxExamples);
    
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
    
    return formatExamplesForPrompt(examples);
  } catch (error) {
    console.error("Failed to retrieve skin examples:", error);
    return "";
  }
}
