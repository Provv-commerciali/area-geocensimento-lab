import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const foundation=readFileSync("supabase/migrations/202609240002_anncsu_territorial_foundation.sql","utf8").toLowerCase();
const commands=readFileSync("supabase/migrations/202609240003_anncsu_territorial_commands.sql","utf8").toLowerCase();
const census=readFileSync("supabase/migrations/202609240004_anncsu_census_access_commands.sql","utf8").toLowerCase();

describe("ANNCSU cutover migration contract",()=>{
  it("uses official progressives rather than visible-label uniqueness",()=>{
    expect(foundation).toContain("streets_anncsu_progressivo_uidx");
    expect(foundation).toContain("address_accesses_anncsu_progressivo_uidx");
    expect(foundation).toContain("drop index if exists public.streets_municipality_normalized_name_uidx");
    expect(foundation).not.toContain("unique (street_id,civic");
    expect(foundation).toContain("drop table public.civics");
  });
  it("keeps source observations, review provenance and protected reference data",()=>{
    expect(foundation).toContain("extensions.geometry(point,6706)");
    expect(foundation).toContain("raw_longitude text");
    expect(foundation).toContain("longitude numeric(10,7)");
    expect(foundation).toContain("manual_author uuid");
    expect(foundation).toContain("manual_review_state text");
    expect(foundation).toContain("anncsu_progressivo_nazionale is null and first_seen_run_id is null");
    expect(foundation).toContain("anncsu_progressivo_accesso is null and first_seen_run_id is null");
    expect(commands).toContain("assert_territorial_identity_lab");
    expect(foundation).toContain("revoke all on public.streets");
    expect(foundation).toContain("'localities','address_accesses'");
    expect(foundation).toContain("enable row level security");
  });
  it("guards the municipality and scopes Accesses to Zone Streets without requiring records",()=>{
    expect(commands).toContain("assert_zone_street_municipality_lab");
    expect(commands).toContain("zone_address_accesses_lab");
    expect(commands).toContain("zone_access_counts_lab");
    expect(commands).not.toMatch(/zone_address_accesses_lab[\s\S]*join public\.census_records/);
    expect(census).toContain("addressaccessid");
    expect(census).toContain("address_access_id");
  });
});
