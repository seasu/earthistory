import fs from "node:fs";
import path from "node:path";

const usagePathArgIndex = process.argv.findIndex((arg) => arg === "--input");
const usagePath =
  usagePathArgIndex >= 0 && process.argv[usagePathArgIndex + 1]
    ? process.argv[usagePathArgIndex + 1]
    : "infra/ops/usage-snapshot.json";

const fullPath = path.resolve(process.cwd(), usagePath);

if (!fs.existsSync(fullPath)) {
  console.error(`Usage snapshot not found: ${fullPath}`);
  process.exit(1);
}

/** @type {{ generatedAt: string, services: Array<{name: string, usagePercent: number}> }} */
const snapshot = JSON.parse(fs.readFileSync(fullPath, "utf8"));

if (!Array.isArray(snapshot.services)) {
  console.error("Invalid snapshot format: services must be an array");
  process.exit(1);
}

const warnThreshold = 70;
const criticalThreshold = 90;

let hasWarning = false;
let hasCritical = false;

console.log(`Usage snapshot generated at: ${snapshot.generatedAt}`);
console.log("");

for (const service of snapshot.services) {
  const usage = Number(service.usagePercent);
  let level = "OK";

  if (!Number.isFinite(usage)) {
    console.error(`Invalid usage for ${service.name}`);
    process.exit(1);
  }

  if (usage >= criticalThreshold) {
    level = "CRITICAL";
    hasCritical = true;
  } else if (usage >= warnThreshold) {
    level = "WARNING";
    hasWarning = true;
  }

  console.log(`${service.name}: ${usage.toFixed(2)}% -> ${level}`);
}

if (hasCritical) {
  console.error("");
  console.error("Critical threshold reached (>=90%).");
  process.exit(2);
}

if (hasWarning) {
  console.error("");
  console.error("Warning threshold reached (>=70%).");
  process.exit(0);
}

console.log("");
console.log("All services below warning threshold.");
