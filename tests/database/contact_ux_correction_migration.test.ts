import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe,expect,it } from "vitest";

const sql=readFileSync(resolve("supabase/migrations/202609110006_restore_contact_ux_and_coownership.sql"),"utf8").replace(/--.*$/gm,"").toLowerCase();

describe("contact UX correction migration",()=>{
  it("adds comproprietario without removing existing relationship roles",()=>{expect(sql).toContain("'proprietario', 'comproprietario', 'inquilino', 'non specificato'");expect(sql).not.toContain("drop table public.subjects");expect(sql).not.toContain("drop table public.census_record_subjects")});
  it("allows comproprietario in the constraint and both authenticated workflows",()=>{expect(sql.match(/'proprietario', 'comproprietario', 'inquilino'/g)).toHaveLength(3);expect(sql).toContain("security invoker");expect(sql).not.toContain("security definer")});
  it("continues rejecting synthetic interviews",()=>expect(sql).toContain("interviews must be created with an explicit interview action"));
});
