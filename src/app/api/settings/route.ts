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
      sql: "SELECT gemini_key FROM user_settings WHERE user_id = ? LIMIT 1",
      args: [userId]
    });

    if (result.rows.length === 0 || !result.rows[0].gemini_key) {
      return NextResponse.json({ hasKey: false, maskedKey: "" });
    }

    const decryptedKey = await decrypt(result.rows[0].gemini_key as string);
    return NextResponse.json({ hasKey: true, maskedKey: maskKey(decryptedKey) });
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

    const { geminiKey } = await req.json();
    
    if (typeof geminiKey !== "string") {
      return NextResponse.json({ error: "geminiKey must be a string" }, { status: 400 });
    }

    let encryptedKey = "";
    if (geminiKey) {
      encryptedKey = await encrypt(geminiKey);
    }

    await db.execute({
      sql: `INSERT INTO user_settings (user_id, gemini_key)
            VALUES (?, ?)
            ON CONFLICT(user_id) DO UPDATE SET gemini_key = excluded.gemini_key`,
      args: [userId, encryptedKey]
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Settings POST error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
