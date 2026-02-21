#!/usr/bin/env node
/**
 * Bulk ingest historical events from Wikidata.
 *
 * Strategy:
 *   1. Query Wikidata for events WITH images (P18), coordinates (P625),
 *      and dates (P585/P580), grouped by type and era.
 *   2. Look up YouTube video IDs (P1651) for discovered entities.
 *   3. Write results to infra/data/seed/events.seed.json.
 *
 * Usage:
 *   node scripts/bulk-ingest.mjs                   # full run
 *   node scripts/bulk-ingest.mjs --dry-run          # preview counts only
 *   node scripts/bulk-ingest.mjs --era modern        # single era
 */

import { writeFile, readFile, mkdir } from "node:fs/promises";
import path from "node:path";

const USER_AGENT = "Earthistory/1.0 (https://github.com/seasu/earthistory; educational)";
const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const WIKI_REST = "https://en.wikipedia.org/api/rest_v1/page/summary";
const DELAY_MS = 1500;   // polite delay between SPARQL requests
const WIKI_DELAY = 150;  // delay between Wikipedia API calls

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Category mapping (mirrors wikidata.service.ts) ──────────────────
const CATEGORY_MAP = {
  war: "war", battle: "war", siege: "war", "military campaign": "war",
  conflict: "war", invasion: "war", "military operation": "war",
  "naval battle": "war", "aerial bombing": "war",
  election: "politics", treaty: "politics", assassination: "politics",
  "coup d'état": "politics", protest: "politics", revolution: "politics",
  "diplomatic mission": "politics", "peace treaty": "politics",
  painting: "culture", sculpture: "culture", novel: "culture",
  film: "culture", "literary work": "culture", composition: "culture",
  museum: "culture", festival: "culture", "world heritage site": "culture",
  city: "civilization", "capital city": "civilization",
  "archaeological site": "civilization", empire: "civilization",
  civilization: "civilization", dynasty: "civilization",
  discovery: "exploration", expedition: "exploration",
  "first ascent": "exploration", "space mission": "exploration",
  "human spaceflight": "exploration", voyage: "exploration",
  "scientific discovery": "science", invention: "technology",
  "technological development": "technology",
  religion: "religion", "religious movement": "religion",
  earthquake: "history", "volcanic eruption": "history",
  epidemic: "history", famine: "history", flood: "history",
  pandemic: "history", disaster: "history",
};

function categorize(typeLabel) {
  const lower = (typeLabel || "").toLowerCase();
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return val;
  }
  return "history";
}

// ── Era-based SPARQL queries ────────────────────────────────────────
// Each query targets a specific type + era to stay within SPARQL timeout.

