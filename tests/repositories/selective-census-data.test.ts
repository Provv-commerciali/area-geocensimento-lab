import { describe, expect, it } from "vitest";
import { loadCensusData } from "@/services/census-data";

describe("selective census data loading", () => {
  it("returns only requested resources plus the operational date", async () => {
    const data = await loadCensusData(["zones", "operators"]);
    expect(data.zones.length).toBeGreaterThan(0);
    expect(data.operators.length).toBeGreaterThan(0);
    expect(data.operationalToday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect("records" in data).toBe(false);
    expect("municipalities" in data).toBe(false);
  });

  it("pushes contextual record constraints through the loader", async () => {
    const data = await loadCensusData(["records"], { records: { streetId: "st-1" } });
    expect(data.records.length).toBeGreaterThan(0);
    expect(data.records.every((record) => record.streetId === "st-1")).toBe(true);
  });

  it("loads only requested civics and linked subjects for contact detail",async()=>{const data=await loadCensusData(["civics","subjects"],{civicId:"cv-1",subjectIds:["subject-1"]});expect(data.civics.map(item=>item.id)).toEqual(["cv-1"]);expect(data.subjects.map(item=>item.id)).toEqual(["subject-1"])});
});
