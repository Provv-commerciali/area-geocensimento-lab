import { describe, expect, it } from "vitest";
import { filterCensusRecords } from "@/features/census/filters";
import { records } from "@/lib/demo-data";

describe("census filters", () => {
  it("searches across person and address", () => expect(filterCensusRecords(records,{query:"Via Roma"}).every(r=>r.streetName==="Via Roma")).toBe(true));
  it("combines territory and contact type", () => { const result=filterCensusRecords(records,{zoneId:"zone-1",contactType:"Notizia"}); expect(result.length).toBeGreaterThan(0); expect(result.every(r=>r.zoneId==="zone-1"&&r.contactType==="Notizia")).toBe(true) });
  it("filters numeric ranges", () => expect(filterCensusRecords(records,{surfaceFrom:80,surfaceTo:100}).every(r=>(r.surface??0)>=80&&(r.surface??0)<=100)).toBe(true));
  it("keeps manually appraised and non-appraised Notizia distinct", () => { const news=filterCensusRecords(records,{contactType:"Notizia"}); expect(news.some(r=>r.isAppraised)).toBe(true); expect(news.some(r=>!r.isAppraised)).toBe(true) });
});
