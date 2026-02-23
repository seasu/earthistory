/**
 * load-seed-to-db.mjs
 *
 * Reads infra/data/seed/events.seed.json and upserts all events into the
 * PostgreSQL database. Safe to run on every deploy — uses ON CONFLICT DO NOTHING.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/load-seed-to-db.mjs
 *
 * If DATABASE_URL is not set, exits silently (allows local dev without DB).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

// Script lives at apps/api/scripts/ — repo root is three levels up
const REPO_ROOT = path.resolve(__dirname, "../../..");

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    log("DATABASE_URL not set — skipping seed load (ok for local dev)");
    process.exit(0);
  }

  const seedPath = path.join(REPO_ROOT, "infra/data/seed/events.seed.json");
  log(`Reading seed: ${seedPath}`);

  const { sources, events } = JSON.parse(await readFile(seedPath, "utf8"));
  log(`Seed: ${sources.length} source(s), ${events.length} event(s)`);

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  log("Connected to database");

  try {
    // ── Upsert sources ───────────────────────────────────────────────
    const sourceIdMap = new Map(); // seed source.id → DB row id
    for (const src of sources) {
      const { rows } = await client.query(
        `INSERT INTO sources (source_name, source_url, license, attribution_text, retrieved_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (source_name, source_url)
           DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, updated_at = NOW()
         RETURNING id`,
        [src.source_name, src.source_url, src.license, src.attribution_text, src.retrieved_at]
      );
      sourceIdMap.set(src.id, rows[0].id);
      log(`Source "${src.source_name}" → DB id ${rows[0].id}`);
    }

    // ── Insert events in batches of 100 ─────────────────────────────
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    const BATCH = 100;

    for (let i = 0; i < events.length; i += BATCH) {
      const batch = events.slice(i, i + BATCH);

      for (const event of batch) {
        const dbSourceId = sourceIdMap.get(event.source_id);
        if (!dbSourceId) {
          log(`WARN: unknown source_id "${event.source_id}" — skipping "${event.title}"`);
          skipped++;
          continue;
        }

        const coords = event.location?.coordinates;
        if (!coords || coords.length < 2) {
          skipped++;
          continue;
        }
        const [lng, lat] = coords;

        try {
          const { rowCount } = await client.query(
            `INSERT INTO events (
               title, summary, category, region_name,
               precision_level, confidence_score,
               time_start, time_end,
               location, source_id, source_url,
               image_url, wikipedia_url, youtube_video_id
             ) VALUES (
               $1,  $2,  $3,  $4,
               $5,  $6,
               $7,  $8,
               ST_SetSRID(ST_MakePoint($9, $10), 4326), $11, $12,
               $13, $14, $15
             )
             ON CONFLICT (source_url) DO NOTHING`,
            [
              event.title,
              event.summary || "",
              event.category,
              event.region_name || "",
              event.precision_level || "year",
              event.confidence_score ?? 1.0,
              event.time_start,
              event.time_end ?? null,
              lng,
              lat,
              dbSourceId,
              event.source_url,
              event.image_url ?? null,
              event.wikipedia_url ?? null,
              event.youtube_video_id ?? null,
            ]
          );
          if (rowCount > 0) inserted++;
          else skipped++; // deduped by source_url
        } catch (err) {
          log(`ERROR inserting "${event.title}": ${err.message}`);
          errors++;
        }
      }

      log(`Progress: ${Math.min(i + BATCH, events.length)}/${events.length} processed`);
    }

    log(`Done. Inserted: ${inserted}  Deduped/skipped: ${skipped}  Errors: ${errors}`);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
