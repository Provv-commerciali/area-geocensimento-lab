import { expect, test } from "@playwright/test";

test("municipalities load only after selecting their province", async ({ page }) => {
  await page.goto("/censimento/zone/nuova");
  const municipality = page.getByLabel("Comune *");
  await expect(municipality.locator("option")).toHaveCount(1);
  await page.getByLabel("Nazione *").selectOption({ index: 1 });
  await page.getByLabel("Regione *").selectOption({ index: 1 });
  const response = page.waitForResponse((candidate) => candidate.url().includes("/api/territory/municipalities?provinceId="));
  await page.getByLabel("Provincia *").selectOption({ index: 1 });
  expect((await response).ok()).toBe(true);
  await expect(municipality.locator("option")).not.toHaveCount(1);
  const streetsResponse = page.waitForResponse((candidate) => candidate.url().includes("/api/territory/streets?municipalityId="));
  await municipality.selectOption({ index: 1 });
  expect((await streetsResponse).ok()).toBe(true);
  await expect(page.getByText("Caricamento vie…")).toHaveCount(0);
});
