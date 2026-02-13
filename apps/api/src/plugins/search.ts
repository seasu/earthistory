import { FastifyPluginAsync } from "fastify";
import { events } from "../data/mock.js";

type SearchQuery = {
  q?: string;
  limit?: number | string;
};

export const searchPlugin: FastifyPluginAsync = async (app) => {
  app.get("/health/search", async () => {
    return { module: "search", ok: true };
  });

  app.get<{ Querystring: SearchQuery }>("/search", async (request) => {
    const { q = "", limit = 20 } = request.query;
    const keyword = q.trim().toLowerCase();
    const parsedLimit =
      typeof limit === "number" ? limit : typeof limit === "string" ? Number(limit) : 20;
    const safeLimit = Number.isFinite(parsedLimit) ? parsedLimit : 20;

    if (!keyword) {
      return { total: 0, items: [] };
    }

    const items = events.filter((event) => {
      return (
        event.title.toLowerCase().includes(keyword) ||
        event.summary.toLowerCase().includes(keyword) ||
        event.regionName.toLowerCase().includes(keyword)
      );
    });

    return {
      total: items.length,
      items: items.slice(0, Math.max(1, Math.min(safeLimit, 100)))
    };
  });
};
