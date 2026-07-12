import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM mcp_logs ORDER BY timestamp DESC LIMIT 20",
      args: []
    });

    const logs = result.rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id,
      toolName: row.tool_name,
      arguments: JSON.parse(row.arguments as string || "{}"),
      status: row.status
    }));

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error("MCP Logs GET error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
