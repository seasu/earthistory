import { FastifyPluginAsync } from "fastify";
import { getPool } from "../db.js";
import { events as mockEvents, sources as mockSources } from "../data/mock.js";

type EventsQuery = {
  category?: string;
  from?: number | string;
  to?: number | string;
  limit?: number | string;
  hasYouTube?: string;
  locale?: string;
};

type RegionsQuery = {
  locale?: string;
};

const localizeEvent = (event: typeof mockEvents[number], locale: string | undefined) => {
  if (locale === "zh-TW") {
    return {
      ...event,
      title: event.title_zh || event.title,
      summary: event.summary_zh || event.summary,
      regionName: event.regionName_zh || event.regionName,
    };
  }
  return event;
};

export const queryPlugin: FastifyPluginAsync = async (app) => {
  app.get("/health/query", async () => {
    const pool = getPool();
    return { module: "query", ok: true, dataSource: pool ? "postgres" : "mock" };
  });

  app.get<{ Querystring: EventsQuery }>("/events", async (request) => {
    const { category, from, to, limit = 50, hasYouTube, locale } = request.query;
    const parsedFrom =
      typeof from === "number" ? from : typeof from === "string" ? Number(from) : undefined;
    const parsedTo = typeof to === "number" ? to : typeof to === "string" ? Number(to) : undefined;
    const parsedLimit =
      typeof limit === "number" ? limit : typeof limit === "string" ? Number(limit) : 50;
    const parsedHasYouTube =
      hasYouTube === "true" ? true : hasYouTube === "false" ? false : undefined;
    const safeLimit = Number.isFinite(parsedLimit) ? parsedLimit : 50;
    const clampedLimit = Math.max(1, Math.min(safeLimit, 200));

    const pool = getPool();
    if (pool) {
      return queryEventsFromDb(pool, {
        category,
        parsedFrom,
        parsedTo,
        parsedHasYouTube,
        clampedLimit,
        locale
      });
    }

    // Fallback to mock data
    const filtered = mockEvents.filter((event) => {
      if (category && event.category !== category) return false;
      if (Number.isFinite(parsedFrom) && event.timeStart < (parsedFrom as number)) return false;
      if (Number.isFinite(parsedTo) && event.timeStart > (parsedTo as number)) return false;
      if (parsedHasYouTube === true && !event.youtubeVideoId) return false;
      if (parsedHasYouTube === false && event.youtubeVideoId) return false;
      return true;
    });

    const items = filtered.slice(0, clampedLimit);

    return {
      total: filtered.length,
      items: items.map((e) => localizeEvent(e, locale))
    };
  });

  app.get<{ Querystring: RegionsQuery }>("/regions", async (request) => {
    const { locale } = request.query;

    const pool = getPool();
    if (pool) {
      return queryRegionsFromDb(pool, locale);
    }

    // Fallback to mock data
    const field = locale === "zh-TW" ? "regionName_zh" : "regionName";
    const regions = [...new Set(mockEvents.map((event) => event[field]))].sort((a, b) =>
      a.localeCompare(b)
    );

    return {
      total: regions.length,
      items: regions
    };
  });

  app.get("/sources", async () => {
    const pool = getPool();
    if (pool) {
      return querySourcesFromDb(pool);
    }

    return {
      total: mockSources.length,
      items: mockSources
    };
  });
};

// ---- PostgreSQL query functions ----

type EventsParams = {
  category?: string;
  parsedFrom?: number;
  parsedTo?: number;
  parsedHasYouTube?: boolean;
  clampedLimit: number;
  locale?: string;
};

const queryEventsFromDb = async (
  pool: import("pg").Pool,
  params: EventsParams
) => {
  const conditions: string[] = [];
  const values: (string | number)[] = [];
  let idx = 1;

  if (params.category) {
    conditions.push(`category = $${idx++}`);
    values.push(params.category);
  }
  if (Number.isFinite(params.parsedFrom)) {
    conditions.push(`time_start >= $${idx++}`);
    values.push(params.parsedFrom as number);
  }
  if (Number.isFinite(params.parsedTo)) {
    conditions.push(`time_start <= $${idx++}`);
    values.push(params.parsedTo as number);
  }
  if (params.parsedHasYouTube === true) {
    conditions.push("youtube_video_id IS NOT NULL");
  }
  if (params.parsedHasYouTube === false) {
    conditions.push("youtube_video_id IS NULL");
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const isZh = params.locale === "zh-TW";

  const dataResult = await pool.query(
    `SELECT
      id,
      ${isZh ? "COALESCE(title_zh, title)" : "title"} AS title,
      ${isZh ? "COALESCE(summary_zh, summary)" : "summary"} AS summary,
      category,
      ${isZh ? "COALESCE(region_name_zh, region_name)" : "region_name"} AS region_name,
      precision_level,
      confidence_score,
      time_start,
      time_end,
      source_url,
      ST_Y(location::geometry) AS lat,
      ST_X(location::geometry) AS lng,
      image_url,
      image_attribution,
      wikipedia_url,
      youtube_video_id
    FROM events
    ${whereClause}
    ORDER BY time_start
    LIMIT $${idx}`,
    [...values, params.clampedLimit]
  );

  const items = dataResult.rows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    category: row.category,
    regionName: row.region_name,
    precisionLevel: row.precision_level,
    confidenceScore: Number(row.confidence_score),
    timeStart: row.time_start,
    timeEnd: row.time_end,
    sourceUrl: row.source_url,
    lat: row.lat,
    lng: row.lng,
    imageUrl: row.image_url ?? null,
    imageAttribution: row.image_attribution ?? null,
    wikipediaUrl: row.wikipedia_url ?? null,
    youtubeVideoId: row.youtube_video_id ?? null
  }));

  return { total: items.length, items };
};

const queryRegionsFromDb = async (
  pool: import("pg").Pool,
  locale?: string
) => {
  const field = locale === "zh-TW"
    ? "COALESCE(region_name_zh, region_name)"
    : "region_name";

  const result = await pool.query(
    `SELECT DISTINCT ${field} AS region FROM events WHERE ${field} IS NOT NULL ORDER BY region`
  );

  const items = result.rows.map((r) => r.region as string);
  return { total: items.length, items };
};

const querySourcesFromDb = async (pool: import("pg").Pool) => {
  const result = await pool.query(
    `SELECT id, source_name, source_url, license, attribution_text, retrieved_at FROM sources ORDER BY id`
  );

  const items = result.rows.map((row) => ({
    id: row.id,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    license: row.license,
    attributionText: row.attribution_text,
    retrievedAt: row.retrieved_at
  }));

  return { total: items.length, items };
};
