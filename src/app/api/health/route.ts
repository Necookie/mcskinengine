import { NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Public health check endpoint for uptime monitors, Cloudflare, and CI pipelines.
 * Returns a 200 with a simple JSON payload confirming the service is reachable.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "mcskinengine",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
