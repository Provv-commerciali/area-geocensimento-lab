import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql=readFileSync("supabase/migrations/202609150001_controlled_engagement_type.sql","utf8");

describe("controlled engagement type migration",()=>{
  it("constrains the five approved values",()=>{for(const value of ["Nessuno","Incarico altre agenzie","In esclusiva","Verbale","Non esclusivo"])expect(sql).toContain(`'${value}'`);expect(sql).toContain("census_records_engagement_type_check")});
  it("persists the value through create and update workflows",()=>{expect(sql).toContain("create or replace function public.create_census_record_lab");expect(sql).toContain("create or replace function public.update_census_contact_lab");expect(sql).toContain("engagement_type = v_engagement_type")});
  it("keeps authenticated invoker boundaries",()=>{expect(sql).toContain("security invoker");expect(sql).not.toContain("security definer");expect(sql).toContain("to authenticated")});
});
