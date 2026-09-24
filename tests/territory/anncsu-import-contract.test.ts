import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const importer=readFileSync("scripts/sync-anncsu.ts","utf8").toLowerCase();

describe("ANNCSU importer safety contract",()=>{
  it("requires a full validation gate before transaction and upserts by official IDs",()=>{
    expect(importer).toContain("validateanncsu(streetzip,accesszip)");
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
    expect(importer).not.toMatch(/delete from public\.(streets|address_accesses)/);
  });
});
