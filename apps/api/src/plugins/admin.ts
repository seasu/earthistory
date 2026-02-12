import { FastifyPluginAsync } from "fastify";

export const adminPlugin: FastifyPluginAsync = async (app) => {
  app.get("/health/admin", async () => {
    return { module: "admin", ok: true };
  });
};
