import { describe, expect, it } from "vitest";
import { canShowAppraisal, civicLabel, hasBeenContacted, latestInterview, nextRecall, normalizeAppraisal, recordsForSubject, subjectsForRecord } from "@/domain/census";
import { records, subjects } from "@/lib/demo-data";

describe("census domain rules", () => {
  it("keeps civic number and flexible extension separate in storage and joins only for display", () => expect(civicLabel({ number: "5", extension: "bis" })).toBe("5/bis"));
  it("shows appraisal only for Notizia", () => { expect(canShowAppraisal("Notizia")).toBe(true); expect(canShowAppraisal("Informazione")).toBe(false) });
  it("never derives appraisal true merely from Notizia", () => expect(normalizeAppraisal("Notizia", false)).toBe(false));
  it("clears appraisal when the type is not Notizia", () => expect(normalizeAppraisal("Generico", true)).toBe(false));
  it("derives the latest interview without mutating history", () => { const record=records.find(r=>r.interviews.length===2)!; const original=[...record.interviews]; expect(latestInterview(record)?.interviewDate).toBe([...original].sort((a,b)=>b.interviewDate.localeCompare(a.interviewDate))[0].interviewDate); expect(record.interviews).toEqual(original) });
  it("derives a scheduled recall from interview history", () => { const record=records.find(r=>nextRecall(r))!; expect(nextRecall(record)).toMatch(/^2026-/) });
  it("derives contact status exclusively from interview history",()=>{expect(hasBeenContacted({...records[0],interviews:[]})).toBe(false);expect(hasBeenContacted(records.find(record=>record.interviews.length>0)!)).toBe(true)});
  it("links one subject to properties in different zones",()=>{const shared="subject-shared";const sample=[{...records[0],subjectLinks:[{subjectId:shared,role:"Proprietario" as const,isPrimary:true}]},{...records[2],subjectLinks:[{subjectId:shared,role:"Inquilino" as const,isPrimary:true}]}];expect(new Set(recordsForSubject(sample,shared).map(record=>record.zoneId)).size).toBe(2)});
  it("links multiple owners to the same census context",()=>{const record={...records[0],subjectLinks:[{subjectId:subjects[0].id,role:"Proprietario" as const,isPrimary:true},{subjectId:subjects[1].id,role:"Comproprietario" as const,isPrimary:false}]};expect(subjectsForRecord(record,subjects).map(subject=>subject.id)).toEqual([subjects[0].id,subjects[1].id])});
});
