import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const runtime = "edge";

function safeJsonParse(str: string): Record<string, unknown> {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db.execute({
      sql: "SELECT * FROM mcp_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 20",
      args: [userId]
    });

    const logs = result.rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id,
      toolName: row.tool_name,
      arguments: safeJsonParse((row.arguments as string) || "{}"),
      status: row.status
    }));

    return NextResponse.json({ logs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("MCP Logs GET error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
