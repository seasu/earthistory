#!/usr/bin/env node
/**
 * Bulk ingest historical events from Wikidata.
 *
 * Strategy:
 *   1. Run YouTube-first queries (P1651 required) to collect guaranteed video events.
 *   2. Run image-bearing queries (P18 required) across ~30 event types and eras.
 *   3. Enrich remaining events with YouTube IDs via batch SPARQL.
 *   4. Write sorted, de-duped results to infra/data/seed/events.seed.json.
 *
 * Usage:
 *   node scripts/bulk-ingest.mjs                    # full run (YouTube + image queries)
 *   node scripts/bulk-ingest.mjs --dry-run           # preview counts only
 *   node scripts/bulk-ingest.mjs --youtube-only      # only YouTube-guaranteed queries
 *   node scripts/bulk-ingest.mjs --images-only       # only image-bearing queries
 *   node scripts/bulk-ingest.mjs --era=modern        # filter queries by name substring
 *
 * Target output: ~5000+ events, 80%+ with images, 300+ with YouTube.
 */

import { writeFile, readFile, mkdir } from "node:fs/promises";
import path from "node:path";

const USER_AGENT = "Earthistory/1.0 (https://github.com/seasu/earthistory; educational)";
const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const DELAY_MS = 1200;   // polite delay between SPARQL requests
const BATCH_SIZE = 50;   // QIDs per YouTube enrichment batch

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Category mapping ────────────────────────────────────────────────
const CATEGORY_MAP = {
  war: "war", battle: "war", siege: "war", "military campaign": "war",
  conflict: "war", invasion: "war", "military operation": "war",
  "naval battle": "war", "aerial bombing": "war", "air battle": "war",
  "tank battle": "war", "military offensive": "war",

  election: "politics", treaty: "politics", assassination: "politics",
  "coup d'état": "politics", protest: "politics", revolution: "politics",
  "diplomatic mission": "politics", "peace treaty": "politics",
  "political crisis": "politics", "referendum": "politics",
  demonstration: "politics",

  painting: "culture", sculpture: "culture", novel: "culture",
  film: "culture", "literary work": "culture", composition: "culture",
  museum: "culture", festival: "culture", "world heritage site": "culture",
  concert: "culture", opera: "culture", "theatrical production": "culture",
  "cultural event": "culture",

  city: "civilization", "capital city": "civilization",
  "archaeological site": "civilization", empire: "civilization",
  civilization: "civilization", dynasty: "civilization",
  "ancient city": "civilization", castle: "civilization",
  temple: "civilization", palace: "civilization", pyramid: "civilization",
  cathedral: "civilization", mosque: "civilization",

  discovery: "exploration", expedition: "exploration",
  "first ascent": "exploration", "space mission": "exploration",
  "human spaceflight": "exploration", voyage: "exploration",
  "spaceflight": "exploration", "space probe": "exploration",
  "moon landing": "exploration",

  "scientific discovery": "science", invention: "technology",
  "technological development": "technology",

  religion: "religion", "religious movement": "religion",

  earthquake: "history", "volcanic eruption": "history",
  epidemic: "history", famine: "history", flood: "history",
  pandemic: "history", disaster: "history", tsunami: "history",
  hurricane: "history", typhoon: "history", cyclone: "history",
  "nuclear accident": "history", fire: "history",
  "summer olympic games": "history", "winter olympic games": "history",
  "olympic games": "history",
};

function categorize(typeLabel) {
  const lower = (typeLabel || "").toLowerCase();
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return val;
  }
  return "history";
}

// ── SPARQL query builders ────────────────────────────────────────────

/**
 * Query for a specific event type that REQUIRES an image (P18).
 * YouTube is fetched as optional.
 */
function buildImageQuery(typePattern, fromYear, toYear, limit) {
  const filters = buildYearFilters(fromYear, toYear);
  return `
SELECT DISTINCT ?event ?eventLabel ?eventDescription ?date ?endDate
       ?coord ?article ?image ?typeLabel ?youtube ?countryLabel WHERE {
  ?event ${typePattern}.
  ?event wdt:P625 ?coord.
  ?event wdt:P18 ?image.
  { ?event wdt:P585 ?date. } UNION { ?event wdt:P580 ?date. }
  ${filters}
  OPTIONAL { ?event wdt:P582 ?endDate. }
  OPTIONAL { ?event wdt:P31 ?type. }
  OPTIONAL { ?article schema:about ?event; schema:isPartOf <https://en.wikipedia.org/>. }
  OPTIONAL { ?event wdt:P1651 ?youtube. }
  OPTIONAL { ?event wdt:P17 ?country. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,zh,fr,de,es,ja". }
}
LIMIT ${limit}`;
}

