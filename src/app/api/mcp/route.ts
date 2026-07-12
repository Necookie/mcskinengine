import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateSkinArray, skinToBase64 } from "@/lib/skinEngine";

export const runtime = "edge";

// Tool list schema for GET requests
const toolsSchema = {
  tools: [
    {
      name: "apply_apparel",
      description: "Applies an institutional uniform apparel overlay to the user's skin.",
      inputSchema: {
        type: "object",
        properties: {
          userId: { type: "string", description: "Clerk User ID to apply the skin to" },
          stencilKey: { type: "string", enum: ["hoodie", "blazer", "labcoat"], description: "Uniform stencil key" },
          primaryColor: { type: "string", description: "Primary hex color code (e.g. #ff0000)" },
          secondaryColor: { type: "string", description: "Secondary hex color code" },
          trimColor: { type: "string", description: "Trim hex color code" },
          shirtColor: { type: "string", description: "Shirt hex color code" },
          tieColor: { type: "string", description: "Tie hex color code" },
          pantsColor: { type: "string", description: "Pants hex color code" },
          isAlex: { type: "boolean", description: "Use Alex (slim) model silhouette if true" }
        },
        required: ["userId", "stencilKey", "primaryColor", "secondaryColor", "trimColor", "shirtColor", "tieColor", "pantsColor"]
      }
    },
    {
      name: "paint_demographic_base",
      description: "Paints a demographic base skin tone, hair, and eye configuration.",
      inputSchema: {
        type: "object",
        properties: {
          userId: { type: "string", description: "Clerk User ID to apply the skin to" },
          demographic: { type: "string", enum: ["East Asian", "South Asian", "Caucasian", "Black"], description: "Demographic category" },
          isAlex: { type: "boolean", description: "Use Alex (slim) model silhouette if true" }
        },
        required: ["userId", "demographic"]
      }
    }
  ]
};

export async function GET() {
  return NextResponse.json(toolsSchema);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { method, params, id: reqId } = body;

    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        result: toolsSchema,
        id: reqId
      });
    }

    if (method === "tools/call") {
      const { name, arguments: args } = params;

      if (!args || !args.userId) {
        return NextResponse.json({
          jsonrpc: "2.0",
          error: { code: -32602, message: "Missing required argument: userId" },
          id: reqId
        }, { status: 400 });
      }

      const userId = args.userId;
      let status = "success";
      let message = "";

      // Fetch current avatar state if it exists
      const existing = await db.execute({
        sql: "SELECT * FROM avatar_registry WHERE user_id = ? LIMIT 1",
        args: [userId]
      });

      let currentRole = "hoodie";
      let currentEthnicity = "East Asian";
      let currentModelType = "steve";

      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        currentRole = (row.role as string) || currentRole;
        currentEthnicity = (row.ethnicity as string) || currentEthnicity;
        currentModelType = (row.model_type as string) || currentModelType;
      }

      if (name === "apply_apparel") {
        const stencilKey = args.stencilKey;
        const isAlex = args.isAlex !== undefined ? !!args.isAlex : (currentModelType === "alex");
        
        const skinArray = generateSkinArray(
          currentEthnicity,
          stencilKey,
          {
            primary: args.primaryColor,
            secondary: args.secondaryColor,
            trim: args.trimColor,
            shirt: args.shirtColor,
            tie: args.tieColor,
            pants: args.pantsColor
          },
          isAlex
        );

        const base64Skin = skinToBase64(skinArray);

        // Update database
        await db.execute({
          sql: `INSERT INTO avatar_registry (user_id, skin_array, role, ethnicity, model_type)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                  skin_array = excluded.skin_array,
                  role = excluded.role,
                  model_type = excluded.model_type`,
          args: [userId, base64Skin, stencilKey, currentEthnicity, isAlex ? "alex" : "steve"]
        });

        message = `Applied apparel stencil ${stencilKey} to user ${userId}`;

      } else if (name === "paint_demographic_base") {
        const demographic = args.demographic;
        const isAlex = args.isAlex !== undefined ? !!args.isAlex : (currentModelType === "alex");

        // Use default apparel colors for current role
        const skinArray = generateSkinArray(
          demographic,
          currentRole,
          {
            primary: "#ff5555",
            secondary: "#ffffff",
            trim: "#5555ff",
            shirt: "#ffffff",
            tie: "#ff2222",
            pants: "#333333"
          },
          isAlex
        );

        const base64Skin = skinToBase64(skinArray);

        await db.execute({
          sql: `INSERT INTO avatar_registry (user_id, skin_array, role, ethnicity, model_type)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                  skin_array = excluded.skin_array,
                  ethnicity = excluded.ethnicity,
                  model_type = excluded.model_type`,
          args: [userId, base64Skin, currentRole, demographic, isAlex ? "alex" : "steve"]
        });

        message = `Painted demographic base ${demographic} for user ${userId}`;

      } else {
        return NextResponse.json({
          jsonrpc: "2.0",
          error: { code: -32601, message: `Method not found: ${name}` },
          id: reqId
        }, { status: 404 });
      }

      // Log the MCP call to database
      await db.execute({
        sql: `INSERT INTO mcp_logs (user_id, tool_name, arguments, status) VALUES (?, ?, ?, ?)`,
        args: [userId, name, JSON.stringify(args), status]
      });

      // Hit Supabase Realtime broadcast hook (simulated endpoint)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://REDACTED.supabase.co";
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "REDACTED_SUPABASE_KEY";
      
      try {
        await fetch(`${supabaseUrl}/functions/v1/broadcast`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            channel: "mcp-updates",
            event: "skin_updated",
            payload: { userId, tool: name, message, timestamp: new Date().toISOString() }
          })
        });
      } catch (err) {
        // Suppress network errors in edge sandbox
      }

      return NextResponse.json({
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: `[MCP Success] ${message}`
            }
          ]
        },
        id: reqId
      });
    }

    return NextResponse.json({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Invalid Request" },
      id: reqId
    }, { status: 400 });

  } catch (error: any) {
    console.error("MCP endpoint error:", error);
    return NextResponse.json({
      jsonrpc: "2.0",
      error: { code: -32603, message: error.message || "Internal Error" }
    }, { status: 500 });
  }
}
