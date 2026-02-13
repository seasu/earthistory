import { expect, test, type Page } from "@playwright/test";

type EventItem = {
  id: number;
  title: string;
  summary: string;
  category: string;
  regionName: string;
  precisionLevel: "year" | "decade" | "century";
  confidenceScore: number;
  timeStart: number;
  timeEnd: number | null;
  sourceUrl: string;
  lat: number;
  lng: number;
};

const allEvents: EventItem[] = [
  {
    id: 1,
    title: "Great Flood Narrative",
    summary: "Recorded narrative tied to early Mesopotamian settlements.",
    category: "civilization",
    regionName: "Mesopotamia",
    precisionLevel: "century",
    confidenceScore: 0.75,
    timeStart: -2000,
    timeEnd: null,
    sourceUrl: "https://example.org/flood",
    lat: 31.32,
    lng: 45.64
  },
  {
    id: 2,
    title: "Fall of Constantinople",
    summary: "Ottoman forces captured Constantinople in 1453.",
    category: "war",
    regionName: "Anatolia",
    precisionLevel: "year",
    confidenceScore: 0.98,
    timeStart: 1453,
    timeEnd: null,
    sourceUrl: "https://example.org/constantinople",
    lat: 41.01,
    lng: 28.98
  },
  {
    id: 3,
    title: "Columbus Reaches the Caribbean",
    summary: "1492 Atlantic crossing connected Europe and the Americas.",
    category: "exploration",
    regionName: "Caribbean",
    precisionLevel: "year",
    confidenceScore: 0.95,
    timeStart: 1492,
    timeEnd: null,
    sourceUrl: "https://example.org/columbus",
    lat: 24.06,
    lng: -74.53
  }
];

const regions = ["Mesopotamia", "Anatolia", "Caribbean"];

const installHealthyRoutes = async (page: Page) => {
  await page.route("**/api/regions", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ total: regions.length, items: regions })
    });
  });

  await page.route("**/api/events**", async (route) => {
    const url = new URL(route.request().url());
    const from = Number(url.searchParams.get("from"));
    const to = Number(url.searchParams.get("to"));
    const category = url.searchParams.get("category");

    const filtered = allEvents.filter((event) => {
      if (event.timeStart < from || event.timeStart > to) {
        return false;
      }
      if (category && category !== "all" && event.category !== category) {
        return false;
      }
      return true;
    });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ total: filtered.length, items: filtered })
    });
  });
};

test("critical flow supports timeline, map mode, and filters", async ({ page }) => {
  await installHealthyRoutes(page);
  await page.goto("/");

  // Default mode is maplibre (2D), verify 2D button is active
  await expect(page.getByRole("button", { name: "2D" })).toBeVisible();
  await expect(page.getByRole("button", { name: "3D" })).toBeVisible();

  // Switch to 3D mode
  await page.getByRole("button", { name: "3D" }).click();

  // Verify Cesium placeholder heading appears
  await expect(page.getByRole("heading", { name: "3D Globe Provider (Cesium)" })).toBeVisible();

  // Switch back to 2D
  await page.getByRole("button", { name: "2D" }).click();

  // Verify events are visible at default year (1450, ±50 → 1400-1500)
  await expect(page.getByRole("button", { name: /Fall of Constantinople/ })).toBeVisible();

  // Move timeline to -2000
  await page.locator("#active-year").evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = "-2000";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  await expect(page.getByRole("button", { name: /Great Flood Narrative/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Fall of Constantinople/ })).toHaveCount(0);

  // Apply filters
  await page.getByLabel("Category").selectOption("civilization");
  await page.getByLabel("Region").selectOption("Mesopotamia");
  await page.getByLabel("Keyword").fill("flood");

  const floodEvent = page.getByRole("button", { name: /Great Flood Narrative/ });
  await expect(floodEvent).toHaveCount(1);
  await floodEvent.click();

  // Verify event detail is shown
  await expect(page.getByRole("heading", { name: "Great Flood Narrative" })).toBeVisible();
  await expect(page.getByText("Region: Mesopotamia")).toBeVisible();
  await expect(page.getByRole("link", { name: "Source" })).toHaveAttribute(
    "href",
    "https://example.org/flood"
  );
});

test("event API error state is recoverable with retry", async ({ page }) => {
  await page.route("**/api/regions", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ total: regions.length, items: regions })
    });
  });

  let eventRequestCount = 0;
  await page.route("**/api/events**", async (route) => {
    eventRequestCount += 1;
    if (eventRequestCount === 1) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "internal error" })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ total: 1, items: [allEvents[1]] })
    });
  });

  await page.goto("/");

  await expect(page.getByText("Event load error: Request failed with status 500")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();

  await page.getByRole("button", { name: "Retry" }).click();

  await expect(page.getByText("Event load error: Request failed with status 500")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Fall of Constantinople/ })).toBeVisible();
});
