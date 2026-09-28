import { expect, test } from "@playwright/test";

test("visual census workflow in isolated demo",async({page})=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/login");
  const demo=page.getByRole("link",{name:"Entra nella demo LAB"});
  test.skip(!await demo.isVisible(),"Run only against the isolated read-only demo server");
  await demo.click();
  for(const [url,title,screenshot] of [
    ["/censimento/zone","Zone","zones"],
    ["/censimento/zone/zone-1","Centro Storico","zone"],
    ["/censimento/zone/zone-1/vie/st-1","Via Roma","street"],
    ["/censimento/zone/zone-1/vie/st-1/civici/cv-1","Via Roma, 2/A","civic"],
    ["/censimento/contatti/rec-1","Ferri Anna","contact"],
  ] as const){
    await page.goto(url);
    await expect(page.locator(".page-header h1")).toContainText(title);
    const titleSize=Number.parseFloat(await page.locator(".page-header h1").evaluate(element=>getComputedStyle(element).fontSize));
    expect(titleSize).toBeGreaterThanOrEqual(24);expect(titleSize).toBeLessThanOrEqual(26);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/census-ux-demo-${screenshot}.png`,fullPage:true,caret:"initial"});
  }
  await page.goto("/censimento/zone/zone-1/vie/st-1");
  await expect(page.getByText("Filtri avanzati")).toBeVisible();
  await page.getByText("Filtri avanzati").click();
  await expect(page.getByLabel("Nominativo")).toBeVisible();
  await expect(page.getByRole("link",{name:"Apri contatti"}).first()).toBeVisible();
  await page.goto("/censimento/zone/zone-1/vie/st-1/civici/cv-1");
  await expect(page.getByRole("heading",{name:/Complesso:/})).toBeVisible();
  await page.getByText("Mostra interni e unità").click();
  await expect(page.getByRole("link",{name:"Apri complesso"})).toBeVisible();
  await page.goto("/censimento/contatti/rec-1");
  const gap=await page.evaluate(()=>{const panels=[...document.querySelectorAll("main > section.panel")].map(element=>element.getBoundingClientRect());return panels.length>1?panels[1].top-panels[0].bottom:null});
  expect(gap).not.toBeNull();expect(gap!).toBeGreaterThanOrEqual(16);
  await page.setViewportSize({width:390,height:844});
  await page.goto("/censimento/zone/zone-1/vie/st-1");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await expect(page.locator(".page-header h1")).toHaveCSS("font-size","24px");
  await page.screenshot({path:"test-results/census-ux-demo-street-mobile.png",fullPage:true,caret:"initial"});
  await page.goto("/censimento/contatti/rec-1");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