/**
 * Broad query for any occurrence-like entity with an image in a time range.
 */
function buildImageBroadQuery(fromYear, toYear, limit) {
  const filters = buildYearFilters(fromYear, toYear);
  return `
SELECT DISTINCT ?event ?eventLabel ?eventDescription ?date ?endDate
       ?coord ?article ?image ?typeLabel ?youtube ?countryLabel WHERE {
  ?event wdt:P31/wdt:P279* wd:Q1190554.
  ?event wdt:P625 ?coord.
  ?event wdt:P18 ?image.
  { ?event wdt:P585 ?date. } UNION { ?event wdt:P580 ?date. }
  ${filters}
  OPTIONAL { ?event wdt:P582 ?endDate. }
  OPTIONAL { ?event wdt:P31 ?type. }
  OPTIONAL { ?article schema:about ?event; schema:isPartOf <https://en.wikipedia.org/>. }
  OPTIONAL { ?event wdt:P1651 ?youtube. }
  OPTIONAL { ?event wdt:P17 ?country. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,zh,fr,de,es,ja". }
}
LIMIT ${limit}`;
}

/**
 * Query that REQUIRES a YouTube video ID (P1651).
 * Image is fetched as optional — these events are guaranteed to have video.
 */
function buildYouTubeQuery(typePattern, fromYear, toYear, limit) {
  const filters = buildYearFilters(fromYear, toYear);
  return `
SELECT DISTINCT ?event ?eventLabel ?eventDescription ?date ?endDate
       ?coord ?article ?image ?typeLabel ?youtube ?countryLabel WHERE {
  ?event ${typePattern}.
  ?event wdt:P625 ?coord.
  ?event wdt:P1651 ?youtube.
  { ?event wdt:P585 ?date. } UNION { ?event wdt:P580 ?date. }
  ${filters}
  OPTIONAL { ?event wdt:P582 ?endDate. }
  OPTIONAL { ?event wdt:P31 ?type. }
  OPTIONAL { ?article schema:about ?event; schema:isPartOf <https://en.wikipedia.org/>. }
  OPTIONAL { ?event wdt:P18 ?image. }
  OPTIONAL { ?event wdt:P17 ?country. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,zh,fr,de,es,ja". }
}
LIMIT ${limit}`;
}

/**
 * Broad YouTube query — any occurrence-like entity with a YouTube video.
 */
function buildYouTubeBroadQuery(fromYear, toYear, limit) {
  const filters = buildYearFilters(fromYear, toYear);
  return `
SELECT DISTINCT ?event ?eventLabel ?eventDescription ?date ?endDate
       ?coord ?article ?image ?typeLabel ?youtube ?countryLabel WHERE {
  ?event wdt:P31/wdt:P279* wd:Q1190554.
  ?event wdt:P625 ?coord.
  ?event wdt:P1651 ?youtube.
  { ?event wdt:P585 ?date. } UNION { ?event wdt:P580 ?date. }
  ${filters}
  OPTIONAL { ?event wdt:P582 ?endDate. }
  OPTIONAL { ?event wdt:P31 ?type. }
  OPTIONAL { ?article schema:about ?event; schema:isPartOf <https://en.wikipedia.org/>. }
  OPTIONAL { ?event wdt:P18 ?image. }
  OPTIONAL { ?event wdt:P17 ?country. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,zh,fr,de,es,ja". }
}
LIMIT ${limit}`;
}

function buildYearFilters(fromYear, toYear) {
  const parts = [];
  if (fromYear != null) parts.push(`FILTER(YEAR(?date) >= ${fromYear})`);
  if (toYear != null) parts.push(`FILTER(YEAR(?date) < ${toYear})`);
  return parts.join("\n  ");
}

// ── Query lists ──────────────────────────────────────────────────────

/**
 * YouTube-first queries: each event is GUARANTEED to have a YouTube video.
 * Runs first; results are most valuable for user engagement.
 */