const QUERIES = [
  // ── WARS & BATTLES (image-rich on Wikidata) ──
  {
    name: "Battles (ancient–medieval)",
    sparql: buildEventQuery("wdt:P31/wdt:P279* wd:Q178561", null, 1500, 400),
  },
  {
    name: "Battles (1500–1800)",
    sparql: buildEventQuery("wdt:P31/wdt:P279* wd:Q178561", 1500, 1800, 400),
  },
  {
    name: "Battles (1800–present)",
    sparql: buildEventQuery("wdt:P31/wdt:P279* wd:Q178561", 1800, null, 400),
  },
  {
    name: "Wars",
    sparql: buildEventQuery("wdt:P31/wdt:P279* wd:Q198", null, null, 300),
  },
  {
    name: "Sieges",
    sparql: buildEventQuery("wdt:P31/wdt:P279* wd:Q188055", null, null, 200),
  },

  // ── POLITICS & TREATIES ──
  {
    name: "Treaties",
    sparql: buildEventQuery("wdt:P31/wdt:P279* wd:Q131569", null, null, 300),
  },
  {
    name: "Revolutions",
    sparql: buildEventQuery("wdt:P31/wdt:P279* wd:Q10931", null, null, 200),
  },
  {
    name: "Assassinations",
    sparql: buildEventQuery("wdt:P31/wdt:P279* wd:Q3882219", null, null, 200),
  },

  // ── EXPLORATION & SPACE ──
  {
    name: "Expeditions",
    sparql: buildEventQuery("wdt:P31/wdt:P279* wd:Q2401485", null, null, 200),
  },
  {
    name: "Space missions",
    sparql: buildEventQuery("wdt:P31/wdt:P279* wd:Q5916", null, null, 300),
  },

  // ── CULTURE & CIVILIZATION ──
  {
    name: "Archaeological sites",
    sparql: buildEventQuery("wdt:P31/wdt:P279* wd:Q839954", null, null, 300),
  },
  {
    name: "World Heritage Sites",
    sparql: buildEventQuery("wdt:P31/wdt:P279* wd:Q9259", null, null, 300),
  },

  // ── SCIENCE & TECHNOLOGY ──
  {
    name: "Inventions",
    sparql: buildEventQuery("wdt:P31/wdt:P279* wd:Q39546", null, null, 200),
  },

  // ── DISASTERS ──
  {
    name: "Earthquakes",
    sparql: buildEventQuery("wdt:P31/wdt:P279* wd:Q7944", null, null, 300),
  },
  {
    name: "Volcanic eruptions",
    sparql: buildEventQuery("wdt:P31/wdt:P279* wd:Q7692360", null, null, 200),
  },

  // ── RELIGION ──
  {
    name: "Religious events/buildings",
    sparql: buildEventQuery("wdt:P31/wdt:P279* wd:Q16970", null, null, 200), // church building
  },

  // ── BROAD: "significant events" with images, by era ──
  {
    name: "Events with images (ancient: <500)",
    sparql: buildBroadQuery(null, 500, 300),
  },
  {
    name: "Events with images (medieval: 500–1500)",
    sparql: buildBroadQuery(500, 1500, 400),
  },
  {
    name: "Events with images (early modern: 1500–1800)",
    sparql: buildBroadQuery(1500, 1800, 400),
  },
  {
    name: "Events with images (modern: 1800–1950)",
    sparql: buildBroadQuery(1800, 1950, 500),
  },
  {
    name: "Events with images (contemporary: 1950–present)",
    sparql: buildBroadQuery(1950, null, 500),
  },
];

/**
 * Build a SPARQL query for a specific event type.
 * Only returns events that have an image (P18).
 */
function buildEventQuery(typePattern, fromYear, toYear, limit) {
  const yearFilters = [];
  if (fromYear != null) yearFilters.push(`FILTER(YEAR(?date) >= ${fromYear})`);
  if (toYear != null) yearFilters.push(`FILTER(YEAR(?date) < ${toYear})`);

  return `
SELECT DISTINCT ?event ?eventLabel ?eventDescription ?date ?endDate
       ?coord ?article ?image ?typeLabel ?youtube WHERE {
  ?event ${typePattern}.
  ?event wdt:P625 ?coord.
  ?event wdt:P18 ?image.
  { ?event wdt:P585 ?date. } UNION { ?event wdt:P580 ?date. }
  ${yearFilters.join("\n  ")}
  OPTIONAL { ?event wdt:P582 ?endDate. }
  OPTIONAL { ?event wdt:P31 ?type. }
  OPTIONAL { ?article schema:about ?event; schema:isPartOf <https://en.wikipedia.org/>. }
  OPTIONAL { ?event wdt:P1651 ?youtube. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,zh,fr,de,es,ja". }
}
LIMIT ${limit}`;
}

/**
 * Build a broad query for any event-like entity with an image in a time range.
 * Uses P31/P279* on Q1190554 (occurrence) which captures most historical events.
 */
function buildBroadQuery(fromYear, toYear, limit) {
  const yearFilters = [];
  if (fromYear != null) yearFilters.push(`FILTER(YEAR(?date) >= ${fromYear})`);
  if (toYear != null) yearFilters.push(`FILTER(YEAR(?date) < ${toYear})`);

  return `
SELECT DISTINCT ?event ?eventLabel ?eventDescription ?date ?endDate
       ?coord ?article ?image ?typeLabel ?youtube WHERE {
  ?event wdt:P31/wdt:P279* wd:Q1190554.
  ?event wdt:P625 ?coord.
  ?event wdt:P18 ?image.
  { ?event wdt:P585 ?date. } UNION { ?event wdt:P580 ?date. }
  ${yearFilters.join("\n  ")}
  OPTIONAL { ?event wdt:P582 ?endDate. }
  OPTIONAL { ?event wdt:P31 ?type. }
  OPTIONAL { ?article schema:about ?event; schema:isPartOf <https://en.wikipedia.org/>. }
  OPTIONAL { ?event wdt:P1651 ?youtube. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,zh,fr,de,es,ja". }
}
LIMIT ${limit}`;
}

