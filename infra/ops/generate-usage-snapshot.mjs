import fs from "node:fs";
import path from "node:path";

const toPercent = (value, fieldName) => {
  if (value === undefined) {
    throw new Error(`Missing required env var: ${fieldName}`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error(`Invalid percentage for ${fieldName}: ${value}`);
  }

  return parsed;
};

const snapshot = {
  generatedAt: new Date().toISOString(),
  services: [
    { name: "frontend_pages", usagePercent: toPercent(process.env.FRONTEND_USAGE_PCT, "FRONTEND_USAGE_PCT") },
    { name: "api_render", usagePercent: toPercent(process.env.API_USAGE_PCT, "API_USAGE_PCT") },
    { name: "db_supabase", usagePercent: toPercent(process.env.DB_USAGE_PCT, "DB_USAGE_PCT") }
  ]
};

const outPath = path.resolve(process.cwd(), "infra/ops/usage-snapshot.json");
fs.writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`Usage snapshot written: ${outPath}`);
