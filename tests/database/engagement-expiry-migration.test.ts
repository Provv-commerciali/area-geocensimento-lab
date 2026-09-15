import{readFileSync}from"node:fs";import{describe,expect,it}from"vitest";
const sql=readFileSync("supabase/migrations/202609150003_engagement_expiry.sql","utf8");
describe("engagement expiry migration",()=>{
  it("adds the expiry and enforces it with a deferred database constraint",()=>{expect(sql).toContain("add column engagement_expires_on date");expect(sql).toContain("deferrable initially deferred");expect(sql).toContain("Incarico altre agenzie");expect(sql).toContain("In esclusiva")});
  it("wraps create and update atomically without bypassing RLS",()=>{expect(sql).toContain("create_census_record_core_lab");expect(sql).toContain("update_census_contact_core_lab");expect(sql).toContain("security invoker");expect(sql).not.toContain("security definer");expect(sql).toContain("grant execute on function public.create_census_record_lab(jsonb, jsonb) to authenticated")});
});
