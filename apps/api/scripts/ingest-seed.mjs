import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED_LICENSES = new Set(["CC0", "CC BY 4.0", "ODbL"]);

const requireField = (value, name) => {
  if (value === null || value === undefined || value === "") {
    throw new Error(`Missing required field: ${name}`);
  }
};

const normalizeSource = (source) => {
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

const normalizeEvent = (event) => {
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
      // try next
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
  const parsed = JSON.parse(raw);

  const normalizedSources = parsed.sources.map(normalizeSource);
  const sourceMap = new Map(normalizedSources.map((source) => [source.id, source]));
  const normalizedEvents = parsed.events.map((event) => {
    const normalized = normalizeEvent(event);
    const source = sourceMap.get(normalized.sourceId);

    if (!source) {
      throw new Error(`Missing source for event id=${normalized.id} source_id=${normalized.sourceId}`);
    }

    return {
      ...normalized,
      provenance: {
        sourceId: source.id,
        sourceName: source.sourceName,
        sourceUrl: source.sourceUrl,
        license: source.license,
        attributionText: source.attributionText,
        retrievedAt: source.retrievedAt
      }
    };
  });

  for (const event of normalizedEvents) {
    if (!ALLOWED_LICENSES.has(event.provenance.license)) {
      throw new Error(
        `Disallowed license "${event.provenance.license}" for source_id=${event.sourceId}`
      );
    }
  }

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sources: normalizedSources,
        provenanceFields: [
          "sourceId",
          "sourceName",
          "sourceUrl",
          "license",
          "attributionText",
          "retrievedAt"
        ],
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

run();
