const webUrl = process.env.STAGING_WEB_URL;
const apiUrl = process.env.STAGING_API_URL;

if (!webUrl) {
  console.error("Missing STAGING_WEB_URL");
  process.exit(1);
}

if (!apiUrl) {
  console.error("Missing STAGING_API_URL");
  process.exit(1);
}

const trimRightSlash = (url) => url.replace(/\/+$/, "");
const withTrailingSlash = (url) => `${trimRightSlash(url)}/`;

const web = withTrailingSlash(webUrl);
const api = trimRightSlash(apiUrl);

const assertOk = async (url, label) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${label} failed: ${response.status} ${response.statusText}`);
  }
  return response;
};

const assertJson = async (url, label, validator) => {
  const response = await assertOk(url, label);
  const payload = await response.json();
  const valid = validator(payload);
  if (!valid) {
    throw new Error(`${label} returned unexpected payload`);
  }
};

const run = async () => {
  console.log(`Smoke test web: ${web}`);
  console.log(`Smoke test api: ${api}`);

  await assertOk(web, "web root");
  await assertJson(`${api}/health`, "api health", (payload) => payload && payload.ok === true);
  await assertJson(`${api}/events`, "api events", (payload) => Array.isArray(payload?.items));
  await assertJson(`${api}/regions`, "api regions", (payload) => Array.isArray(payload?.items));
  await assertJson(`${api}/openapi.json`, "api openapi", (payload) => payload?.openapi === "3.0.3");

  console.log("Staging smoke test passed.");
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
