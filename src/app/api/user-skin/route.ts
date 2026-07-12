import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, initializeDatabase } from "@/lib/db";
import { generateSkinArray, skinToBase64 } from "@/lib/skinEngine";

export const runtime = "edge";

// Hardwire Clerk credentials
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_REDACTED";
process.env.CLERK_SECRET_KEY = "sk_test_REDACTED";

export async function GET(req: NextRequest) {
  try {
    await initializeDatabase();
    
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db.execute({
      sql: "SELECT * FROM avatar_registry WHERE user_id = ? LIMIT 1",
      args: [userId]
    });

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return NextResponse.json({
        skin: row.skin_array,
        role: row.role || "hoodie",
        ethnicity: row.ethnicity || "East Asian",
        modelType: row.model_type || "steve"
      });
    }

    // Default skin generation if first-time load
    const defaultSkinArray = generateSkinArray(
      "East Asian",
      "hoodie",
      {
        primary: "#1c1c1d",
        secondary: "#ebd3be",
        trim: "#ff2a85",
        shirt: "#ffffff",
        tie: "#ff2222",
        pants: "#b3d7df"
      },
      false
    );
    const defaultSkinBase64 = skinToBase64(defaultSkinArray);

    await db.execute({
      sql: `INSERT INTO avatar_registry (user_id, skin_array, role, ethnicity, model_type)
            VALUES (?, ?, ?, ?, ?)`,
      args: [userId, defaultSkinBase64, "hoodie", "East Asian", "steve"]
    });

    return NextResponse.json({
      skin: defaultSkinBase64,
      role: "hoodie",
      ethnicity: "East Asian",
      modelType: "steve"
    });
  } catch (error: any) {
    console.error("User Skin GET error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
