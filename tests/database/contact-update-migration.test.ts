import{describe,expect,it}from"vitest";import{readFileSync}from"node:fs";
const sql=readFileSync("supabase/migrations/202609110014_contact_updates.sql","utf8");
describe("contact update migration",()=>{
  it("updates the primary subject and its property context atomically",()=>{expect(sql).toContain("update_census_contact_lab");expect(sql).toContain("update public.subjects set");expect(sql).toContain("update public.census_records set");expect(sql).toContain("update public.census_record_subjects set role")});
  it("validates the address hierarchy and duplicate property context",()=>{expect(sql).toContain("census_zone_streets");expect(sql).toContain("complex_civics");expect(sql).toContain("already linked to an identical property context")});
  it("uses authenticated RLS and invoker rights",()=>{expect(sql).toContain('create policy "lab authenticated update" on public.subjects');expect(sql).toContain("security invoker");expect(sql).toContain("grant execute on function public.update_census_contact_lab")});
});
