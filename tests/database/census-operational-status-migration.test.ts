import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql=readFileSync("supabase/migrations/202609110008_census_operational_status.sql","utf8").toLowerCase();

describe("census operational status migration",()=>{
  it("adds only the persistent typed singleton setting",()=>{expect(sql).toContain("create table public.census_operational_settings");expect(sql).toContain("stale_news_days integer not null default 30");expect(sql).not.toMatch(/alter table public\.census_records[\s\S]*add column[\s\S]*(is_stale|is_recall|days_since)/)});
  it("keeps RLS and grants least-privilege authenticated access",()=>{expect(sql).toContain("enable row level security");expect(sql).toContain("grant select on table public.census_operational_settings to authenticated");expect(sql).toContain("grant update (stale_news_days) on table public.census_operational_settings to authenticated");expect(sql).not.toMatch(/grant[^;]*(insert|delete|truncate)[^;]*census_operational_settings/)});
  it("validates a bounded positive threshold and preserves existing data",()=>{expect(sql).toContain("between 1 and 3650");expect(sql).toContain("on conflict (id) do nothing");expect(sql).not.toContain("drop table")});
});
