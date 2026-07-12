import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";

export const runtime = "edge";

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}${"•".repeat(key.length - 8)}${key.slice(-4)}`;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db.execute({
      sql: "SELECT gemini_key, openai_key FROM user_settings WHERE user_id = ? LIMIT 1",
      args: [userId]
    });

    if (result.rows.length === 0) {
      return NextResponse.json({
        hasKey: false,
        maskedKey: "",
        hasGeminiKey: false,
        maskedGeminiKey: "",
        hasOpenaiKey: false,
        maskedOpenaiKey: ""
      });
    }

    const row = result.rows[0];
    const geminiKeyEnc = row.gemini_key as string;
    const openaiKeyEnc = row.openai_key as string;

    let hasGeminiKey = false;
    let maskedGeminiKey = "";
    if (geminiKeyEnc) {
      const decrypted = await decrypt(geminiKeyEnc);
      hasGeminiKey = true;
      maskedGeminiKey = maskKey(decrypted);
    }

    let hasOpenaiKey = false;
    let maskedOpenaiKey = "";
    if (openaiKeyEnc) {
      const decrypted = await decrypt(openaiKeyEnc);
      hasOpenaiKey = true;
      maskedOpenaiKey = maskKey(decrypted);
    }

    return NextResponse.json({
      hasKey: hasGeminiKey,
      maskedKey: maskedGeminiKey,
      hasGeminiKey,
      maskedGeminiKey,
      hasOpenaiKey,
      maskedOpenaiKey
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { geminiKey, openaiKey } = await req.json();
    
    const updates: Record<string, string> = {};
    
    if (geminiKey !== undefined) {
      if (typeof geminiKey !== "string") {
        return NextResponse.json({ error: "geminiKey must be a string" }, { status: 400 });
      }
      updates.gemini_key = geminiKey ? await encrypt(geminiKey) : "";
    }

    if (openaiKey !== undefined) {
      if (typeof openaiKey !== "string") {
        return NextResponse.json({ error: "openaiKey must be a string" }, { status: 400 });
      }
      updates.openai_key = openaiKey ? await encrypt(openaiKey) : "";
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true });
    }

    const checkResult = await db.execute({
      sql: "SELECT 1 FROM user_settings WHERE user_id = ? LIMIT 1",
      args: [userId]
    });

    if (checkResult.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO user_settings (user_id, gemini_key, openai_key) VALUES (?, ?, ?)`,
        args: [
          userId,
          updates.gemini_key || "",
          updates.openai_key || ""
        ]
      });
    } else {
      const setClauses: string[] = [];
      const args: unknown[] = [];
      for (const [col, val] of Object.entries(updates)) {
        setClauses.push(`${col} = ?`);
        args.push(val);
      }
      args.push(userId);
      await db.execute({
        sql: `UPDATE user_settings SET ${setClauses.join(", ")} WHERE user_id = ?`,
        args
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Settings POST error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
