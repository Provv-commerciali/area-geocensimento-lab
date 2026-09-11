import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3100", trace: "on-first-retry" },
  webServer: { command: "node node_modules/next/dist/bin/next dev -p 3100", url: "http://localhost:3100", reuseExistingServer: !process.env.CI },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
