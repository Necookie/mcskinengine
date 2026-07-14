import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { generateSkinArray, skinToBase64 } from "@/lib/skinEngine";
import { STENCILS, STENCIL_KEYS } from "@/lib/stencils";
import { HAIR_STYLES, HAIR_STYLE_KEYS } from "@/lib/hairStyles";
import { EYE_STYLES, EYE_STYLE_KEYS } from "@/lib/eyeStyles";
import { PATTERN_KEYS } from "@/lib/shading";
import { ACCESSORY_KEYS } from "@/lib/accessories";
import { retrieveAndFormatExamples, extractPromptAttributes } from "@/lib/skinRetrieval";

export const runtime = "edge";

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiContent {
  parts: GeminiPart[];
}

interface ApparelResult {
  stencilKey: string;
  primary: string;
  secondary: string;
  trim: string;
  shirt: string;
  tie: string;
  pants: string;
  shoes?: string;
  skinColor: string;
  hairColor: string;
  eyeColor: string;
  hairStyle: string;
  eyeStyle: string;
  detailTexture: string;
  styleVibe?: string;
  shadingMode?: string;
  paletteMode?: string;
  accessories?: string[];
  enhancedPrompt?: string;
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const VIBE_KEYS = ["masculine", "feminine", "neutral"];
const SHADING_MODE_KEYS = ["soft", "graphic"];
const PALETTE_MODE_KEYS = ["full", "monochrome", "complementary", "analogous", "split-complementary", "triadic"];

const PRICING: Record<string, { inRate: number; outRate: number }> = {
  "gemini-3.5-flash": { inRate: 1.50 / 1000000, outRate: 9.00 / 1000000 },
  "gemini-1.5-flash": { inRate: 0.075 / 1000000, outRate: 0.30 / 1000000 },
  "gemini-1.5-pro": { inRate: 1.25 / 1000000, outRate: 5.00 / 1000000 },
  "gemini-2.0-flash": { inRate: 0.075 / 1000000, outRate: 0.30 / 1000000 },
  "gemini-2.5-flash": { inRate: 0.075 / 1000000, outRate: 0.30 / 1000000 },
  "gpt-4o-mini": { inRate: 0.150 / 1000000, outRate: 0.600 / 1000000 },
  "gpt-4o": { inRate: 2.50 / 1000000, outRate: 10.00 / 1000000 }
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, image, demographic, isAlex, provider, model } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const selectedProvider = provider || "gemini";
    const selectedModel = model || "gemini-1.5-flash";

    const settingsResult = await db.execute({
      sql: "SELECT gemini_key, openai_key FROM user_settings WHERE user_id = ? LIMIT 1",
      args: [userId],
    });

    if (settingsResult.rows.length === 0) {
      return NextResponse.json({ error: "API settings not found." }, { status: 400 });
    }

    const row = settingsResult.rows[0];
    const keyEnc = selectedProvider === "openai" ? (row.openai_key as string) : (row.gemini_key as string);
    
    if (!keyEnc) {
      return NextResponse.json(
        { error: `${selectedProvider === "openai" ? "OpenAI" : "Gemini"} API key is not configured. Please save your API Key in Settings.` },
        { status: 400 }
      );
    }

    let apiKey: string;
    try {
      apiKey = await decrypt(keyEnc);
    } catch {
      return NextResponse.json({ error: "Failed to decrypt API Key. Please re-enter it." }, { status: 500 });
    }

    const promptAttributes = extractPromptAttributes(prompt);
    const fewShotExamples = await retrieveAndFormatExamples(prompt, 5);

    const stencilList = STENCIL_KEYS.map((k) => `- "${k}": ${STENCILS[k].name} (${STENCILS[k].vibe})`).join("\n");
    const hairList = HAIR_STYLE_KEYS.map((k) => `- "${k}": ${HAIR_STYLES[k].name} (${HAIR_STYLES[k].vibe})`).join("\n");
    const eyeList = EYE_STYLE_KEYS.map((k) => `- "${k}": ${EYE_STYLES[k].name} (${EYE_STYLES[k].vibe})`).join("\n");

    const promptText = `You are an expert Minecraft skin designer. You MUST follow the user's specific requests exactly.

${fewShotExamples}

CRITICAL: The user has specified exact items. You MUST include ALL of them in your output:
- If they say "white dress", you MUST use stencilKey: "summer-dress" and primary: "#ffffff"
- If they say "red tie", you MUST include "tie" in accessories and set tie: "#cc0000"
- If they say "black pants", you MUST set pants: "#1a1a1a"
- If they say "emo", you MUST use dark colors and emo-appropriate hair/eyes

Available outfit stencils (stencilKey):
${stencilList}

Available hairstyles (hairStyle):
${hairList}

Available eye styles (eyeStyle):
${eyeList}

Return a JSON object with EXACTLY these keys:
- stencilKey, primary, secondary, trim, shirt, tie, pants, shoes
- skinColor, hairColor, eyeColor
- hairStyle, eyeStyle, detailTexture
- styleVibe, shadingMode, paletteMode
- accessories (array), enhancedPrompt

User description: ${prompt}`;

