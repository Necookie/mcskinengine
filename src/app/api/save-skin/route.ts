import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { skin, role, ethnicity, modelType } = await req.json();

    if (!skin) {
      return NextResponse.json({ error: "Skin data is required" }, { status: 400 });
    }

    // Save manual modifications directly
    await db.execute({
      sql: `INSERT INTO avatar_registry (user_id, skin_array, role, ethnicity, model_type)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              skin_array = excluded.skin_array,
              role = COALESCE(excluded.role, role),
              ethnicity = COALESCE(excluded.ethnicity, ethnicity),
              model_type = COALESCE(excluded.model_type, model_type)`,
      args: [
        userId,
        skin,
        role || null,
        ethnicity || null,
        modelType || "steve"
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Save skin API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
