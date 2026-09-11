import { describe, expect, it } from "vitest";
import { canShowAppraisal, civicLabel, hasBeenContacted, latestInterview, nextRecall, normalizeAppraisal } from "@/domain/census";
import { records } from "@/lib/demo-data";

describe("census domain rules", () => {
  it("keeps civic number and flexible extension separate in storage and joins only for display", () => expect(civicLabel({ number: "5", extension: "bis" })).toBe("5/bis"));
  it("shows appraisal only for Notizia", () => { expect(canShowAppraisal("Notizia")).toBe(true); expect(canShowAppraisal("Informazione")).toBe(false) });
  it("never derives appraisal true merely from Notizia", () => expect(normalizeAppraisal("Notizia", false)).toBe(false));
  it("clears appraisal when the type is not Notizia", () => expect(normalizeAppraisal("Generico", true)).toBe(false));
  it("derives the latest interview without mutating history", () => { const record=records.find(r=>r.interviews.length===2)!; const original=[...record.interviews]; expect(latestInterview(record)?.interviewDate).toBe([...original].sort((a,b)=>b.interviewDate.localeCompare(a.interviewDate))[0].interviewDate); expect(record.interviews).toEqual(original) });
  it("derives a scheduled recall from interview history", () => { const record=records.find(r=>nextRecall(r))!; expect(nextRecall(record)).toMatch(/^2026-/) });
  it("derives contact status exclusively from interview history",()=>{expect(hasBeenContacted({...records[0],interviews:[]})).toBe(false);expect(hasBeenContacted(records.find(record=>record.interviews.length>0)!)).toBe(true)});
});
