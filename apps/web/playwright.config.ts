import { defineConfig, devices } from "@playwright/test";

const disableWebServer = process.env.PLAYWRIGHT_DISABLE_WEBSERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  tsconfig: "./tsconfig.app.json",
  fullyParallel: true,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry"
  },
  webServer: disableWebServer
    ? undefined
    : {
        command: "pnpm dev --host 127.0.0.1 --port 4173",
        port: 4173,
        reuseExistingServer: !process.env.CI
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
