import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql=readFileSync(resolve("supabase/migrations/202609230001_zone_street_editing.sql"),"utf8").replace(/--.*$/gm,"").toLowerCase();

describe("Zone street editing migration",()=>{
  it("renames only a street associated with the selected zone",()=>{expect(sql).toContain("rename_zone_street_lab");expect(sql).toContain("from public.census_zone_streets");expect(sql).toContain("municipality_id = (select municipality_id from public.census_zones")});
  it("keeps authenticated invoker permissions",()=>{expect(sql).toContain("security invoker");expect(sql).not.toContain("security definer");expect(sql).toContain("revoke all on function public.rename_zone_street_lab(uuid, uuid, text) from public, anon");expect(sql).toContain("grant execute on function public.rename_zone_street_lab(uuid, uuid, text) to authenticated")});
});
