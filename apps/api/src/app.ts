import Fastify from "fastify";
import cors from "@fastify/cors";
import { openApiSpec } from "./openapi.js";
import { adminPlugin } from "./plugins/admin.js";
import { ingestionPlugin } from "./plugins/ingestion.js";
import { queryPlugin } from "./plugins/query.js";
import { searchPlugin } from "./plugins/search.js";

export const buildApp = () => {
  const app = Fastify({ logger: true });
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173", "https://seasu.github.io"];

  void app.register(cors, {
    origin: corsOrigins
  });

  app.get("/health", async () => ({ ok: true }));
  app.get("/openapi.json", async () => openApiSpec);

  app.register(queryPlugin);
  app.register(searchPlugin);
  app.register(ingestionPlugin, { prefix: "/ingestion" });
  app.register(adminPlugin, { prefix: "/admin" });

  return app;
};
