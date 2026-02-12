import { FastifyPluginAsync } from "fastify";
import { events, sources } from "../data/mock.js";

type EventsQuery = {
  category?: string;
  from?: number;
  to?: number;
  limit?: number;
};

export const queryPlugin: FastifyPluginAsync = async (app) => {
  app.get("/health/query", async () => {
    return { module: "query", ok: true };
  });

  app.get<{ Querystring: EventsQuery }>("/events", async (request) => {
    const { category, from, to, limit = 50 } = request.query;

    const filtered = events.filter((event) => {
      if (category && event.category !== category) {
        return false;
      }

      if (typeof from === "number" && event.timeStart < from) {
        return false;
      }

      if (typeof to === "number" && event.timeStart > to) {
        return false;
      }

      return true;
    });

    return {
      total: filtered.length,
      items: filtered.slice(0, Math.max(1, Math.min(limit, 200)))
    };
  });

  app.get("/regions", async () => {
    const regions = [...new Set(events.map((event) => event.regionName))].sort((a, b) =>
      a.localeCompare(b)
    );

    return {
      total: regions.length,
      items: regions
    };
  });

  app.get("/sources", async () => {
    return {
      total: sources.length,
      items: sources
    };
  });
};
