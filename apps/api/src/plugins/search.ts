import { FastifyPluginAsync } from "fastify";
import { getPool } from "../db.js";
import { events as mockEvents } from "../data/mock.js";

type SearchQuery = {
  q?: string;
  limit?: number | string;
  locale?: string;
};

export const searchPlugin: FastifyPluginAsync = async (app) => {
  app.get("/health/search", async () => {
    return { module: "search", ok: true };
  });

  app.get<{ Querystring: SearchQuery }>("/search", async (request) => {
    const { q = "", limit = 20, locale } = request.query;
    const keyword = q.trim().toLowerCase();
    const parsedLimit =
      typeof limit === "number" ? limit : typeof limit === "string" ? Number(limit) : 20;
    const safeLimit = Number.isFinite(parsedLimit) ? parsedLimit : 20;
    const clampedLimit = Math.max(1, Math.min(safeLimit, 100));

    if (!keyword) {
      return { total: 0, items: [] };
    }

    const pool = getPool();
    if (pool) {
      return searchEventsFromDb(pool, keyword, clampedLimit, locale);
    }

    // Fallback to mock data
    const items = mockEvents.filter((event) => {
      return (
        event.title.toLowerCase().includes(keyword) ||
        event.summary.toLowerCase().includes(keyword) ||
        event.regionName.toLowerCase().includes(keyword) ||
        event.title_zh.includes(keyword) ||
        event.summary_zh.includes(keyword)
      );
    });

    return {
      total: items.length,
      items: items.slice(0, clampedLimit)
    };
  });
};

const searchEventsFromDb = async (
  pool: import("pg").Pool,
  keyword: string,
  limit: number,
  locale?: string
) => {
  const isZh = locale === "zh-TW";
  const pattern = `%${keyword}%`;

  const result = await pool.query(
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
      wikipedia_url
    FROM events
    WHERE title ILIKE $1
      OR summary ILIKE $1
      OR region_name ILIKE $1
      OR title_zh ILIKE $1
      OR summary_zh ILIKE $1
    ORDER BY time_start
    LIMIT $2`,
    [pattern, limit]
  );

  const items = result.rows.map((row) => ({
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
    wikipediaUrl: row.wikipedia_url ?? null
  }));

  return { total: items.length, items };
};
