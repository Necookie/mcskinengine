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

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settingsResult = await db.execute({
      sql: "SELECT gemini_key FROM user_settings WHERE user_id = ? LIMIT 1",
      args: [userId],
    });

    if (settingsResult.rows.length === 0 || !settingsResult.rows[0].gemini_key) {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Please save your API Key in Settings." },
        { status: 400 }
      );
    }

    const encryptedKey = settingsResult.rows[0].gemini_key as string;
    let apiKey: string;
    try {
      apiKey = await decrypt(encryptedKey);
    } catch {
      return NextResponse.json({ error: "Failed to decrypt API Key. Please re-enter it." }, { status: 500 });
    }

    const body = await req.json();
    const { prompt, image, demographic, isAlex } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const parts: GeminiPart[] = [{
      text: `You are an expert designer analyzing a uniform reference description or image to generate styling attributes. Based on the user's description, determine the closest stencil style and hex colors. Stencil keys are "hoodie", "blazer", "labcoat". Output standard hex strings for: primary, secondary, trim, shirt, tie, pants. User description: ${prompt}`
    }];

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

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
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
      return NextResponse.json({ error: "Gemini API request failed" }, { status: response.status });
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      return NextResponse.json({ error: "No response layout from Gemini." }, { status: 500 });
    }

    let apparel: ApparelResult;
    try {
      apparel = JSON.parse(resultText.trim());
    } catch {
      return NextResponse.json({ error: "Failed to parse Gemini response" }, { status: 500 });
    }

    if (!VALID_STENCILS.includes(apparel.stencilKey)) {
      return NextResponse.json({ error: "Invalid stencil key from Gemini" }, { status: 500 });
    }

    const colorFields: (keyof ApparelResult)[] = ["primary", "secondary", "trim", "shirt", "tie", "pants"];
    for (const field of colorFields) {
      if (!HEX_COLOR_RE.test(apparel[field])) {
        return NextResponse.json({ error: `Invalid color value for ${field} from Gemini` }, { status: 500 });
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

    return NextResponse.json({
      success: true,
      skin: base64Skin,
      apparel,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API Generate Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
