import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type SeedSource = {
  id: number;
  source_name: string;
  source_url: string;
  license: string;
  attribution_text: string;
  retrieved_at: string;
};

type SeedEvent = {
  id: number;
  title: string;
  summary: string;
  category: string;
  region_name: string;
  precision_level: "year" | "decade" | "century";
  confidence_score: number;
  time_start: number;
  time_end: number | null;
  source_id: number;
  source_url: string;
};

type SeedPayload = {
  sources: SeedSource[];
  events: SeedEvent[];
};

const ALLOWED_LICENSES = new Set(["CC0", "CC BY 4.0", "ODbL"]);

const requireField = (value: unknown, name: string) => {
  if (value === null || value === undefined || value === "") {
    throw new Error(`Missing required field: ${name}`);
  }
};

const normalizeSource = (source: SeedSource) => {
  requireField(source.source_name, "source_name");
  requireField(source.source_url, "source_url");
  requireField(source.license, "license");
  requireField(source.attribution_text, "attribution_text");
  requireField(source.retrieved_at, "retrieved_at");

  return {
    id: source.id,
    sourceName: source.source_name.trim(),
    sourceUrl: source.source_url.trim(),
    license: source.license.trim(),
    attributionText: source.attribution_text.trim(),
    retrievedAt: source.retrieved_at
  };
};

const normalizeEvent = (event: SeedEvent) => {
  requireField(event.title, "title");
  requireField(event.summary, "summary");
  requireField(event.category, "category");
  requireField(event.precision_level, "precision_level");
  requireField(event.source_id, "source_id");

  return {
    id: event.id,
    title: event.title.trim(),
    summary: event.summary.trim(),
    category: event.category.trim(),
    regionName: event.region_name?.trim() ?? "",
    precisionLevel: event.precision_level,
    confidenceScore: event.confidence_score,
    timeStart: event.time_start,
    timeEnd: event.time_end,
    sourceId: event.source_id,
    sourceUrl: event.source_url.trim()
  };
};

const detectRepoRoot = async () => {
  const cwd = process.cwd();
  const candidates = [cwd, path.resolve(cwd, "../..")];

  for (const candidate of candidates) {
    try {
      await access(path.join(candidate, "pnpm-workspace.yaml"));
      return candidate;
    } catch {
      // keep scanning
    }
  }

  throw new Error("Cannot detect repository root for ingestion script");
};

const run = async () => {
  const root = await detectRepoRoot();
  const seedPath = path.join(root, "infra/data/seed/events.seed.json");
  const outputDir = path.join(root, "infra/data/normalized");
  const outputPath = path.join(outputDir, "events.normalized.json");

  const raw = await readFile(seedPath, "utf8");
  const parsed = JSON.parse(raw) as SeedPayload;

  const normalizedSources = parsed.sources.map(normalizeSource);
  const normalizedEvents = parsed.events.map(normalizeEvent);
  const licenseMap = new Map(normalizedSources.map((source) => [source.id, source.license]));

  for (const event of normalizedEvents) {
    const license = licenseMap.get(event.sourceId);
    if (!license) {
      throw new Error(`Missing source for event id=${event.id} source_id=${event.sourceId}`);
    }
    if (!ALLOWED_LICENSES.has(license)) {
      throw new Error(`Disallowed license "${license}" for source_id=${event.sourceId}`);
    }
  }

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sources: normalizedSources,
        events: normalizedEvents
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        sourceCount: normalizedSources.length,
        eventCount: normalizedEvents.length,
        outputPath
      },
      null,
      2
    )
  );
};

void run();
