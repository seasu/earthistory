import { FastifyPluginAsync } from "fastify";

export const ingestionPlugin: FastifyPluginAsync = async (app) => {
  app.get("/health/ingestion", async () => {
    return { module: "ingestion", ok: true };
  });
};
