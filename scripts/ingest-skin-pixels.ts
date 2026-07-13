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

const DATASET_PATH = "C:\\Users\\dheyn\\Downloads\\archive\\skins";

async function ingestSkinPixels() {
  console.log("Ingesting skin pixel data from dataset...");

  // Add pixel_data column if it doesn't exist
  try {
    await db.execute({ sql: "ALTER TABLE skin_references ADD COLUMN pixel_data TEXT", args: [] });
    console.log("Added pixel_data column");
  } catch (e) {
    console.log("pixel_data column already exists");
  }

  // Get all skin files
  const files = fs.readdirSync(DATASET_PATH).filter(f => f.endsWith(".png") || f.endsWith(".jpg"));
  console.log(`Found ${files.length} skin files`);

  let processed = 0;
  let errors = 0;
  const batchSize = 50;
  const batch: Array<{ sql: string; args: any[] }> = [];

  for (const file of files) {
    try {
      const filePath = path.join(DATASET_PATH, file);
      const imageBuffer = fs.readFileSync(filePath);
      const base64Data = imageBuffer.toString("base64");
      const id = file.replace(/\.(png|jpg)$/i, "");

      batch.push({
        sql: "UPDATE skin_references SET pixel_data = ? WHERE id = ?",
        args: [base64Data, id],
      });

      if (batch.length >= batchSize) {
        await db.batch(batch);
        processed += batch.length;
        batch.length = 0;

        if (processed % 500 === 0) {
          console.log(`Processed ${processed}/${files.length}...`);
        }
      }
    } catch (error) {
      errors++;
      if (errors <= 5) {
        console.error(`Error processing ${file}:`, error);
      }
    }
  }

  if (batch.length > 0) {
    await db.batch(batch);
    processed += batch.length;
  }

  console.log(`\nDone! Processed ${processed} skins (${errors} errors)`);
}

ingestSkinPixels().catch(console.error);
