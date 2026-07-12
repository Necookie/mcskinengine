import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const runtime = "edge";

const VALID_ROLES = ["hoodie", "blazer", "labcoat"];
const VALID_DEMOGRAPHICS = ["East Asian", "South Asian", "Caucasian", "Black"];
const VALID_MODEL_TYPES = ["steve", "alex"];

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { skin, role, ethnicity, modelType } = body;

    if (!skin || typeof skin !== "string") {
      return NextResponse.json({ error: "Skin data must be a non-empty string" }, { status: 400 });
    }

    if (role && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 });
    }

    if (ethnicity && !VALID_DEMOGRAPHICS.includes(ethnicity)) {
      return NextResponse.json({ error: `Invalid ethnicity. Must be one of: ${VALID_DEMOGRAPHICS.join(", ")}` }, { status: 400 });
    }

    if (modelType && !VALID_MODEL_TYPES.includes(modelType)) {
      return NextResponse.json({ error: `Invalid modelType. Must be one of: ${VALID_MODEL_TYPES.join(", ")}` }, { status: 400 });
    }

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Save skin API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
