import { db } from "../src/lib/db";
import * as fs from "fs";
import * as path from "path";

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#][^=]*)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

interface SkinEmbedding {
  filename: string;
  cluster_id: number;
  description: string;
  embedding: number[];
  features: any;
}

async function populateSkinReferences() {
  console.log("Populating skin_references table...");

  console.log("Creating table if not exists...");
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS skin_references (
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
    )`,
    args: [],
  });

  await db.execute({ sql: "CREATE INDEX IF NOT EXISTS idx_cluster_id ON skin_references(cluster_id)", args: [] });
  await db.execute({ sql: "CREATE INDEX IF NOT EXISTS idx_hue ON skin_references(dominant_hue_category)", args: [] });
  await db.execute({ sql: "CREATE INDEX IF NOT EXISTS idx_brightness ON skin_references(brightness_category)", args: [] });
  console.log("Table ready.");

  const embeddingsPath = path.join(process.cwd(), "reference_data", "skin_embeddings.json");
  
  if (!fs.existsSync(embeddingsPath)) {
    console.error("skin_embeddings.json not found. Run the Python pipeline first.");
    return;
  }

  const data: SkinEmbedding[] = JSON.parse(fs.readFileSync(embeddingsPath, "utf-8"));
  console.log(`Found ${data.length} skin embeddings to insert`);

  let inserted = 0;
  let errors = 0;
  const batchSize = 100;
  const batch: Array<{ sql: string; args: any[] }> = [];

  for (const item of data) {
    try {
      const features = item.features;
      const stats = features?.statistics || {};
      const palette = features?.palette || {};
      
      const dominantColors = JSON.stringify((palette.colors || []).slice(0, 5));
      const featuresJson = JSON.stringify(features);
      
      const id = item.filename.replace(/\.(jpg|png)$/i, "");
      
      batch.push({
        sql: `INSERT OR REPLACE INTO skin_references (
          id, filename, cluster_id, description, dominant_colors,
          brightness_category, saturation_category, dominant_hue_category,
          features_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          item.filename,
          item.cluster_id,
          item.description,
          dominantColors,
          stats.brightness_category || "medium",
          stats.saturation_category || "moderate",
          stats.dominant_hue_category || "neutral",
          featuresJson,
        ],
      });
      
      if (batch.length >= batchSize) {
        await db.batch(batch);
        inserted += batch.length;
        batch.length = 0;
        
        if (inserted % 500 === 0) {
          console.log(`Inserted ${inserted}/${data.length}...`);
        }
      }
    } catch (error) {
      errors++;
      if (errors <= 5) {
        console.error(`Error inserting ${item.filename}:`, error);
      }
    }
  }

  if (batch.length > 0) {
    await db.batch(batch);
    inserted += batch.length;
  }

  console.log(`\nDone! Inserted ${inserted} skins (${errors} errors)`);
}

populateSkinReferences().catch(console.error);
