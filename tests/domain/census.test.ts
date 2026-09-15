import { describe, expect, it } from "vitest";
import { canShowAppraisal, civicLabel, hasBeenContacted, isAgencyEngagement, latestInterview, normalizeAppraisal, recordsForSubject, subjectsForRecord } from "@/domain/census";
import { deriveCensusOperationalStatus, todayInTimeZone } from "@/domain/census-operational-status";
import { records, subjects } from "@/lib/demo-data";

describe("census domain rules", () => {
  it("keeps civic number and flexible extension separate in storage and joins only for display", () => expect(civicLabel({ number: "5", extension: "bis" })).toBe("5/bis"));
  it("shows appraisal only for Notizia", () => { expect(canShowAppraisal("Notizia")).toBe(true); expect(canShowAppraisal("Informazione")).toBe(false) });
  it("never derives appraisal true merely from Notizia", () => expect(normalizeAppraisal("Notizia", false)).toBe(false));
  it("clears appraisal when the type is not Notizia", () => expect(normalizeAppraisal("Generico", true)).toBe(false));
  it("distinguishes agency-acquired engagements from external and absent assignments",()=>{expect(isAgencyEngagement("In esclusiva")).toBe(true);expect(isAgencyEngagement("Verbale")).toBe(true);expect(isAgencyEngagement("Non esclusivo")).toBe(true);expect(isAgencyEngagement("Incarico altre agenzie")).toBe(false);expect(isAgencyEngagement("Nessuno")).toBe(false)});
  it("derives the latest interview without mutating history", () => { const record=records.find(r=>r.interviews.length===2)!; const original=[...record.interviews]; expect(latestInterview(record)?.interviewDate).toBe([...original].sort((a,b)=>b.interviewDate.localeCompare(a.interviewDate))[0].interviewDate); expect(record.interviews).toEqual(original) });
  it("derives contact status exclusively from interview history",()=>{expect(hasBeenContacted({...records[0],interviews:[]})).toBe(false);expect(hasBeenContacted(records.find(record=>record.interviews.length>0)!)).toBe(true)});
  it("links one subject to properties in different zones",()=>{const shared="subject-shared";const sample=[{...records[0],subjectLinks:[{subjectId:shared,role:"Proprietario" as const,isPrimary:true}]},{...records[2],subjectLinks:[{subjectId:shared,role:"Inquilino" as const,isPrimary:true}]}];expect(new Set(recordsForSubject(sample,shared).map(record=>record.zoneId)).size).toBe(2)});
  it("links multiple owners to the same census context",()=>{const record={...records[0],subjectLinks:[{subjectId:subjects[0].id,role:"Proprietario" as const,isPrimary:true},{subjectId:subjects[1].id,role:"Comproprietario" as const,isPrimary:false}]};expect(subjectsForRecord(record,subjects).map(subject=>subject.id)).toEqual([subjects[0].id,subjects[1].id])});
});

const interview = (id:string, interviewDate:string, recallDate?:string) => ({ id, recordId:"r", operatorId:"o", operatorName:"Operatore", interviewDate, recallDate });
const derive = (contactType:"Notizia"|"Generico", interviews:ReturnType<typeof interview>[], staleNewsDays=30) => deriveCensusOperationalStatus({contactType,interviews,staleNewsDays,today:"2026-09-11"});

describe("census operational status",()=>{
  it("A: marks a contact without real interviews as never contacted",()=>expect(derive("Generico",[])).toMatchObject({status:"MAI_CONTATTATO",daysSinceLastInterview:null,lastInterviewAt:null,isNeverContacted:true}));
  it("B: calculates civil days since the latest interview",()=>expect(derive("Generico",[interview("i1","2026-09-03")]).daysSinceLastInterview).toBe(8));
  it("C: marks a Notizia beyond the configured threshold as stale",()=>expect(derive("Notizia",[interview("i1","2026-08-11")])).toMatchObject({status:"NOTIZIA_NON_AGGIORNATA",isStaleNews:true}));
  it("D: keeps a Notizia exactly at the threshold ordinary",()=>expect(derive("Notizia",[interview("i1","2026-08-12")]).status).toBe("ORDINARIO"));
  it("E: marks an unfulfilled recall due yesterday as overdue",()=>expect(derive("Generico",[interview("i1","2026-09-01","2026-09-10")])).toMatchObject({status:"RICONTATTO_SCADUTO",overdueRecallDays:1,isRecallOverdue:true}));
  it("F: a later real interview fulfils the recall",()=>expect(derive("Generico",[interview("i1","2026-09-01","2026-09-10"),interview("i2","2026-09-11")])).toMatchObject({status:"ORDINARIO",isRecallOverdue:false,overdueRecallDays:null}));
  it("G: overdue recall takes precedence over stale Notizia",()=>expect(derive("Notizia",[interview("i1","2026-08-01","2026-09-10")])).toMatchObject({status:"RICONTATTO_SCADUTO",isRecallOverdue:true,isStaleNews:true}));
  it("uses the Europe/Rome civil date independently of UTC midnight",()=>expect(todayInTimeZone("Europe/Rome",new Date("2026-09-10T22:30:00Z"))).toBe("2026-09-11"));
});
