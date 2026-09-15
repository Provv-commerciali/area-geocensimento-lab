import{readFileSync}from"node:fs";import{describe,expect,it}from"vitest";
const sql=readFileSync("supabase/migrations/202609150002_dashboard_event_attribution.sql","utf8");
describe("dashboard event attribution migration",()=>{
  it("records creators, News, appraisals and first agency acquisition",()=>{for(const field of ["created_by_operator_id","news_found_at","news_found_by_operator_id","appraised_at","appraised_by_operator_id","engagement_acquired_at","engagement_acquired_by_operator_id"])expect(sql).toContain(field)});
  it("derives the actor from the authenticated operator and does not backfill invented history",()=>{expect(sql).toContain("auth_user_id = (select auth.uid())");expect(sql).not.toContain("set created_by_operator_id = responsible_operator_id")});
  it("protects audit writes with an invoker trigger",()=>{expect(sql).toContain("before insert or update");expect(sql).toContain("security invoker");expect(sql).not.toContain("security definer");expect(sql).toContain("revoke all on function public.audit_census_dashboard_events_lab() from public, anon")});
});
