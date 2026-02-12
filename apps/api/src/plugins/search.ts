import { FastifyPluginAsync } from "fastify";

export const searchPlugin: FastifyPluginAsync = async (app) => {
  app.get("/health/search", async () => {
    return { module: "search", ok: true };
  });
};
