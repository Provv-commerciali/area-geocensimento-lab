import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/202609110002_fix_authenticated_permissions.sql",
);
const sql = readFileSync(migrationPath, "utf8")
  .replace(/--.*$/gm, "")
  .replace(/\s+/g, " ")
  .toLowerCase();

const operationalTables = [
  "census_zones",
  "streets",
  "census_zone_streets",
  "civics",
  "complexes",
  "complex_civics",
  "census_records",
  "census_interviews",
];

const referenceTables = [
  "operators",
  "countries",
  "regions",
  "provinces",
  "municipalities",
  "contact_types",
];

describe("authenticated permissions migration", () => {
  it("grants schema usage only to authenticated application users", () => {
    expect(sql).toContain("grant usage on schema public to authenticated");
    expect(sql).toContain("revoke usage on schema public from public, anon");
  });

  it("uses an explicit deny baseline for every LAB table", () => {
    for (const table of [...referenceTables, ...operationalTables]) {
      expect(sql).toContain(`public.${table}`);
    }
    expect(sql).toContain("from public, anon, authenticated");
  });

  it("grants CRUD only to operational Censimento tables", () => {
    expect(sql).toContain("grant select, insert, update, delete on table");
    for (const table of operationalTables) expect(sql).toContain(`public.${table}`);
    expect(sql).not.toMatch(/grant select, insert, update, delete on table public\.operators/);
  });

  it("keeps operator identity linkage unavailable to browser queries", () => {
    expect(sql).toContain("grant select (id, display_name) on table public.operators to authenticated");
    expect(sql).not.toContain("grant select on table public.operators");
  });

  it("retains RLS policies with explicit authenticated identity checks", () => {
    expect(sql).toContain("to authenticated using ((select auth.uid()) is not null)");
    expect(sql).toContain("to authenticated with check ((select auth.uid()) is not null)");
    expect(sql).not.toContain("disable row level security");
    expect(sql).not.toMatch(/grant .*service_role/);
  });
});
