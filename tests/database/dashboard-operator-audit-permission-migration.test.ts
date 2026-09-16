import{readFileSync}from"node:fs";import{describe,expect,it}from"vitest";
const sql=readFileSync("supabase/migrations/202609150004_dashboard_operator_audit_permission.sql","utf8");
describe("dashboard operator audit permission repair",()=>{
  it("keeps auth-user lookup trigger-only without exposing operator identity links",()=>{expect(sql).toContain("alter function public.audit_census_dashboard_events_lab() security definer");expect(sql).toContain("from public, anon, authenticated");expect(sql).not.toContain("grant select");expect(sql).not.toContain("service_role")});
});
