import { createClient } from "@libsql/client";

const TURSO_URL = "libsql://REDACTED.turso.io";
const TURSO_TOKEN = "REDACTED_TURSO_TOKEN";

export const db = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

// Override getIsSchemaDatabase to bypass buggy schema migration checks on Turso
(db as any).getIsSchemaDatabase = async () => false;

export async function initializeDatabase() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        gemini_key TEXT
      );
    `);
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS avatar_registry (
        user_id TEXT PRIMARY KEY,
        skin_array TEXT,
        role TEXT,
        ethnicity TEXT,
        model_type TEXT
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS mcp_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT,
        tool_name TEXT,
        arguments TEXT,
        status TEXT
      );
    `);
    console.log("Database initialized successfully.");
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
}

// Automatically trigger database initialization on module import to ensure tables are always created
initializeDatabase().catch((err) => {
  console.error("Auto DB initialization failed:", err);
});
