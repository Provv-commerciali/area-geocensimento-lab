import { describe, expect, it } from "vitest";
import { civics, complexes, operators, records, streets, zones } from "@/lib/demo-data";
import { dominantOperationalStatus, geoCensusHref, parseGeoCensusFilters, projectGeoCensus } from "@/domain/geocensus";

const settings = { staleNewsDays: 30 }; const today = "2026-09-11";

describe("GeoCensimento domain projection", () => {
  it("aggregates all contacts at one civic into one feature", () => {
    const result = projectGeoCensus({ records, civics, streets, complexes, filters: {}, settings, today });
    expect(result.features.length).toBeLessThan(result.visibleRecordCount);
    expect(result.features.find((feature) => feature.civicId === "cv-1")?.records.length).toBeGreaterThan(1);
  });

  it("reuses operational precedence for mixed civic states", () => {
    expect(dominantOperationalStatus([records[0], records[7]], settings, today)).toBe("RICONTATTO_SCADUTO");
  });

  it("filters real records by zone and operational activity", () => {
    const result = projectGeoCensus({ records, civics, streets, complexes, filters: { zoneId: "zone-1", operationalStatus: "never" }, settings, today });
    expect(result.features.every((feature) => feature.zoneId === "zone-1")).toBe(true);
    expect(result.features.flatMap((feature) => feature.records).every((record) => record.interviews.length === 0)).toBe(true);
  });

  it("counts records and civics that cannot be represented", () => {
    const result = projectGeoCensus({ records, civics, streets, complexes, filters: {}, settings, today });
    expect(result.notGeolocatedCivicCount).toBe(1);
    expect(result.notGeolocatedRecordCount).toBeGreaterThan(0);
    expect(result.firstMissingAddress).toMatch(/Via /);
  });

  it("distinguishes verified, automatic and missing civic locations",()=>{
    const result=projectGeoCensus({records,civics,streets,complexes,filters:{},settings,today});
    expect(result.verifiedCivicCount).toBeGreaterThan(0);expect(result.autoGeolocatedCivicCount).toBe(1);expect(result.notGeolocatedCivicCount).toBe(1);
    expect(result.features.find(feature=>feature.locationStatus==="AUTO_GEOLOCATED")).toBeDefined();
  });

  it("round-trips stable URL filters", () => {
    const href = geoCensusHref({ zoneId: zones[0].id, streetId: streets[0].id, operatorId: operators[0].id, operationalStatus: "actionRequired", onlyComplexes: true });
    const query = Object.fromEntries(new URL(`https://lab.test${href}`).searchParams);
    expect(parseGeoCensusFilters(query)).toMatchObject({ zoneId: zones[0].id, streetId: streets[0].id, operatorId: operators[0].id, operationalStatus: "actionRequired", onlyComplexes: true });
  });
});
