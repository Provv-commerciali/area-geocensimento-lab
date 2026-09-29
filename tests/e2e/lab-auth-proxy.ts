import type { Page } from "@playwright/test";

// CI browser egress can be blocked while the Node test runner can reach LAB Auth.
// This forwards the real browser request to the real LAB endpoint, without a mock response.
export async function forwardLabAuth(page:Page){
  await page.route("https://fomluksjubzimkfnzouf.supabase.co/auth/v1/**",async route=>{
    const response=await route.fetch({timeout:20000});
    await route.fulfill({response});
  });
}
