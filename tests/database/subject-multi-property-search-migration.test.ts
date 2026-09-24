import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql=readFileSync("supabase/migrations/202609240001_subject_multi_property_search.sql","utf8").toLowerCase();

describe("multi-property Subject search migration",()=>{
  it("adds an indexed search document with both name orders and contact identifiers",()=>{expect(sql).toContain("add column search_document");expect(sql).toContain("coalesce(first_name");expect(sql).toContain("coalesce(last_name");expect(sql).toContain("coalesce(phone");expect(sql).toContain("coalesce(email");expect(sql).toContain("subjects_search_document_trgm_idx")});
  it("preserves existing data and authorization",()=>{expect(sql).not.toMatch(/drop\s+(table|column)/);expect(sql).not.toMatch(/disable row level security|grant .* to anon/) });
});
