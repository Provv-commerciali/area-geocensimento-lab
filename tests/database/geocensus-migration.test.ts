import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/202609110009_geocensus_civic_locations.sql", "utf8");
describe("GeoCensimento migration", () => {
  it("stores one cached WGS84 point on the civic", () => { expect(sql).toContain("geography(Point, 4326)"); expect(sql).toContain("civics_location_gix"); expect(sql).not.toMatch(/alter table public\.census_records[\s\S]*add column location/i); });
  it("requires explicit geocoding state and metadata", () => { expect(sql).toContain("GEOLOCATED"); expect(sql).toContain("NOT_GEOLOCATED"); expect(sql).toContain("NEEDS_REVIEW"); expect(sql).toContain("geocoding_source is not null"); expect(sql).toContain("geocoded_at is not null"); });
  it("does not weaken existing RLS or anonymous grants", () => { expect(sql).not.toMatch(/disable row level security/i); expect(sql).not.toMatch(/grant .* to anon/i); });
});
