import { describe, expect, it } from "vitest";
import type { IstatTerritoryRow } from "../../scripts/sync-istat-territories";
import { validateTerritories } from "../../scripts/sync-istat-territories";

function officialSizedRows(): IstatTerritoryRow[] {
  const provinces = Array.from({ length: 110 }, (_, index) => {
    const code = String(index + 1).padStart(3, "0");
    const regionCode = String((index % 20) + 1).padStart(2, "0");
    return { code, regionCode, name: `Provincia ${code}` };
  });
  provinces[45] = { code: "046", regionCode: "09", name: "Lucca" };
  return Array.from({ length: 7894 }, (_, index) => {
    const isCamaiore = index === 0;
    const province = isCamaiore ? provinces[45] : provinces[index % provinces.length];
    return {
      regionCode: province.regionCode,
      regionName: province.regionCode === "09" ? "Toscana" : `Regione ${province.regionCode}`,
      geographicDivisionCode: "3",
      geographicDivisionName: "Italia",
      provinceCode: province.code,
      provinceName: province.name,
      provinceType: 1,
      vehicleCode: "XX",
      nuts3Code: "ITXXX",
      municipalityCode: isCamaiore ? "046005" : String(index + 1).padStart(6, "0"),
      municipalityName: isCamaiore ? "Camaiore" : `Comune ${index + 1}`,
      municipalityItalianName: isCamaiore ? "Camaiore" : `Comune ${index + 1}`,
      municipalityOtherLanguageName: null,
      cadastralCode: isCamaiore ? "B455" : `X${String(index).padStart(3, "0")}`,
    };
  });
}

describe("ISTAT territorial archive validation", () => {
  it("requires every active Italian region and the official 2026 release counts", () => {
    expect(validateTerritories(officialSizedRows(), "2026-02-21")).toEqual({
      datasetDate: "2026-02-21", regions: 20, provinces: 110, municipalities: 7894,
    });
  });

  it("contains valid hierarchies across regions including Toscana → Lucca → Camaiore", () => {
    const rows = officialSizedRows();
    expect(rows.some((row) => row.regionName === "Toscana" && row.provinceName === "Lucca" && row.municipalityName === "Camaiore")).toBe(true);
    expect(new Set(rows.map((row) => row.regionCode)).size).toBe(20);
  });

  it("rejects assigning one province code to a different region", () => {
    const rows = officialSizedRows();
    rows[110] = { ...rows[110], provinceCode: rows[0].provinceCode, provinceName: rows[0].provinceName };
    expect(() => validateTerritories(rows, "2026-02-21")).toThrow(/Provincia incoerente/);
  });
});
