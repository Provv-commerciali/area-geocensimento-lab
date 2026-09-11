import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/202609110011_subject_search_projection.sql", "utf8").toLowerCase();

describe("subject search projection migration", () => {
  it("creates a generated trigram-indexed projection", () => {
    expect(sql).toContain("generated always as");
    expect(sql).toContain("subjects_search_text_trgm_idx");
    expect(sql).toContain("extensions.gin_trgm_ops");
  });

  it("does not weaken registry authorization", () => {
    expect(sql).not.toMatch(/disable row level security|grant .* to anon/);
    expect(sql).not.toMatch(/drop\s+(table|column)/);
  });
});
