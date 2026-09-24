import { describe, expect, it } from "vitest";
import { filterCensusRecords } from "@/features/census/filters";
import { records } from "@/lib/demo-data";

describe("census filters", () => {
  const context={staleNewsDays:30,today:"2026-09-11"};
  it("searches across person and address", () => expect(filterCensusRecords(records,{query:"Via Roma"},context).every(r=>r.streetName==="Via Roma")).toBe(true));
  it("searches a displayed surname-name in either order",()=>{const record=records[0]!;expect(filterCensusRecords(records,{query:`${record.lastName} ${record.firstName}`},context)).toContain(record);expect(filterCensusRecords(records,{query:`${record.firstName} ${record.lastName}`},context)).toContain(record)});
  it("finds a property through a non-primary linked subject",()=>{const record={...records[0]!,subjectLinks:[...records[0]!.subjectLinks,{subjectId:"secondary",role:"Comproprietario" as const,isPrimary:false,subjectName:"Matteucci Gianluca"}]};expect(filterCensusRecords([record],{query:"Matteucci Gianluca"},context)).toEqual([record])});
  it("combines territory and contact type", () => { const result=filterCensusRecords(records,{zoneId:"zone-1",contactType:"Notizia"},context); expect(result.length).toBeGreaterThan(0); expect(result.every(r=>r.zoneId==="zone-1"&&r.contactType==="Notizia")).toBe(true) });
  it("filters numeric ranges", () => expect(filterCensusRecords(records,{surfaceFrom:80,surfaceTo:100},context).every(r=>(r.surface??0)>=80&&(r.surface??0)<=100)).toBe(true));
  it("keeps manually appraised and non-appraised Notizia distinct", () => { const news=filterCensusRecords(records,{contactType:"Notizia"},context); expect(news.some(r=>r.isAppraised)).toBe(true); expect(news.some(r=>!r.isAppraised)).toBe(true) });
  it("filters controlled engagement type, qualification, occupancy and inherited property",()=>{const result=filterCensusRecords(records,{engagementType:"In esclusiva",qualification:"Inquilino",occupancy:"Libero",inherited:"false"},context);expect(result.length).toBeGreaterThan(0);expect(result.every(record=>record.engagementType==="In esclusiva"&&record.subjectLinks.some(link=>link.role==="Inquilino")&&record.occupancy==="Libero"&&!record.inherited)).toBe(true)});
  it("I: derives never contacted only from the absence of real interviews", () => { const result=filterCensusRecords(records,{operationalStatus:"never"},context); expect(result.length).toBeGreaterThan(0); expect(result.every(r=>r.interviews.length===0)).toBe(true) });
  it("derives contacted only from actual interview rows", () => expect(filterCensusRecords(records,{contactStatus:"contacted"},context).every(r=>r.interviews.length>0)).toBe(true));
  it("filters overdue recalls, stale news and the combined work queue via the shared derivation",()=>{const overdue=filterCensusRecords(records,{operationalStatus:"recallOverdue"},context);const stale=filterCensusRecords(records,{operationalStatus:"staleNews"},context);const work=filterCensusRecords(records,{operationalStatus:"actionRequired"},context);expect(work.length).toBeGreaterThanOrEqual(overdue.length);expect(work.length).toBeGreaterThanOrEqual(stale.length);expect(work.length).toBeGreaterThan(0)});
});
