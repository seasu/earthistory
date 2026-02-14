/**
 * Enrich seed events with Wikipedia images.
 *
 * Usage:
 *   node apps/api/scripts/ingest-wikipedia-images.mjs
 *
 * Reads:  infra/data/seed/events.seed.json
 * Writes: infra/data/seed/events.seed.json (updated in place with image_url)
 *
 * Uses the Wikipedia REST API (no auth required) to find thumbnail images
 * for each event based on its title or a provided wikipedia_title field.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary";
const DELAY_MS = 200; // be polite to Wikipedia

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchWikipediaImage = async (title) => {
  const encoded = encodeURIComponent(title.replace(/ /g, "_"));
  try {
    const res = await fetch(`${WIKI_API}/${encoded}`, {
      headers: { "User-Agent": "Earthistory/0.1 (educational project)" }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      imageUrl: data.thumbnail?.source ?? data.originalimage?.source ?? null,
      wikipediaUrl: data.content_urls?.desktop?.page ?? null,
      extract: data.extract ?? null
    };
  } catch {
    return null;
  }
};

const detectRepoRoot = async () => {
  const cwd = process.cwd();
  const { access } = await import("node:fs/promises");
  const candidates = [cwd, path.resolve(cwd, "../..")];
  for (const c of candidates) {
    try {
      await access(path.join(c, "pnpm-workspace.yaml"));
      return c;
    } catch { /* try next */ }
  }
  throw new Error("Cannot detect repo root");
};

const run = async () => {
  const root = await detectRepoRoot();
  const seedPath = path.join(root, "infra/data/seed/events.seed.json");
  const raw = await readFile(seedPath, "utf8");
  const parsed = JSON.parse(raw);

  let enriched = 0;
  let skipped = 0;

  for (const event of parsed.events) {
    if (event.image_url) {
      skipped++;
      continue;
    }

    const searchTitle = event.wikipedia_title || event.title;
    console.log(`Fetching: ${searchTitle}`);

    const result = await fetchWikipediaImage(searchTitle);
    if (result?.imageUrl) {
      event.image_url = result.imageUrl;
      event.wikipedia_url = result.wikipediaUrl;
      event.image_attribution = "Wikimedia Commons (CC BY-SA / Public Domain)";
      enriched++;
      console.log(`  -> Found image`);
    } else {
      console.log(`  -> No image found`);
    }

    await sleep(DELAY_MS);
  }

  await writeFile(seedPath, JSON.stringify(parsed, null, 2), "utf8");

  console.log(JSON.stringify({
    ok: true,
    total: parsed.events.length,
    enriched,
    skipped,
    outputPath: seedPath
  }, null, 2));
};

run();
