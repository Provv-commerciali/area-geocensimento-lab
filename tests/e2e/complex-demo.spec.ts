import { expect, test } from "@playwright/test";

test("Complex localization cascades Zone → Street → Access and adds another Street",async({page})=>{
  await page.goto("/censimento/complessi/nuovo");
  await expect(page.getByRole("heading",{name:"Nuovo complesso"})).toBeVisible();
  await page.getByLabel("Zona di censimento *").selectOption("zone-1");
  await expect(page.getByLabel("Via / indirizzo *")).toContainText("Via Roma");
  await page.getByLabel("Via / indirizzo *").selectOption("st-1");
  await expect(page.getByLabel("Civico principale *")).toContainText("2/A");
  await page.getByLabel("Civico principale *").selectOption("cv-1");
  await page.getByRole("button",{name:/Aggiungi civico/}).click();
  const additional=page.locator(".complex-add-access");
  await expect(additional.getByLabel("Via / indirizzo")).toContainText("Via San Vitale");
  await additional.getByLabel("Via / indirizzo").selectOption("st-2");
  await expect(additional.getByRole("combobox",{name:"Civico"})).toContainText("4");
  await additional.getByRole("combobox",{name:"Civico"}).selectOption("cv-2");
  await additional.getByRole("button",{name:"Aggiungi accesso"}).click();
  await expect(page.getByText("Via San Vitale 4")).toBeVisible();
  await expect(page.getByRole("button",{name:"Salva complesso"})).toBeDisabled();
  await page.screenshot({path:"test-results/complex-create-demo.png",fullPage:true});
});
