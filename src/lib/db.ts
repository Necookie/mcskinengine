import { createClient, type Client } from "@libsql/client";

let _db: Client | null = null;

function getDb(): Client {
  if (!_db) {
    const url = process.env.TURSO_DATABASE_URL;
    const token = process.env.TURSO_AUTH_TOKEN;
    if (!url || !token) {
      throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");
    }
    _db = createClient({ url, authToken: token });
    (_db as any).getIsSchemaDatabase = async () => false;
  }
  return _db;
}

export const db = new Proxy({} as Client, {
  get(_, prop) {
    return (getDb() as any)[prop];
  }
});

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