const YOUTUBE_QUERIES = [
  // Space & Science (highest YouTube density on Wikidata)
  { name: "[YT] Space missions", sparql: buildYouTubeQuery("wdt:P31/wdt:P279* wd:Q5916", null, null, 400) },
  { name: "[YT] Human spaceflights", sparql: buildYouTubeQuery("wdt:P31/wdt:P279* wd:Q752783", null, null, 300) },
  { name: "[YT] Space probe missions", sparql: buildYouTubeQuery("wdt:P31/wdt:P279* wd:Q26529", null, null, 150) },

  // Disasters
  { name: "[YT] Volcanic eruptions", sparql: buildYouTubeQuery("wdt:P31/wdt:P279* wd:Q7692360", null, null, 200) },
  { name: "[YT] Earthquakes", sparql: buildYouTubeQuery("wdt:P31/wdt:P279* wd:Q7944", null, null, 200) },
  { name: "[YT] Tropical cyclones/hurricanes", sparql: buildYouTubeQuery("wdt:P31/wdt:P279* wd:Q837570", null, null, 150) },
  { name: "[YT] Tsunamis", sparql: buildYouTubeQuery("wdt:P31/wdt:P279* wd:Q8072", null, null, 100) },
  { name: "[YT] Nuclear accidents", sparql: buildYouTubeQuery("wdt:P31/wdt:P279* wd:Q1075481", null, null, 80) },

  // Wars & Military
  { name: "[YT] Battles (1900–present)", sparql: buildYouTubeQuery("wdt:P31/wdt:P279* wd:Q178561", 1900, null, 400) },
  { name: "[YT] Wars (1900–present)", sparql: buildYouTubeQuery("wdt:P31/wdt:P279* wd:Q198", 1900, null, 250) },
  { name: "[YT] Military operations (1900–present)", sparql: buildYouTubeQuery("wdt:P31/wdt:P279* wd:Q645883", 1900, null, 200) },

  // Politics
  { name: "[YT] Protests & demonstrations", sparql: buildYouTubeQuery("wdt:P31/wdt:P279* wd:Q273120", null, null, 150) },
  { name: "[YT] Coups d'état", sparql: buildYouTubeQuery("wdt:P31/wdt:P279* wd:Q45382", null, null, 100) },
  { name: "[YT] Revolutions", sparql: buildYouTubeQuery("wdt:P31/wdt:P279* wd:Q10931", null, null, 100) },

  // Sports
  { name: "[YT] Summer Olympic Games", sparql: buildYouTubeQuery("wdt:P31/wdt:P279* wd:Q159821", null, null, 150) },
  { name: "[YT] Winter Olympic Games", sparql: buildYouTubeQuery("wdt:P31/wdt:P279* wd:Q82414", null, null, 100) },

  // Broad contemporary
  { name: "[YT] Contemporary events (1980–present)", sparql: buildYouTubeBroadQuery(1980, null, 600) },
  { name: "[YT] Mid-20th century events (1940–1980)", sparql: buildYouTubeBroadQuery(1940, 1980, 400) },
  { name: "[YT] Early 20th century events (1900–1940)", sparql: buildYouTubeBroadQuery(1900, 1940, 300) },
];

/**
 * Image-bearing queries: each event has at least one Wikidata image.
 * Covers the full timeline from ancient to present.
 */
