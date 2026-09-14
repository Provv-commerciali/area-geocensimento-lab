import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration=readFileSync(path.join(process.cwd(),"supabase/migrations/202609140002_openapi_cadastral_enrichment.sql"),"utf8");
describe("OpenAPI cadastral enrichment migration",()=>{
  it("persists requests, cache keys, costs, units, rights and protected documents",()=>{expect(migration).toContain("create table public.cadastral_requests");expect(migration).toContain("parameters_hash text not null");expect(migration).toContain("estimated_cost");expect(migration).toContain("known_cost");expect(migration).toContain("cadastral_requests_one_active_idx");expect(migration).toContain("create table public.cadastral_property_units");expect(migration).toContain("create table public.cadastral_ownership_rights");expect(migration).toContain("right_type_original");expect(migration).toContain("share_original");expect(migration).toContain("'cadastral-documents','cadastral-documents',false")});
  it("enables RLS and defaults paid access to denied",()=>{expect(migration).toContain("can_use_paid_cadastral_services boolean not null default false");expect(migration).toContain("can_use_paid_cadastral_services_lab");for(const table of ["cadastral_requests","cadastral_property_units","cadastral_ownership_rights","cadastral_documents"])expect(migration).toContain(`alter table public.${table} enable row level security`)})
  it("contains no OpenAPI token or production call",()=>{expect(migration).not.toContain("OPENAPI_CATASTO_TOKEN");expect(migration).not.toContain("catasto.openapi.it/richiesta")});
});
