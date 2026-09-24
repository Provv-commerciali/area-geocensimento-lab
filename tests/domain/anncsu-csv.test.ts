import { describe, expect, it } from "vitest";
import { ACCESS_HEADER, STREET_HEADER, coordinateWarning, decimalComma, normalizeLocality } from "../../scripts/anncsu-csv";

describe("ANNCSU source contract",()=>{
  it("retains distinct Stradario and Indirizzario layouts",()=>{
    expect(STREET_HEADER).toHaveLength(9);
    expect(ACCESS_HEADER).toHaveLength(19);
    expect(ACCESS_HEADER).toContain("PROGRESSIVO_ACCESSO");
    expect(ACCESS_HEADER).toContain("COORD_X_COMUNE");
  });
  it("parses decimal-comma ordinates without silently changing precision",()=>{
    expect(decimalComma("10,1234567")).toBe("10.1234567");
    expect(decimalComma("42,5000000")).toBe("42.5000000");
    expect(()=>decimalComma("10,12345678")).toThrow();
    expect(normalizeLocality("  San  Marcello  ")).toBe("san marcello");
  });
  it("quarantines territorially anomalous coordinates, preserving normal points",()=>{
    expect(coordinateWarning(10.5000000,43.5000000)).toBeNull();
    expect(coordinateWarning(11.866752,42.035831)).toBe("OUTSIDE_TOSCANA_ENVELOPE");
    expect(coordinateWarning(Number.NaN,43)).toBe("INVALID_COORDINATE");
  });
});
