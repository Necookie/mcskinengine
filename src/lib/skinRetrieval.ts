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
  features_json: string;
}

interface RetrievedExample {
  description: string;
  features: any;
  colors: string[];
}

const COLOR_KEYWORDS: Record<string, string[]> = {
  red: ["red", "crimson", "scarlet", "ruby", "maroon"],
  blue: ["blue", "navy", "azure", "cyan", "teal"],
  green: ["green", "emerald", "lime", "olive", "forest"],
  yellow: ["yellow", "gold", "amber", "mustard"],
  purple: ["purple", "violet", "lavender", "plum", "mauve"],
  pink: ["pink", "rose", "magenta", "fuchsia"],
  orange: ["orange", "coral", "peach", "tangerine"],
  brown: ["brown", "tan", "beige", "chocolate", "coffee"],
  black: ["black", "dark", "ebony", "charcoal"],
  white: ["white", "light", "ivory", "cream", "snow"],
};

const STYLE_KEYWORDS: Record<string, string[]> = {
  emo: ["emo", "goth", "dark", "alternative", "punk"],
  preppy: ["preppy", "prep", "classy", "elegant", "formal"],
  casual: ["casual", "chill", "relaxed", "comfy"],
  sporty: ["sporty", "athletic", "gym", "active"],
  fantasy: ["fantasy", "mage", "wizard", "elf", "medieval"],
  scifi: ["scifi", "sci-fi", "cyberpunk", "futuristic", "neon"],
};

const BRIGHTNESS_MAP: Record<string, string> = {
  dark: "dark",
  dim: "dark",
  shadow: "dark",
  light: "light",
  bright: "light",
  pale: "light",
};

function extractKeywords(prompt: string): {
  colors: string[];
  styles: string[];
  brightness: string | null;
} {
  const lower = prompt.toLowerCase();
  
  const colors: string[] = [];
  for (const [color, keywords] of Object.entries(COLOR_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      colors.push(color);
    }
  }
  
  const styles: string[] = [];
  for (const [style, keywords] of Object.entries(STYLE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      styles.push(style);
    }
  }
  
  let brightness: string | null = null;
  for (const [category, keywords] of Object.entries(BRIGHTNESS_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) {
      brightness = category;
      break;
    }
  }
  
  return { colors, styles, brightness };
}

async function querySimilarSkins(
  colors: string[],
  styles: string[],
  brightness: string | null,
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
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  
  const sql = `
    SELECT id, filename, cluster_id, description, dominant_colors, 
           brightness_category, saturation_category, dominant_hue_category, features_json
    FROM skin_references
    ${whereClause}
    ORDER BY RANDOM()
    LIMIT ?
  `;
  args.push(limit);
  
  const result = await db.execute({ sql, args });
  return result.rows as unknown as SkinReference[];
}

function formatExamplesForPrompt(examples: RetrievedExample[]): string {
  if (examples.length === 0) return "";
  
  const formatted = examples.map((ex, i) => {
    const colors = ex.colors.slice(0, 3).join(", ");
    return `Example ${i + 1}: "${ex.description}"
Colors: ${colors}
Style: ${ex.features.statistics?.dominant_hue_category || "neutral"}, ${ex.features.statistics?.brightness_category || "medium"} brightness`;
  }).join("\n\n");
  
  return `\n\nHere are examples of high-quality parameter choices for similar requests:\n\n${formatted}\n`;
}

export async function retrieveAndFormatExamples(
  userPrompt: string,
  maxExamples: number = 3
): Promise<string> {
  try {
    const { colors, styles, brightness } = extractKeywords(userPrompt);
    
    const references = await querySimilarSkins(colors, styles, brightness, maxExamples);
    
    if (references.length === 0) {
      return "";
    }
    
    const examples: RetrievedExample[] = references.map(ref => {
      const features = JSON.parse(ref.features_json || "{}");
      const colors = JSON.parse(ref.dominant_colors || "[]");
      
      return {
        description: ref.description,
        features,
        colors,
      };
    });
    
    return formatExamplesForPrompt(examples);
  } catch (error) {
    console.error("Failed to retrieve skin examples:", error);
    return "";
  }
}
