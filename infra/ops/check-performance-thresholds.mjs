import fs from "node:fs";
import path from "node:path";

const inputArgIndex = process.argv.findIndex((arg) => arg === "--input");
const inputPath =
  inputArgIndex >= 0 && process.argv[inputArgIndex + 1]
    ? process.argv[inputArgIndex + 1]
    : "infra/ops/performance-baseline.json";

const fullPath = path.resolve(process.cwd(), inputPath);
if (!fs.existsSync(fullPath)) {
  console.error(`Performance baseline not found: ${fullPath}`);
  process.exit(1);
}

const warnMultiplier = 1.2;
const thresholds = {
  webFirstScreenP95Ms: Number(process.env.WEB_FIRST_SCREEN_P95_MS ?? "2500"),
  interactionP95Ms: Number(process.env.INTERACTION_P95_MS ?? "800"),
  apiP95Ms: Number(process.env.API_P95_MS ?? "700")
};

for (const [name, value] of Object.entries(thresholds)) {
  if (!Number.isFinite(value) || value <= 0) {
    console.error(`Invalid threshold ${name}: ${value}`);
    process.exit(1);
  }
}

/** @type {{ generatedAt: string, metrics: { webFirstScreen: {p95Ms:number}, interactionLatency:{p95Ms:number}, apiOverall:{p95Ms:number} } }} */
const baseline = JSON.parse(fs.readFileSync(fullPath, "utf8"));

const observed = {
  webFirstScreenP95Ms: baseline?.metrics?.webFirstScreen?.p95Ms,
  interactionP95Ms: baseline?.metrics?.interactionLatency?.p95Ms,
  apiP95Ms: baseline?.metrics?.apiOverall?.p95Ms
};

for (const [name, value] of Object.entries(observed)) {
  if (!Number.isFinite(value) || value <= 0) {
    console.error(`Invalid baseline metric ${name}: ${value}`);
    process.exit(1);
  }
}

let hasWarning = false;
let hasCritical = false;

console.log(`Performance baseline generated at: ${baseline.generatedAt}`);
console.log("");

for (const [name, value] of Object.entries(observed)) {
  const threshold = thresholds[name];
  let level = "OK";

  if (value > threshold * warnMultiplier) {
    hasCritical = true;
    level = "CRITICAL";
  } else if (value > threshold) {
    hasWarning = true;
    level = "WARNING";
  }

  console.log(`${name}: observed=${value}ms, threshold=${threshold}ms -> ${level}`);
}

if (hasCritical) {
  console.error("");
  console.error("Critical performance regression detected (>120% threshold).");
  process.exit(2);
}

if (hasWarning) {
  console.error("");
  console.error("Performance warning: baseline exceeds threshold.");
  process.exit(0);
}

console.log("");
console.log("All metrics within threshold.");
