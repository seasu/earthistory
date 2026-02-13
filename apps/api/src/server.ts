import { buildApp } from "./app.js";

const start = async () => {
  const app = buildApp();
  const port = Number(process.env.PORT ?? 3001);

  try {
    await app.listen({ port: Number.isFinite(port) ? port : 3001, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
