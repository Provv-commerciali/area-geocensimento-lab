import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/202609110010_runtime_performance_indexes.sql", "utf8").toLowerCase();

describe("runtime performance migration", () => {
  it("indexes reverse link traversal and operational filters", () => {
    expect(sql).toContain("census_zone_streets (street_id, census_zone_id)");
    expect(sql).toContain("complex_civics (civic_id, complex_id)");
    expect(sql).toContain("census_records (complex_id)");
    expect(sql).toContain("census_records (responsible_operator_id)");
    expect(sql).toContain("census_records (contact_type_id)");
  });

  it("is incremental and does not weaken authorization", () => {
    expect(sql).toContain("create index if not exists");
    expect(sql).not.toMatch(/drop\s+(table|index)/);
    expect(sql).not.toMatch(/disable row level security|grant .* to anon/);
  });
});
