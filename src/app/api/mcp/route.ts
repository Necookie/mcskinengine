import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateSkinArray, skinToBase64 } from "@/lib/skinEngine";
import { STENCIL_KEYS } from "@/lib/stencils";

export const runtime = "edge";

const VALID_DEMOGRAPHICS = ["East Asian", "South Asian", "Caucasian", "Black"] as const;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function verifyMcpAuth(req: NextRequest): boolean {
  const mcpKey = process.env.MCP_API_KEY;
  if (!mcpKey) return false;
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;
  return authHeader === `Bearer ${mcpKey}`;
}

function isValidHex(val: unknown): val is string {
  return typeof val === "string" && HEX_COLOR_RE.test(val);
}

function errorResponse(code: number, message: string, status: number, id?: unknown) {
  return NextResponse.json({
    jsonrpc: "2.0",
    error: { code, message },
    id: id ?? null
  }, { status });
}

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
          stencilKey: { type: "string", enum: STENCIL_KEYS, description: "Uniform stencil key" },
          primaryColor: { type: "string", description: "Primary hex color code (e.g. #ff0000)" },
          secondaryColor: { type: "string", description: "Secondary hex color code" },
          trimColor: { type: "string", description: "Trim hex color code" },
          shirtColor: { type: "string", description: "Shirt hex color code" },
          tieColor: { type: "string", description: "Tie hex color code" },
          pantsColor: { type: "string", description: "Pants hex color code" },
          shoesColor: { type: "string", description: "Shoes hex color code (optional)" },
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

export async function GET(req: NextRequest) {
  if (!verifyMcpAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(toolsSchema);
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyMcpAuth(req)) {
      return NextResponse.json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Unauthorized: invalid or missing bearer token" }
      }, { status: 401 });
    }

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
      if (!params) {
        return errorResponse(-32602, "Missing params object", 400, reqId);
      }
      const { name, arguments: args } = params;

      if (!args || !args.userId || typeof args.userId !== "string") {
        return errorResponse(-32602, "Missing required argument: userId", 400, reqId);
      }

      const userId = args.userId;
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
        if (!STENCIL_KEYS.includes(stencilKey)) {
          return errorResponse(-32602, `Invalid stencilKey. Must be one of: ${STENCIL_KEYS.join(", ")}`, 400, reqId);
        }

        const colorFields = ["primaryColor", "secondaryColor", "trimColor", "shirtColor", "tieColor", "pantsColor"] as const;
        for (const field of colorFields) {
          if (!isValidHex(args[field])) {
            return errorResponse(-32602, `Invalid or missing ${field}: must be a hex color (e.g. #ff0000)`, 400, reqId);
          }
        }
        if (args.shoesColor !== undefined && !isValidHex(args.shoesColor)) {
          return errorResponse(-32602, `Invalid shoesColor: must be a hex color (e.g. #ff0000)`, 400, reqId);
        }

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
            pants: args.pantsColor,
            shoes: args.shoesColor
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
        if (!VALID_DEMOGRAPHICS.includes(demographic)) {
          return errorResponse(-32602, `Invalid demographic. Must be one of: ${VALID_DEMOGRAPHICS.join(", ")}`, 400, reqId);
        }
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
        return errorResponse(-32601, `Method not found: ${name}`, 404, reqId);
      }

      await db.execute({
        sql: `INSERT INTO mcp_logs (user_id, tool_name, arguments, status) VALUES (?, ?, ?, ?)`,
        args: [userId, name, JSON.stringify(args), "success"]
      });

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseKey) {
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
          console.error("Supabase broadcast error:", err);
        }
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

    return errorResponse(-32600, "Invalid Request", 400, reqId);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    console.error("MCP endpoint error:", error);
    return errorResponse(-32603, message, 500);
  }
}
