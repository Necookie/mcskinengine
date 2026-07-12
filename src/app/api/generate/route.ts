import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { generateSkinArray, skinToBase64 } from "@/lib/skinEngine";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's encrypted Gemini key
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
    } catch (e) {
      return NextResponse.json({ error: "Failed to decrypt API Key. Please re-enter it." }, { status: 500 });
    }

    const { prompt, image, demographic, isAlex } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Build the request contents for Gemini
    const contents: any[] = [];
    const textPart = { text: `You are an expert designer analyzing a uniform reference description or image to generate styling attributes. Based on: "${prompt}", determine the closest stencil style and hex colors. Stencil keys are "hoodie", "blazer", "labcoat". Output standard hex strings for: primary, secondary, trim, shirt, tie, pants.` };
    
    const parts: any[] = [textPart];

    if (image) {
      // Ingesting reference picture. Assuming base64 format (e.g. "data:image/png;base64,iVBORw...")
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

    contents.push({ parts });

    // Call Gemini API
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
      const errorText = await response.text();
      return NextResponse.json({ error: `Gemini API error: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      return NextResponse.json({ error: "No response layout from Gemini." }, { status: 500 });
    }

    const apparel = JSON.parse(resultText.trim());

    // Generate skin array via the skin engine
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

    // Save generated skin to Turso DB
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
