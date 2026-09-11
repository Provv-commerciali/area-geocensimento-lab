import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve("supabase/migrations/202609110007_official_istat_territories.sql"), "utf8").replace(/--.*$/gm, "").toLowerCase();
const initial = readFileSync(resolve("supabase/migrations/202609110001_initial_census_lab.sql"), "utf8").replace(/--.*$/gm, "").toLowerCase();
const workflow = readFileSync(resolve("supabase/migrations/202609110003_complete_milestone_one_workflows.sql"), "utf8").replace(/--.*$/gm, "").toLowerCase();
const repository = readFileSync(resolve("src/repositories/supabase-census-repository.ts"), "utf8");
const page = readFileSync(resolve("src/app/(lab)/censimento/zone/nuova/page.tsx"), "utf8");
const importer = readFileSync(resolve("scripts/sync-istat-territories.ts"), "utf8");

describe("official territory database contract", () => {
  it("adds official codes and active-state metadata incrementally", () => {
    expect(migration).toContain("add column istat_code");
    expect(migration).toContain("source_updated_on date");
    expect(migration).toContain("is_active boolean not null default true");
    expect(migration).toContain("create table public.province_nuts3_codes");
    expect(migration).not.toMatch(/delete\s+from/);
    expect(migration).not.toMatch(/drop\s+table/);
  });

  it("keeps real foreign keys and validates the complete hierarchy on zone creation", () => {
    expect(initial).toContain("province_id uuid not null references public.provinces(id)");
    expect(initial).toContain("municipality_id uuid not null references public.municipalities(id)");
    expect(workflow).toContain("raise exception 'invalid territorial hierarchy'");
    expect(migration).toContain("create trigger census_zones_active_municipality");
  });

  it("keeps importer metadata private and reference writes outside the browser", () => {
    expect(migration).toContain("alter table public.territorial_dataset_imports enable row level security");
    expect(migration).toContain("revoke all privileges on table public.territorial_dataset_imports from public, anon, authenticated");
    expect(migration).toContain("revoke insert, update, delete on table public.countries, public.regions, public.provinces, public.municipalities from authenticated");
  });

  it("feeds Nuova zona from active Supabase rows rather than the demo dataset", () => {
    expect(page).toContain("loadCensusData");
    expect(page).not.toContain("demo-data");
    expect(repository.match(/\.eq\("is_active",true\)/g)).toHaveLength(3);
    expect(repository).toContain(".range(from,to)");
  });

  it("cannot report an applied import without verifying persisted database counts", () => {
    expect(importer).toContain("Verifica database fallita");
    expect(importer).toContain("territorial_dataset_imports where source");
    expect(importer).toContain("Sincronizzazione Supabase completata e verificata");
  });
});