    let apparel: ApparelResult;
    let inputTokens = 0;
    let outputTokens = 0;

    if (selectedProvider === "openai") {
      const messages: any[] = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: promptText
            }
          ]
        }
      ];

      if (image && typeof image === "string") {
        messages[0].content.push({
          type: "image_url",
          image_url: {
            url: image
          }
        });
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return NextResponse.json({ error: `OpenAI API request failed: ${errText}` }, { status: response.status });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return NextResponse.json({ error: "No content returned from OpenAI." }, { status: 500 });
      }

      apparel = JSON.parse(content.trim());
      inputTokens = data.usage?.prompt_tokens || 0;
      outputTokens = data.usage?.completion_tokens || 0;

    } else {
      // Gemini
      const parts: GeminiPart[] = [{ text: promptText }];

      if (image && typeof image === "string") {
        const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          });
        }
      }

      const contents: GeminiContent[] = [{ parts }];
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                stencilKey: { type: "STRING", enum: STENCIL_KEYS },
                primary: { type: "STRING", description: "Primary hex color" },
                secondary: { type: "STRING", description: "Secondary hex color" },
                trim: { type: "STRING", description: "Trim hex color" },
                shirt: { type: "STRING", description: "Shirt hex color" },
                tie: { type: "STRING", description: "Tie hex color" },
                pants: { type: "STRING", description: "Pants hex color" },
                shoes: { type: "STRING", description: "Shoes hex color" },
                skinColor: { type: "STRING", description: "Skin tone hex color" },
                hairColor: { type: "STRING", description: "Hair hex color" },
                eyeColor: { type: "STRING", description: "Eye hex color" },
                hairStyle: { type: "STRING", enum: HAIR_STYLE_KEYS },
                eyeStyle: { type: "STRING", enum: EYE_STYLE_KEYS },
                detailTexture: { type: "STRING", enum: PATTERN_KEYS },
                styleVibe: { type: "STRING", enum: VIBE_KEYS },
                shadingMode: { type: "STRING", enum: SHADING_MODE_KEYS },
                paletteMode: { type: "STRING", enum: PALETTE_MODE_KEYS },
                accessories: {
                  type: "ARRAY",
                  items: { type: "STRING", enum: ACCESSORY_KEYS },
                  description: "Face accessories to render"
                },
                enhancedPrompt: { type: "STRING", description: "An enhanced, detailed version of the user's prompt" }
              },
              required: ["stencilKey", "primary", "secondary", "trim", "shirt", "tie", "pants", "shoes", "skinColor", "hairColor", "eyeColor", "hairStyle", "eyeStyle", "detailTexture", "styleVibe", "shadingMode", "paletteMode", "accessories", "enhancedPrompt"],
            },
          },
        }),
      });

      if (!response.ok) {
        return NextResponse.json({ error: `Gemini API request failed: ${response.statusText}` }, { status: response.status });
      }

      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!resultText) {
        return NextResponse.json({ error: "No response layout from Gemini." }, { status: 500 });
      }

      apparel = JSON.parse(resultText.trim());
      inputTokens = data.usageMetadata?.promptTokenCount || 0;
      outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
    }

    if (!STENCIL_KEYS.includes(apparel.stencilKey)) {
      return NextResponse.json({ error: "Invalid stencil key from AI model" }, { status: 500 });
    }

    const colorFields: (keyof ApparelResult)[] = ["primary", "secondary", "trim", "shirt", "tie", "pants"];
    for (const field of colorFields) {
      if (!HEX_COLOR_RE.test(apparel[field] as string)) {
        return NextResponse.json({ error: `Invalid color value for ${field} from AI model` }, { status: 500 });
      }
    }
    if (apparel.shoes && !HEX_COLOR_RE.test(apparel.shoes)) apparel.shoes = undefined;

    // OpenAI has no schema enforcement, so fall back to safe defaults for any invalid enum value.
    if (!HAIR_STYLE_KEYS.includes(apparel.hairStyle)) apparel.hairStyle = "messy-fringe";
    if (!EYE_STYLE_KEYS.includes(apparel.eyeStyle)) apparel.eyeStyle = "cool-highlight";
    if (!PATTERN_KEYS.includes(apparel.detailTexture as any)) apparel.detailTexture = "none";
    if (!VIBE_KEYS.includes(apparel.styleVibe || "")) apparel.styleVibe = "neutral";
    if (!SHADING_MODE_KEYS.includes(apparel.shadingMode || "")) apparel.shadingMode = "soft";
    if (!PALETTE_MODE_KEYS.includes(apparel.paletteMode || "")) apparel.paletteMode = "full";

    // POST-PROCESSING: Override with explicitly extracted parameters
    if (promptAttributes.explicitParams.stencilKey && STENCIL_KEYS.includes(promptAttributes.explicitParams.stencilKey)) {
      apparel.stencilKey = promptAttributes.explicitParams.stencilKey;
    }
    if (promptAttributes.explicitParams.primary && HEX_COLOR_RE.test(promptAttributes.explicitParams.primary)) {
      apparel.primary = promptAttributes.explicitParams.primary;
    }
    if (promptAttributes.explicitParams.secondary && HEX_COLOR_RE.test(promptAttributes.explicitParams.secondary)) {
      apparel.secondary = promptAttributes.explicitParams.secondary;
    }
    if (promptAttributes.explicitParams.trim && HEX_COLOR_RE.test(promptAttributes.explicitParams.trim)) {
      apparel.trim = promptAttributes.explicitParams.trim;
    }
    if (promptAttributes.explicitParams.pants && HEX_COLOR_RE.test(promptAttributes.explicitParams.pants)) {
      apparel.pants = promptAttributes.explicitParams.pants;
    }
    if (promptAttributes.explicitParams.tie && HEX_COLOR_RE.test(promptAttributes.explicitParams.tie)) {
      apparel.tie = promptAttributes.explicitParams.tie;
    }
    if (promptAttributes.explicitParams.shirt && HEX_COLOR_RE.test(promptAttributes.explicitParams.shirt)) {
      apparel.shirt = promptAttributes.explicitParams.shirt;
    }
    if (promptAttributes.explicitParams.accessories && Array.isArray(promptAttributes.explicitParams.accessories)) {
      apparel.accessories = promptAttributes.explicitParams.accessories.filter((a: string) => ACCESSORY_KEYS.includes(a as any));
    }
    if (promptAttributes.explicitParams.preferredHairStyles && Array.isArray(promptAttributes.explicitParams.preferredHairStyles)) {
      const validHairStyles = promptAttributes.explicitParams.preferredHairStyles.filter((h: string) => HAIR_STYLE_KEYS.includes(h));
      if (validHairStyles.length > 0) {
        apparel.hairStyle = validHairStyles[0];
      }
    }
    if (promptAttributes.explicitParams.preferredEyeStyles && Array.isArray(promptAttributes.explicitParams.preferredEyeStyles)) {
      const validEyeStyles = promptAttributes.explicitParams.preferredEyeStyles.filter((e: string) => EYE_STYLE_KEYS.includes(e));
      if (validEyeStyles.length > 0) {
        apparel.eyeStyle = validEyeStyles[0];
      }
    }

    // The dataset is used purely as retrieval-grounded reference material
    // (the few-shot examples above) — the actual pixels are always
    // procedurally generated from the AI's (prompt-fidelity-checked) choices
    // so every skin is unique to its prompt instead of a verbatim copy of
    // an existing dataset image.
    const skinArray = generateSkinArray(
      demographic || "East Asian",
      apparel.stencilKey,
      {
        primary: apparel.primary,
        secondary: apparel.secondary,
        trim: apparel.trim,
        shirt: apparel.shirt,
        tie: apparel.tie,
        pants: apparel.pants,
        shoes: apparel.shoes,
      },
      !!isAlex,
      apparel.accessories || [],
      {
        skinColor: apparel.skinColor,
        hairColor: apparel.hairColor,
        eyeColor: apparel.eyeColor,
        hairStyle: apparel.hairStyle,
        eyeStyle: apparel.eyeStyle,
        detailTexture: apparel.detailTexture,
        styleVibe: apparel.styleVibe as 'masculine' | 'feminine' | 'neutral' | undefined,
        shadingMode: apparel.shadingMode as 'soft' | 'graphic' | undefined,
        paletteMode: apparel.paletteMode as 'full' | 'monochrome' | 'complementary' | 'analogous' | 'split-complementary' | 'triadic' | undefined,
      }
    );

    const base64Skin = skinToBase64(skinArray);

    await db.execute({
      sql: `INSERT INTO avatar_registry (user_id, skin_array, role, ethnicity, model_type)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              skin_array = excluded.skin_array,
              role = excluded.role,
              ethnicity = excluded.ethnicity,
              model_type = excluded.model_type`,
      args: [
        userId,
        base64Skin,
        apparel.stencilKey,
        demographic || "East Asian",
        isAlex ? "alex" : "steve",
      ],
    });

    const pricing = PRICING[selectedModel] || { inRate: 0, outRate: 0 };
    const cost = (inputTokens * pricing.inRate) + (outputTokens * pricing.outRate);

    return NextResponse.json({
      success: true,
      skin: base64Skin,
      apparel,
      cost,
      usage: {
        promptTokenCount: inputTokens,
        candidatesTokenCount: outputTokens
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API Generate Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
