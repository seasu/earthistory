import { FastifyPluginAsync } from "fastify";

export const queryPlugin: FastifyPluginAsync = async (app) => {
  app.get("/health/query", async () => {
    return { module: "query", ok: true };
  });
};
