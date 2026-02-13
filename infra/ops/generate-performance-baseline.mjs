import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

const webUrl = process.env.STAGING_WEB_URL;
const apiUrl = process.env.STAGING_API_URL;
const sampleCount = Number(process.env.PERF_SAMPLE_COUNT ?? "12");

if (!webUrl) {
  console.error("Missing STAGING_WEB_URL");
  process.exit(1);
}

if (!apiUrl) {
  console.error("Missing STAGING_API_URL");
  process.exit(1);
}

if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
  console.error(`Invalid PERF_SAMPLE_COUNT: ${process.env.PERF_SAMPLE_COUNT}`);
  process.exit(1);
}

const trimRightSlash = (url) => url.replace(/\/+$/, "");

const web = trimRightSlash(webUrl);
const api = trimRightSlash(apiUrl);

const percentile = (values, pct) => {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1);
  return Number(sorted[index].toFixed(2));
};

const average = (values) => {
  if (!values.length) {
    return null;
  }
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
};

const measure = async (url) => {
  const start = performance.now();
  const response = await fetch(url, {
    headers: {
      "cache-control": "no-cache"
    }
  });
  const end = performance.now();

  if (!response.ok) {
    throw new Error(`Request failed: ${url} -> ${response.status}`);
  }

  return end - start;
};

const endpoints = {
  health: `${api}/health`,
  events: `${api}/events?from=1300&to=1600&limit=200`,
  regions: `${api}/regions`,
  sources: `${api}/sources`
};

const metrics = {
  webFirstScreenMs: [],
  interactionLatencyMs: [],
  apiLatencyMs: [],
  apiByEndpointMs: {
    health: [],
    events: [],
    regions: [],
    sources: []
  }
};

for (let i = 0; i < sampleCount; i += 1) {
  metrics.webFirstScreenMs.push(await measure(`${web}/`));

  for (const [name, url] of Object.entries(endpoints)) {
    const latency = await measure(url);
    metrics.apiLatencyMs.push(latency);
    metrics.apiByEndpointMs[name].push(latency);
    if (name === "events") {
      metrics.interactionLatencyMs.push(latency);
    }
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  input: {
    webUrl: `${web}/`,
    apiUrl: api,
    sampleCount
  },
  metrics: {
    webFirstScreen: {
      avgMs: average(metrics.webFirstScreenMs),
      p95Ms: percentile(metrics.webFirstScreenMs, 95)
    },
    interactionLatency: {
      avgMs: average(metrics.interactionLatencyMs),
      p95Ms: percentile(metrics.interactionLatencyMs, 95),
      note: "Interaction latency uses /events API as timeline/filter interaction proxy."
    },
    apiOverall: {
      avgMs: average(metrics.apiLatencyMs),
      p95Ms: percentile(metrics.apiLatencyMs, 95)
    },
    apiByEndpoint: Object.fromEntries(
      Object.entries(metrics.apiByEndpointMs).map(([name, values]) => [
        name,
        {
          avgMs: average(values),
          p95Ms: percentile(values, 95)
        }
      ])
    )
  }
};

const outPath = path.resolve(process.cwd(), "infra/ops/performance-baseline.json");
fs.writeFileSync(outPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(`Performance baseline written: ${outPath}`);
