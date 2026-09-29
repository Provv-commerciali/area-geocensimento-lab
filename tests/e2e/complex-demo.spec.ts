import { expect, test } from "@playwright/test";

test("Complex localization cascades Zone → Street → Access and adds another Street",async({page})=>{
  await page.goto("/censimento/complessi/nuovo");
  await expect(page.getByRole("heading",{name:"Nuovo complesso"})).toBeVisible();
  await page.getByLabel("Zona di censimento *").selectOption("zone-1");
  await page.getByLabel("Via / indirizzo *").fill("Roma");
  await page.getByRole("button",{name:"Via Roma",exact:true}).click();
  await page.getByLabel("Civico principale *").fill("2/A");
  await page.getByRole("button",{name:"2/A",exact:true}).click();
  await expect(page.getByLabel("Civico principale *")).toHaveValue("2/A");
  await page.getByRole("button",{name:/Aggiungi civico/}).click();
  const additional=page.locator(".complex-add-access");
  await additional.getByLabel("Via / indirizzo").fill("San Vitale");
  await additional.getByRole("button",{name:"Via San Vitale",exact:true}).click();
  await additional.getByLabel("Civico").fill("4");
  await additional.getByRole("button",{name:"4",exact:true}).click();
  await additional.getByRole("button",{name:"Aggiungi accesso"}).click();
  await expect(page.getByText("Via San Vitale 4")).toBeVisible();
  await expect(page.getByRole("button",{name:"Salva complesso"})).toBeDisabled();
  await page.screenshot({path:"test-results/complex-create-demo.png",fullPage:true});
});
