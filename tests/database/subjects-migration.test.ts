import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe,expect,it } from "vitest";

const sql=readFileSync(resolve("supabase/migrations/202609110005_normalize_subjects_and_property_links.sql"),"utf8").replace(/--.*$/gm,"").toLowerCase();
describe("subjects normalization migration",()=>{
  it("creates private/company subjects and a many-to-many property link",()=>{expect(sql).toContain("create table public.subjects");expect(sql).toContain("'privato', 'azienda'");expect(sql).toContain("create table public.census_record_subjects");expect(sql).toContain("primary key (census_record_id, subject_id)")});
  it("uses strong normalized identifiers",()=>{expect(sql).toContain("subjects_normalized_tax_code_uidx");expect(sql).toContain("subjects_normalized_vat_number_uidx")});
  it("backfills names only as distinct subjects unless a strong tax code matches",()=>{expect(sql).toContain("distinct on (upper(regexp_replace(btrim(r.tax_code)");expect(sql).toContain("select r.id, 'privato'");expect(sql).not.toContain("distinct on (lower(r.last_name")});
  it("preserves legacy census columns while making new links authoritative",()=>{expect(sql).toContain("legacy subject snapshot");expect(sql).toContain("alter column last_name drop not null")});
  it("provides invoker RPCs only to authenticated users",()=>{expect(sql).toContain("function public.create_subject_lab");expect(sql).toContain("function public.link_subject_to_census_record_lab");expect(sql).toContain("security invoker");expect(sql).toContain("to authenticated");expect(sql).not.toContain("security definer");expect(sql).not.toContain("disable row level security")});
  it("does not grant destructive subject or relationship privileges",()=>{expect(sql).toContain("grant select, insert on public.subjects to authenticated");expect(sql).toContain("grant select, insert, update on public.census_record_subjects to authenticated");expect(sql).not.toMatch(/grant[^;]*delete[^;]*subjects/)});
  it("keeps interview creation scoped to census records",()=>expect(sql).not.toMatch(/alter table public\.census_interviews[\s\S]*subject_id/));
});
