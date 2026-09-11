import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql=readFileSync(resolve("supabase/migrations/202609110004_separate_record_creation_from_interviews.sql"),"utf8").replace(/--.*$/gm,"").toLowerCase();

describe("record/interview separation migration",()=>{
  it("enforces a structured floor for partial-building records",()=>{ expect(sql).toContain("building_scope = 'parte di edificio' and floor_code is not null"); expect(sql).toContain("census_records_floor_within_total_check") });
  it("rejects interviews from record creation",()=>{ expect(sql).toContain("if p_interview is not null"); expect(sql).toContain("interviews must be created with an explicit interview action") });
  it("provides a separate least-privilege interview command",()=>{ expect(sql).toContain("function public.create_census_interview_lab"); expect(sql).toContain("security invoker"); expect(sql).toMatch(/grant execute on function public\.create_census_interview_lab\(uuid, jsonb\) to authenticated/) });
  it("derives contact status from real interview rows in an RLS-aware view",()=>{ expect(sql).toContain("view public.census_record_contact_status"); expect(sql).toContain("with (security_invoker = true)"); expect(sql).toMatch(/exists \([\s\S]*from public\.census_interviews/); expect(sql).toContain("max(i.interview_date)") });
  it("does not disable RLS or use service role",()=>{ expect(sql).not.toContain("disable row level security"); expect(sql).not.toContain("service_role"); expect(sql).not.toContain("security definer") });
});
