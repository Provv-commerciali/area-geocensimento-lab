import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const importer=readFileSync("scripts/sync-anncsu.ts","utf8").toLowerCase();

describe("ANNCSU importer safety contract",()=>{
  it("requires a full validation gate before transaction and upserts by official IDs",()=>{
    expect(importer).toContain("validateanncsu(streetzip,accesszip,provincecode)");
    expect(importer).toContain("duplicate street progressive");
    expect(importer).toContain("duplicate access progressive");
    expect(importer).toContain("totale_accessi");
    expect(importer).toContain("missing_municipalities");
    expect(importer).toContain("on conflict (anncsu_progressivo_nazionale)");
    expect(importer).toContain("on conflict (anncsu_progressivo_accesso)");
  });
  it("makes an applied SHA pair a no-op and preserves disappeared rows",()=>{
    expect(importer).toContain("same sha-256 snapshots");
    expect(importer).toContain("is_present_in_latest_snapshot=false");
    expect(importer.match(/r\.istat_code='09'/g)).toHaveLength(2);
    expect(importer).not.toContain("m.istat_code like '09%'");
    expect(importer).not.toMatch(/delete from public\.(streets|address_accesses)/);
  });
  it("keeps province imports separate from Toscana snapshots and bounds deactivation",()=>{
    expect(importer).toContain("province:${provincecode}");
    expect(importer).toContain("territorial_scope=$2");
    expect(importer.match(/p\.istat_code=\$1/g)).toHaveLength(2);
    expect(importer).toContain("!cells[1].startswith(provincecode)");
    expect(importer.match(/finished_at=clock_timestamp\(\)/g)).toHaveLength(2);
    expect(importer).toContain("lab apply requires an explicit --province scope");
  });
});
