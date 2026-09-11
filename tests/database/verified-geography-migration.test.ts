import { describe,expect,it } from "vitest";
import fs from "node:fs";import path from "node:path";
const sql=fs.readFileSync(path.join(process.cwd(),"supabase/migrations/202609110012_verified_locations_and_cadastral_associations.sql"),"utf8");
describe("verified geography migration",()=>{
  it("migrates the legacy states and forbids geocoder verification",()=>{expect(sql).toContain("when 'GEOLOCATED' then 'VERIFIED'");expect(sql).toContain("when 'NEEDS_REVIEW' then case");expect(sql).toContain("'AUTO_GEOLOCATED'");expect(sql).toContain("v_status = 'VERIFIED' and v_method = 'GEOCODER'")});
  it("stores one civic point independently of contact subjects",()=>{expect(sql).toContain("save_civic_location_lab");expect(sql).not.toMatch(/alter table public\.subjects[\s\S]*location/i)});
  it("creates one confirmed cadastral association per property context",()=>{expect(sql).toContain("census_record_id uuid primary key");expect(sql).toContain("update public.census_records set sheet = v_sheet, parcel = v_parcel");expect(sql).not.toMatch(/set subaltern\s*=/i)});
  it("keeps RLS and authenticated execution",()=>{expect(sql).toContain("alter table public.cadastral_associations enable row level security");expect(sql).toContain("grant execute on function public.confirm_cadastral_association_lab")});
});
