/**
 * One-time enrichment pass over skin_references.
 *
 * The original ingest pipeline categorized dominant_hue/brightness/saturation
 * from the WHOLE skin texture, which is dominated by skin-tone and hair
 * pixels — so "red" almost never meant "red clothing". This script derives
 * clothing-specific color categories from apparel_result.primary/secondary
 * (already extracted to exclude skin tones) and rewrites `description` as a
 * human-readable title instead of a raw "brightness saturation hue colors:
 * #hex" template.
 */
import { db } from "../src/lib/db";
import { STENCILS } from "../src/lib/stencils";
import { HAIR_STYLES } from "../src/lib/hairStyles";
import { EYE_STYLES } from "../src/lib/eyeStyles";
import { nearestColorName, categorizeHue, hexToRgb, rgbToHsv } from "../src/lib/colorNaming";
import * as fs from "fs";
import * as path from "path";

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#][^=]*)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildDescription(apparel: any): string {
  const stencil = STENCILS[apparel.stencilKey];
  const stencilName = stencil?.name || apparel.stencilKey || "outfit";
  const primaryName = apparel.primary ? nearestColorName(apparel.primary) : null;
  const secondaryName = apparel.secondary ? nearestColorName(apparel.secondary) : null;
  const hair = HAIR_STYLES[apparel.hairStyle]?.name;
  const eyes = EYE_STYLES[apparel.eyeStyle]?.name;

  let desc = primaryName ? `${cap(primaryName)} ${stencilName}` : stencilName;
  if (secondaryName && secondaryName !== primaryName) {
    desc += ` with ${secondaryName} accents`;
  }
  if (Array.isArray(apparel.accessories) && apparel.accessories.length > 0) {
    desc += `, ${apparel.accessories.join(" & ")}`;
  }
  if (hair) desc += `, ${hair.toLowerCase()} hair`;
  if (eyes) desc += `, ${eyes.toLowerCase()} eyes`;
  if (apparel.styleVibe) desc += ` — ${apparel.styleVibe} vibe`;
  return desc;
}

async function main() {
  console.log("Adding clothing-specific category columns if missing...");
  for (const col of ["clothing_hue_category", "clothing_brightness_category", "clothing_saturation_category"]) {
    try {
      await db.execute({ sql: `ALTER TABLE skin_references ADD COLUMN ${col} TEXT`, args: [] });
      console.log(`  added ${col}`);
    } catch {
      console.log(`  ${col} already exists`);
    }
  }

  const result = await db.execute({
    sql: "SELECT id, apparel_result FROM skin_references WHERE apparel_result IS NOT NULL",
    args: [],
  });
  const rows = result.rows as unknown as { id: string; apparel_result: string }[];
  console.log(`Found ${rows.length} rows to enrich`);

  let updated = 0;
  let skipped = 0;
  const batch: { sql: string; args: any[] }[] = [];
  const batchSize = 100;

  for (const row of rows) {
    let apparel: any;
    try {
      apparel = JSON.parse(row.apparel_result);
    } catch {
      skipped++;
      continue;
    }

    const primary = apparel.primary;
    const secondary = apparel.secondary;
    if (!primary || !/^#[0-9a-fA-F]{6}$/.test(primary)) {
      skipped++;
      continue;
    }

    const hue = categorizeHue(primary);
    // Average brightness/saturation across primary + secondary (when present)
    // so a two-tone outfit isn't skewed entirely by one swatch.
    const swatches = secondary && /^#[0-9a-fA-F]{6}$/.test(secondary) ? [primary, secondary] : [primary];
    const hsvs = swatches.map((hex) => rgbToHsv(...hexToRgb(hex)));
    const avgSat = hsvs.reduce((sum, [, s]) => sum + s, 0) / hsvs.length;
    const avgVal = hsvs.reduce((sum, [, , v]) => sum + v, 0) / hsvs.length;
    const brightness = avgVal < 0.3 ? "dark" : avgVal < 0.7 ? "medium" : "light";
    const saturation = avgSat < 0.3 ? "muted" : avgSat < 0.7 ? "moderate" : "vivid";

    const description = buildDescription(apparel);

    batch.push({
      sql: `UPDATE skin_references SET
              description = ?,
              clothing_hue_category = ?,
              clothing_brightness_category = ?,
              clothing_saturation_category = ?
            WHERE id = ?`,
      args: [description, hue, brightness, saturation, row.id],
    });

    if (batch.length >= batchSize) {
      await db.batch(batch);
      updated += batch.length;
      batch.length = 0;
      if (updated % 1000 === 0) console.log(`  updated ${updated}/${rows.length}`);
    }
  }

  if (batch.length > 0) {
    await db.batch(batch);
    updated += batch.length;
  }

  console.log("Creating indexes on new columns...");
  await db.execute({ sql: "CREATE INDEX IF NOT EXISTS idx_clothing_hue ON skin_references(clothing_hue_category)", args: [] });
  await db.execute({ sql: "CREATE INDEX IF NOT EXISTS idx_clothing_brightness ON skin_references(clothing_brightness_category)", args: [] });
  await db.execute({ sql: "CREATE INDEX IF NOT EXISTS idx_clothing_saturation ON skin_references(clothing_saturation_category)", args: [] });

  console.log(`\nDone! Updated ${updated} rows (${skipped} skipped — no valid apparel_result)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
