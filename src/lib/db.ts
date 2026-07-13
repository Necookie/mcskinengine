import { createClient, type Client } from "@libsql/client";

let _db: Client | null = null;

export function getDb(): Client {
  if (!_db) {
    const url = process.env.TURSO_DATABASE_URL;
    const token = process.env.TURSO_AUTH_TOKEN;
    if (!url || !token) {
      throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");
    }
    _db = createClient({ url, authToken: token });
    // Bypass buggy schema migration checks in @libsql/client
    (_db as any).getIsSchemaDatabase = async () => false;
  }
  return _db;
}

export const db = {
  execute: (opts: { sql: string; args?: unknown[] }) => getDb().execute(opts),
  batch: (stmts: { sql: string; args?: unknown[] }[]) => getDb().batch(stmts),
  transaction: (fn: (tx: any) => Promise<void>) => getDb().transaction(fn),
} as unknown as Client;

export async function initializeDatabase() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        gemini_key TEXT
      );
    `);
    
    try {
      await db.execute("ALTER TABLE user_settings ADD COLUMN openai_key TEXT;");
    } catch {
      // Column already exists
    }
    
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

    await db.execute(`
      CREATE TABLE IF NOT EXISTS skin_references (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        cluster_id INTEGER NOT NULL,
        description TEXT,
        dominant_colors TEXT,
        brightness_category TEXT,
        saturation_category TEXT,
        dominant_hue_category TEXT,
        embedding BLOB,
        features_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_cluster_id ON skin_references(cluster_id);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_hue ON skin_references(dominant_hue_category);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_brightness ON skin_references(brightness_category);
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
