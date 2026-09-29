import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const create=readFileSync("supabase/migrations/202609290001_complex_access_workflow.sql","utf8").toLowerCase();
const manage=readFileSync("supabase/migrations/202609290002_complex_management.sql","utf8").toLowerCase();
const deleteGuard=readFileSync("supabase/migrations/202609290004_complex_delete_guard.sql","utf8").toLowerCase();
describe("Complex access workflow migration",()=>{
  it("persists exactly one primary in normal commands and globally exclusive Access ownership",()=>{
    expect(create).toContain("add column is_primary boolean not null");
    expect(create).toContain("where is_primary");
    expect(create).toContain("on public.complex_address_accesses(address_access_id)");
    expect(create).toContain("deferrable initially deferred");
    expect(create).toContain("create_complex_lab");
  });
  it("guards Zone Street detach and Complex Zone change",()=>{
    expect(create).toContain("zone_street_detach_guard before delete");
    expect(create).toContain("join public.complex_address_accesses");
    expect(create).toContain("complex_zone_change_guard");
  });
  it("keeps update/delete transactional and refuses destructive changes in use",()=>{
    expect(manage).toContain("complex_access_detach_guard before delete");
    expect(manage).toContain("create or replace function public.update_complex_lab");
    expect(manage).toContain("create or replace function public.delete_complex_lab");
    expect(manage).toContain("complex has contacts or photo/ocr audit");
    expect(manage).toContain("grant execute on function public.update_complex_lab");
    expect(manage).toContain("grant execute on function public.delete_complex_lab");
    expect(deleteGuard).toContain("complex_delete_guard before delete on public.complexes");
  });
});
