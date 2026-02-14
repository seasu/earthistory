import { FastifyPluginAsync } from "fastify";
import { events, sources } from "../data/mock.js";

type EventsQuery = {
  category?: string;
  from?: number | string;
  to?: number | string;
  limit?: number | string;
  locale?: string;
};

type RegionsQuery = {
  locale?: string;
};

const localizeEvent = (event: typeof events[number], locale: string | undefined) => {
  if (locale === "zh-TW") {
    return {
      ...event,
      title: event.title_zh,
      summary: event.summary_zh,
      regionName: event.regionName_zh,
    };
  }
  return event;
};

export const queryPlugin: FastifyPluginAsync = async (app) => {
  app.get("/health/query", async () => {
    return { module: "query", ok: true };
  });

  app.get<{ Querystring: EventsQuery }>("/events", async (request) => {
    const { category, from, to, limit = 50, locale } = request.query;
    const parsedFrom =
      typeof from === "number" ? from : typeof from === "string" ? Number(from) : undefined;
    const parsedTo = typeof to === "number" ? to : typeof to === "string" ? Number(to) : undefined;
    const parsedLimit =
      typeof limit === "number" ? limit : typeof limit === "string" ? Number(limit) : 50;
    const safeLimit = Number.isFinite(parsedLimit) ? parsedLimit : 50;

    const filtered = events.filter((event) => {
      if (category && event.category !== category) {
        return false;
      }

      if (Number.isFinite(parsedFrom) && event.timeStart < (parsedFrom as number)) {
        return false;
      }

      if (Number.isFinite(parsedTo) && event.timeStart > (parsedTo as number)) {
        return false;
      }

      return true;
    });

    const items = filtered.slice(0, Math.max(1, Math.min(safeLimit, 200)));

    return {
      total: filtered.length,
      items: items.map((e) => localizeEvent(e, locale))
    };
  });

  app.get<{ Querystring: RegionsQuery }>("/regions", async (request) => {
    const { locale } = request.query;
    const field = locale === "zh-TW" ? "regionName_zh" : "regionName";
    const regions = [...new Set(events.map((event) => event[field]))].sort((a, b) =>
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
