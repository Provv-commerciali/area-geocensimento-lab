import{describe,expect,it}from"vitest";import{readFileSync}from"node:fs";
const sql=readFileSync("supabase/migrations/202609110015_contact_deletion.sql","utf8");
describe("contact deletion migration",()=>{
  it("deletes only the selected census context through authenticated invoker rights",()=>{expect(sql).toContain("delete_census_contact_lab");expect(sql).toContain("security invoker");expect(sql).toContain("delete from public.census_records where id=p_record_id");expect(sql).not.toContain("delete from public.subjects")});
  it("detaches an optional doorbell acquisition audit before deletion",()=>{expect(sql).toContain("to_regclass('public.doorbell_contact_proposals')");expect(sql).toContain("set census_record_id=null")});
});