const IMAGE_QUERIES = [
  // ── WARS & BATTLES ──
  { name: "Battles (BCE–1500)", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q178561", null, 1500, 500) },
  { name: "Battles (1500–1800)", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q178561", 1500, 1800, 500) },
  { name: "Battles (1800–1900)", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q178561", 1800, 1900, 400) },
  { name: "Battles (1900–present)", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q178561", 1900, null, 600) },
  { name: "Wars (all eras)", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q198", null, null, 400) },
  { name: "Sieges", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q188055", null, null, 300) },
  { name: "Military operations", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q645883", null, null, 300) },

  // ── POLITICS & DIPLOMACY ──
  { name: "Treaties", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q131569", null, null, 350) },
  { name: "Revolutions", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q10931", null, null, 250) },
  { name: "Coups d'état", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q45382", null, null, 200) },
  { name: "Protests & demonstrations", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q273120", null, null, 250) },
  { name: "Assassinations", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q3882219", null, null, 250) },
  { name: "Peace treaties", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q1478451", null, null, 200) },

  // ── EXPLORATION & SPACE ──
  { name: "Space missions", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q5916", null, null, 500) },
  { name: "Human spaceflights", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q752783", null, null, 300) },
  { name: "Expeditions", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q2401485", null, null, 300) },
  { name: "Voyages of discovery", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q170475", null, null, 200) },

  // ── CIVILIZATION & ARCHAEOLOGY ──
  { name: "Archaeological sites", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q839954", null, null, 500) },
  { name: "UNESCO World Heritage Sites", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q9259", null, null, 600) },
  { name: "Ancient temples", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q44539", null, null, 400) },
  { name: "Castles & fortresses", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q23413", null, null, 400) },
  { name: "Cathedrals & churches", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q2977", null, null, 400) },
  { name: "Mosques", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q32815", null, null, 300) },
  { name: "Palaces", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q16560", null, null, 300) },

  // ── NATURAL DISASTERS ──
  { name: "Earthquakes", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q7944", null, null, 400) },
  { name: "Volcanic eruptions", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q7692360", null, null, 300) },
  { name: "Tropical cyclones/hurricanes", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q837570", null, null, 300) },
  { name: "Tsunamis", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q8072", null, null, 200) },
  { name: "Famines", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q168247", null, null, 150) },
  { name: "Pandemics & epidemics", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q3241045", null, null, 200) },
  { name: "Floods", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q8068", null, null, 200) },
  { name: "Nuclear accidents", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q1075481", null, null, 100) },
  { name: "Major fires", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q3368718", null, null, 200) },

  // ── SCIENCE & TECHNOLOGY ──
  { name: "Scientific discoveries", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q28813620", null, null, 250) },
  { name: "Inventions", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q39546", null, null, 250) },

  // ── CULTURE & RELIGION ──
  { name: "Religious buildings (temples/churches/mosques)", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q16970", null, null, 400) },
  { name: "Olympic Games (Summer)", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q159821", null, null, 200) },
  { name: "Olympic Games (Winter)", sparql: buildImageQuery("wdt:P31/wdt:P279* wd:Q82414", null, null, 150) },

  // ── BROAD ERA-BASED SWEEPS ──
  // These catch any event-like entity with an image in a given time range.
  { name: "Any events with images (BCE–500 CE)", sparql: buildImageBroadQuery(null, 500, 500) },
  { name: "Any events with images (500–1000 CE)", sparql: buildImageBroadQuery(500, 1000, 500) },
  { name: "Any events with images (1000–1500)", sparql: buildImageBroadQuery(1000, 1500, 600) },
  { name: "Any events with images (1500–1700)", sparql: buildImageBroadQuery(1500, 1700, 600) },
  { name: "Any events with images (1700–1850)", sparql: buildImageBroadQuery(1700, 1850, 700) },
  { name: "Any events with images (1850–1950)", sparql: buildImageBroadQuery(1850, 1950, 800) },
  { name: "Any events with images (1950–1990)", sparql: buildImageBroadQuery(1950, 1990, 800) },
  { name: "Any events with images (1990–present)", sparql: buildImageBroadQuery(1990, null, 800) },
];

// ── Date parser ──────────────────────────────────────────────────────
function parseYear(dateStr) {
  const m = dateStr.match(/^([+-]?\d+)/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

// ── SPARQL fetch with retry ──────────────────────────────────────────
async function querySparql(sparql, retries = 3) {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(sparql)}&format=json`;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if (res.status === 429 || res.status >= 500) {
        const wait = 3000 * Math.pow(2, attempt);
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
      await sleep(3000 * Math.pow(2, attempt));
    }
  }
  return [];
}

// ── Parse SPARQL bindings → seed events ─────────────────────────────
function parseBindings(bindings) {
  const events = [];
  for (const item of bindings) {
    try {
      const wkt = item.coord?.value;
      const m = wkt?.match(/Point\(([-0-9.]+) ([-0-9.]+)\)/);
      if (!m) continue;
      const lng = parseFloat(m[1]);
      const lat = parseFloat(m[2]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;

      const year = parseYear(item.date?.value || "");
      if (year === null) continue;

      // Skip obviously bad data: pure solar/lunar eclipse predictions
      const title = item.eventLabel?.value || "Unknown";
      if (/solar eclipse|lunar eclipse|annular eclipse/i.test(title) && year > 2025) continue;

      const endYear = item.endDate?.value ? parseYear(item.endDate.value) : null;
      const typeLabel = item.typeLabel?.value || "";
      const eventUri = item.event?.value || "";
      const qidMatch = eventUri.match(/\/(Q\d+)$/);
      const qid = qidMatch ? qidMatch[1] : null;

      // Region name from country label
      const regionName = item.countryLabel?.value || "";

      events.push({
        title,
        summary: item.eventDescription?.value || "",
        category: categorize(typeLabel),
        region_name: regionName,
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

// ── YouTube batch enrichment ─────────────────────────────────────────
async function enrichYoutube(events) {
  const needYt = events.filter((e) => !e.youtube_video_id && e._qid);
  if (needYt.length === 0) {
    console.log("  YouTube enrichment: no events need enrichment");
    return;
  }
  console.log(`  YouTube enrichment: checking ${needYt.length} events for video IDs...`);

  let enriched = 0;
  for (let i = 0; i < needYt.length; i += BATCH_SIZE) {
    const batch = needYt.slice(i, i + BATCH_SIZE);
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
        if (yt) { event.youtube_video_id = yt; enriched++; }
      }
    } catch (err) {
      console.warn(`  YouTube batch ${i / BATCH_SIZE + 1} failed: ${err.message}`);
    }

    if ((i / BATCH_SIZE) % 10 === 9) {
      console.log(`  YouTube enrichment: processed ${i + BATCH_SIZE}/${needYt.length}, found ${enriched} so far`);
    }
  }
  console.log(`  YouTube enrichment: found ${enriched} new video IDs`);
}

// ── Repo root detection ──────────────────────────────────────────────
async function detectRoot() {
  const cwd = process.cwd();
  const { access } = await import("node:fs/promises");
  for (const c of [cwd, path.resolve(cwd, "../..")]) {
    try {
      await access(path.join(c, "pnpm-workspace.yaml"));
      return c;
    } catch { /* next */ }
  }
  throw new Error("Cannot detect repo root (pnpm-workspace.yaml not found)");
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const youtubeOnly = args.includes("--youtube-only");
  const imagesOnly = args.includes("--images-only");
  const eraFilter = args.find((a) => a.startsWith("--era="))?.split("=")[1];

  const root = await detectRoot();
  const seedPath = path.join(root, "infra/data/seed/events.seed.json");

  console.log("Earthistory Bulk Ingestion");
  console.log("=========================");
  console.log(`Mode: ${youtubeOnly ? "YouTube-only" : imagesOnly ? "Images-only" : "Full (YouTube + Images)"}`);
  if (dryRun) console.log("(DRY RUN — no files will be written)");
  console.log();

  // De-dup by source_url
  const allEvents = new Map();

  // Build query list based on flags
  let queries = [];
  if (!imagesOnly) queries = queries.concat(YOUTUBE_QUERIES);
  if (!youtubeOnly) queries = queries.concat(IMAGE_QUERIES);

  // Apply era filter if specified
  if (eraFilter) {
    queries = queries.filter((q) => q.name.toLowerCase().includes(eraFilter.toLowerCase()));
    console.log(`Era filter: "${eraFilter}" → ${queries.length} queries\n`);
  }

  // Run each query
  let queryNum = 0;
  for (const { name, sparql } of queries) {
    queryNum++;
    console.log(`[${queryNum}/${queries.length}] ${name}`);

    if (dryRun) {
      console.log("  (skipping — dry run)");
      continue;
    }

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
      const withYT = events.filter((e) => e.youtube_video_id).length;
      const withImg = events.filter((e) => e.image_url).length;
      console.log(
        `  → ${bindings.length} results, ${added} new  |  img: ${withImg}  yt: ${withYT}`
      );
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
    }
  }

  if (dryRun) {
    console.log(`\nDry run: would have run ${queries.length} queries`);
    console.log("YouTube queries:", YOUTUBE_QUERIES.length);
    console.log("Image queries:", IMAGE_QUERIES.length);
    return;
  }

  const eventList = Array.from(allEvents.values());
  console.log(`\nTotal unique events before enrichment: ${eventList.length}`);

  // YouTube enrichment pass (find video IDs for events that don't have them yet)
  console.log("\nRunning YouTube enrichment pass...");
  await enrichYoutube(eventList);

  // Final stats
  const withImage = eventList.filter((e) => e.image_url).length;
  const withYT = eventList.filter((e) => e.youtube_video_id).length;
  const withBoth = eventList.filter((e) => e.image_url && e.youtube_video_id).length;

  const categories = {};
  const centuries = {};
  for (const e of eventList) {
    categories[e.category] = (categories[e.category] || 0) + 1;
    const c = Math.floor(e.time_start / 100) * 100;
    centuries[c] = (centuries[c] || 0) + 1;
  }

  console.log("\n════ Final Stats ════");
  console.log(`Total events:    ${eventList.length}`);
  console.log(`With images:     ${withImage} (${((withImage / eventList.length) * 100).toFixed(1)}%)`);
  console.log(`With YouTube:    ${withYT} (${((withYT / eventList.length) * 100).toFixed(1)}%)`);
  console.log(`With both:       ${withBoth}`);
  console.log(`\nCategories:`);
  Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([k, v]) =>
    console.log(`  ${k.padEnd(16)} ${v}`)
  );
  console.log(`\nTop centuries:`);
  Object.entries(centuries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([c, n]) => console.log(`  ${c}s: ${n}`));

  // Write output
  const cleanEvents = eventList
    .filter((e) => e.time_start !== null && Number.isFinite(e.time_start))
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
        attribution_text: "Data from Wikidata (CC0). All ingested content is CC0-licensed.",
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
