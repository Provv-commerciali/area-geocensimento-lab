import { describe, expect, it } from "vitest";
import { demoCensusRepository } from "@/repositories/demo-census-repository";

describe("demo repository contract", () => {
  it("provides the controlled target data volume", async () => { expect((await demoCensusRepository.listRecords()).length).toBeGreaterThanOrEqual(30); expect((await demoCensusRepository.listRecords()).length).toBeLessThanOrEqual(50) });
  it("supports explicit zone-to-street relationships", async () => expect((await demoCensusRepository.listZones()).every(z=>z.streetIds.length>0)).toBe(true));
  it("supports multi-civic complexes", async () => expect((await demoCensusRepository.listComplexes()).some(c=>c.civicIds.length>1)).toBe(true));
  it("contains repeated interview history", async () => expect((await demoCensusRepository.listRecords()).some(r=>r.interviews.length>1)).toBe(true));
  it("provides the documented operational default without embedding it in the derivation",async()=>expect(await demoCensusRepository.getOperationalSettings()).toEqual({staleNewsDays:30}));
  it("applies contextual record and territory filters at the repository boundary",async()=>{
    expect((await demoCensusRepository.listRecords({zoneId:"zone-1"})).every(record=>record.zoneId==="zone-1")).toBe(true);
    expect(await demoCensusRepository.listMunicipalities("missing-province")).toEqual([]);
  });
  it("bounds on-demand subject searches",async()=>{
    const first=(await demoCensusRepository.listSubjects())[0];
    expect(first).toBeDefined();
    expect((await demoCensusRepository.searchSubjects(first!.lastName??first!.companyName??"")).find(subject=>subject.id===first!.id)).toMatchObject(first!);
    expect((await demoCensusRepository.searchSubjects(`${first!.lastName} ${first!.firstName}`))[0]?.id).toBe(first!.id);
    expect((await demoCensusRepository.searchSubjects("a")).length).toBeLessThanOrEqual(20);
  });
});
