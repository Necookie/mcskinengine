import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { generateSkinArray, skinToBase64 } from "@/lib/skinEngine";

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
}

const VALID_STENCILS = ["hoodie", "blazer", "labcoat"];
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const PRICING: Record<string, { inRate: number; outRate: number }> = {
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

    const promptText = `You are an expert designer analyzing a uniform reference description or image to generate styling attributes.
Based on the user's description, determine the closest stencil style and hex colors.
You must return a JSON object with EXACTLY the following keys:
- stencilKey (must be "hoodie", "blazer", or "labcoat")
- primary (hex color string like "#ffffff")
- secondary (hex color string)
- trim (hex color string)
- shirt (hex color string)
- tie (hex color string)
- pants (hex color string)

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
                stencilKey: { type: "STRING", enum: ["hoodie", "blazer", "labcoat"] },
                primary: { type: "STRING", description: "Primary hex color" },
                secondary: { type: "STRING", description: "Secondary hex color" },
                trim: { type: "STRING", description: "Trim hex color" },
                shirt: { type: "STRING", description: "Shirt hex color" },
                tie: { type: "STRING", description: "Tie hex color" },
                pants: { type: "STRING", description: "Pants hex color" },
              },
              required: ["stencilKey", "primary", "secondary", "trim", "shirt", "tie", "pants"],
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

    if (!VALID_STENCILS.includes(apparel.stencilKey)) {
      return NextResponse.json({ error: "Invalid stencil key from AI model" }, { status: 500 });
    }

    const colorFields: (keyof ApparelResult)[] = ["primary", "secondary", "trim", "shirt", "tie", "pants"];
    for (const field of colorFields) {
      if (!HEX_COLOR_RE.test(apparel[field])) {
        return NextResponse.json({ error: `Invalid color value for ${field} from AI model` }, { status: 500 });
      }
    }

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
      },
      !!isAlex
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
