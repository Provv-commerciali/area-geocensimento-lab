// Manual live-service verification, deliberately excluded from offline CI.
import { chromium } from "@playwright/test";
import sharp from "sharp";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const tileResponses=[];
  await page.route("https://tile.openstreetmap.org/**", async route => {
    const response=await route.fetch();tileResponses.push(response.status());await route.fulfill({response});
  });
  // Only the search location is a fixture. Map images use the real LAB proxy/AdE.
  await page.route("**/api/geocoding/search**", route => route.fulfill({ json: { results: [{ longitude: 10.2729223, latitude: 43.9099429, label: "Piano di Mommio — verifica cartografica" }] } }));
  const requests = [];
  page.on("response", response => {
    const url = new URL(response.url());
    if (url.pathname === "/api/map/cadastral" && url.searchParams.get("REQUEST") === "GetMap") requests.push({ status: response.status(), width: url.searchParams.get("WIDTH"), height: url.searchParams.get("HEIGHT") });
  });
  await page.goto("http://localhost:3100/geocensimento");
  await page.getByPlaceholder("es. Via Rizzoli 8, Bologna").fill("Piano di Mommio");
  await page.getByRole("button", { name: "Cerca", exact: true }).click();
  await page.getByText("Piano di Mommio — verifica cartografica", { exact: true }).waitFor();
  await page.waitForResponse(r => r.url().includes("/api/map/cadastral") && r.url().includes("GetMap") && r.status() === 200);
  await page.locator(".service-state.ready").waitFor({ timeout: 45000 });
  await page.waitForLoadState("networkidle");
  const map = page.getByLabel("Mappa GeoCensimento", { exact: true });
  await map.scrollIntoViewIfNeeded();
  await mkdir("test-results", { recursive: true });
  const screenshot = await map.screenshot({ path: "test-results/cadastral-overlay-live.png" });
  const { data, info } = await sharp(screenshot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let orange = 0;
  for (let i = 0; i < data.length; i += info.channels) if (data[i] > 190 && data[i+1] > 75 && data[i+1] < 180 && data[i+2] < 80) orange++;
  assert(orange > 1000, `No meaningful orange cadastral footprints rendered: ${orange} pixels`);
  assert(requests.every(r => Number(r.width) <= 2048 && Number(r.height) <= 2048));
  assert(!requests.some(r => r.status === 400), JSON.stringify(requests));
  console.log(JSON.stringify({ orangePixels: orange, requests, tileResponses, screenshot: "test-results/cadastral-overlay-live.png" }));
} finally { await browser.close(); }