// ── Wikidata date parser (handles BCE dates like "-0500-01-01T00:00:00Z") ──
function parseYear(dateStr) {
  const m = dateStr.match(/^([+-]?\d+)/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

// ── SPARQL fetch with retry ─────────────────────────────────────────
async function querySparql(sparql, retries = 3) {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(sparql)}&format=json`;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if (res.status === 429 || res.status >= 500) {
        const wait = 2000 * Math.pow(2, attempt);
        console.warn(`  SPARQL ${res.status}, retrying in ${wait}ms...`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`SPARQL ${res.status}: ${body.slice(0, 300)}`);
      }
      const data = await res.json();
      return data.results.bindings;
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await sleep(2000 * Math.pow(2, attempt));
    }
  }
  return [];
}

// ── Parse SPARQL bindings into seed events ──────────────────────────
function parseBindings(bindings) {
  const events = [];
  for (const item of bindings) {
    try {
      const wkt = item.coord?.value;
      const m = wkt?.match(/Point\(([-0-9.]+) ([-0-9.]+)\)/);
      if (!m) continue;
      const lng = parseFloat(m[1]);
      const lat = parseFloat(m[2]);

      const year = parseYear(item.date?.value || "");
      if (year === null) continue;

      const endYear = item.endDate?.value ? parseYear(item.endDate.value) : null;
      const typeLabel = item.typeLabel?.value || "";
      const eventUri = item.event?.value || "";
      const qidMatch = eventUri.match(/\/(Q\d+)$/);
      const qid = qidMatch ? qidMatch[1] : null;

      events.push({
        title: item.eventLabel?.value || "Unknown",
        summary: item.eventDescription?.value || "",
        category: categorize(typeLabel),
        region_name: "",
        precision_level: "year",
        confidence_score: 1,
        time_start: year,
        time_end: endYear,
        source_url: eventUri,
        location: { type: "Point", coordinates: [lng, lat] },
        image_url: item.image?.value || null,
        wikipedia_url: item.article?.value || null,
        youtube_video_id: item.youtube?.value || null,
        _qid: qid,
        _typeLabel: typeLabel,
      });
    } catch {
      // skip malformed bindings
    }
  }
  return events;
}

// ── YouTube batch enrichment via Wikidata ───────────────────────────
async function enrichYoutube(events) {
  // Find events without YouTube but with a QID
  const needYt = events.filter((e) => !e.youtube_video_id && e._qid);
  if (needYt.length === 0) return;

  // Batch QIDs into groups of 50 for SPARQL VALUES clause
  const batchSize = 50;
  let enriched = 0;

  for (let i = 0; i < needYt.length; i += batchSize) {
    const batch = needYt.slice(i, i + batchSize);
    const qids = batch.map((e) => `wd:${e._qid}`).join(" ");
    const sparql = `
SELECT ?event ?youtube WHERE {
  VALUES ?event { ${qids} }
  ?event wdt:P1651 ?youtube.
}`;

    try {
      await sleep(DELAY_MS);
      const bindings = await querySparql(sparql);
      const ytMap = new Map();
      for (const b of bindings) {
        const uri = b.event?.value;
        const yt = b.youtube?.value;
        if (uri && yt) ytMap.set(uri, yt);
      }

      for (const event of batch) {
        const yt = ytMap.get(event.source_url);
        if (yt) {
          event.youtube_video_id = yt;
          enriched++;
        }
      }
    } catch (err) {
      console.warn(`  YouTube batch enrichment failed: ${err.message}`);
    }
  }

  console.log(`  YouTube enrichment: found ${enriched} video IDs`);
}

// ── Detect repo root ────────────────────────────────────────────────
async function detectRoot() {
  const cwd = process.cwd();
  const { access } = await import("node:fs/promises");
  for (const c of [cwd, path.resolve(cwd, "../..")]) {
    try {
      await access(path.join(c, "pnpm-workspace.yaml"));
      return c;
    } catch { /* next */ }
  }
  throw new Error("Cannot detect repo root");
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const eraFilter = args.find((a) => a.startsWith("--era="))?.split("=")[1];
  const root = await detectRoot();
  const seedPath = path.join(root, "infra/data/seed/events.seed.json");

  console.log("Earthistory Bulk Ingestion");
  console.log("=========================");
  if (dryRun) console.log("(DRY RUN — no files will be written)\n");

  // De-dup by source_url
  const allEvents = new Map();

  // Load existing events that we want to preserve (non-eclipse, with images)
  try {
    const existing = JSON.parse(await readFile(seedPath, "utf8"));
    let kept = 0;
    for (const e of existing.events || []) {
      if (e.image_url && !e.title?.includes("solar eclipse")) {
        allEvents.set(e.source_url, e);
        kept++;
      }
    }
    console.log(`Preserved ${kept} existing image-bearing events (excluded solar eclipses)\n`);
  } catch {
    console.log("No existing seed file found, starting fresh\n");
  }

  // Run each query
  const queries = eraFilter
    ? QUERIES.filter((q) => q.name.toLowerCase().includes(eraFilter.toLowerCase()))
    : QUERIES;

  for (const { name, sparql } of queries) {
    console.log(`Querying: ${name}...`);
    try {
      await sleep(DELAY_MS);
      const bindings = await querySparql(sparql);
      const events = parseBindings(bindings);
      let added = 0;
      for (const e of events) {
        if (!allEvents.has(e.source_url)) {
          allEvents.set(e.source_url, e);
          added++;
        }
      }
      console.log(`  → ${bindings.length} results, ${added} new unique events`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
    }
  }

  const eventList = Array.from(allEvents.values());
  console.log(`\nTotal unique events: ${eventList.length}`);

  // YouTube enrichment pass
  console.log("\nRunning YouTube enrichment...");
  await enrichYoutube(eventList);

  // Stats
  const withImage = eventList.filter((e) => e.image_url).length;
  const withYouTube = eventList.filter((e) => e.youtube_video_id).length;
  const categories = {};
  const centuries = {};
  for (const e of eventList) {
    categories[e.category] = (categories[e.category] || 0) + 1;
    const c = Math.floor(e.time_start / 100) * 100;
    centuries[c] = (centuries[c] || 0) + 1;
  }

  console.log(`\nStats:`);
  console.log(`  Total events:  ${eventList.length}`);
  console.log(`  With images:   ${withImage} (${((withImage / eventList.length) * 100).toFixed(1)}%)`);
  console.log(`  With YouTube:  ${withYouTube}`);
  console.log(`  Categories:    ${JSON.stringify(categories)}`);
  console.log(`  Century distribution (top 10):`);
  const sortedCenturies = Object.entries(centuries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [century, count] of sortedCenturies) {
    console.log(`    ${century}s: ${count}`);
  }

  if (dryRun) {
    console.log("\n(Dry run complete — no files written)");
    return;
  }

  // Write seed file
  // Clean up internal fields
  const cleanEvents = eventList
    .sort((a, b) => a.time_start - b.time_start)
    .map((e, i) => {
      const { _qid, _typeLabel, ...rest } = e;
      return { id: `wd-${i}`, source_id: "wikidata-source", ...rest };
    });

  const seed = {
    sources: [
      {
        id: "wikidata-source",
        source_name: "Wikidata",
        source_url: "https://www.wikidata.org/",
        license: "CC0",
        attribution_text: "Data from Wikidata",
        retrieved_at: new Date().toISOString(),
      },
    ],
    events: cleanEvents,
  };

  await mkdir(path.dirname(seedPath), { recursive: true });
  await writeFile(seedPath, JSON.stringify(seed, null, 2), "utf8");
  console.log(`\nWrote ${cleanEvents.length} events to ${seedPath}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
