import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql=readFileSync(resolve("supabase/migrations/202609110003_complete_milestone_one_workflows.sql"),"utf8").replace(/--.*$/gm,"").toLowerCase();

describe("Milestone 1 workflow migration",()=>{
  it("normalizes and uniquely constrains streets and civics",()=>{ expect(sql).toContain("streets_municipality_normalized_name_uidx"); expect(sql).toContain("civics_street_normalized_number_extension_uidx") });
  it("stores structured floors and controlled vocabularies",()=>{ expect(sql).toContain("add column floor_code"); expect(sql).toContain("add column total_floors"); expect(sql).toContain("add column is_top_floor"); expect(sql).toContain("libero al rogito"); expect(sql).toContain("occupato dall''inquilino"); expect(sql).toContain("proprietario', 'inquilino") });
  it("provides authenticated workflow functions",()=>{ for(const name of ["create_census_zone_lab","attach_street_to_zone_lab","add_civics_to_street_lab","create_census_record_lab"]){ expect(sql).toContain(`function public.${name}`); expect(sql).toMatch(new RegExp(`grant execute on function public\\.${name}[\\s\\S]*?to authenticated`)) } });
  it("prevents significant duplicates without person-wide uniqueness",()=>expect(sql).toContain("census_records_significant_duplicate_uidx"));
  it("does not weaken RLS or introduce client service-role access",()=>{ expect(sql).not.toContain("disable row level security"); expect(sql).not.toContain("service_role"); expect(sql).not.toContain("security definer") });
});
