import type { CensusRecord } from "@/domain/census";
import { deriveCensusOperationalStatus, type CensusOperationalSettings } from "@/domain/census-operational-status";

export interface CensusFilters {
  query?: string; lastName?: string; firstName?: string; phone?: string; contactType?: string;
  zoneId?: string; streetId?: string; civicFrom?: number; civicTo?: number; complexId?: string; floor?: string;
  roomsFrom?: number; roomsTo?: number; surfaceFrom?: number; surfaceTo?: number; elevator?: string;
  sheet?: string; parcel?: string; subaltern?: string; cadastralCategory?: string; operatorId?: string;
  qualification?: string; occupancy?: string; inherited?: string; appraised?: string; engagementType?: string; response?: string;
  contactStatus?: "contacted" | "never";
  operationalStatus?: "never" | "recallOverdue" | "staleNews" | "actionRequired";
}

const has = (value: string | undefined, needle: string | undefined) => !needle || (value ?? "").toLocaleLowerCase("it").includes(needle.toLocaleLowerCase("it"));
const boolMatch = (value: boolean, filter?: string) => !filter || String(value) === filter;

export function filterCensusRecords(records: CensusRecord[], f: CensusFilters, context: CensusOperationalSettings & { today: string }): CensusRecord[] {
  return records.filter((r) => {
    const civic = Number.parseInt(r.civicNumber, 10);
    const latest = [...r.interviews].sort((a, b) => b.interviewDate.localeCompare(a.interviewDate))[0];
    const haystack = `${r.firstName ?? ""} ${r.lastName} ${r.streetName} ${r.civicNumber} ${r.civicExtension ?? ""}`;
    const operational = deriveCensusOperationalStatus({ contactType: r.contactType, interviews: r.interviews, staleNewsDays: context.staleNewsDays, today: context.today });
    const operationalMatch = !f.operationalStatus
      || (f.operationalStatus === "never" && operational.isNeverContacted)
      || (f.operationalStatus === "recallOverdue" && operational.isRecallOverdue)
      || (f.operationalStatus === "staleNews" && operational.isStaleNews)
      || (f.operationalStatus === "actionRequired" && (operational.isNeverContacted || operational.isRecallOverdue || operational.isStaleNews));
    return has(haystack, f.query) && has(r.lastName, f.lastName) && has(r.firstName, f.firstName) && has(r.phone, f.phone)
      && (!f.contactType || r.contactType === f.contactType) && (!f.zoneId || r.zoneId === f.zoneId)
      && (!f.streetId || r.streetId === f.streetId) && (!f.complexId || r.complexId === f.complexId)
      && has(r.floorLabel, f.floor) && (!f.civicFrom || civic >= f.civicFrom) && (!f.civicTo || civic <= f.civicTo)
      && (!f.roomsFrom || (r.rooms ?? -1) >= f.roomsFrom) && (!f.roomsTo || (r.rooms ?? Infinity) <= f.roomsTo)
      && (!f.surfaceFrom || (r.surface ?? -1) >= f.surfaceFrom) && (!f.surfaceTo || (r.surface ?? Infinity) <= f.surfaceTo)
      && boolMatch(Boolean(r.elevator), f.elevator) && has(r.sheet, f.sheet) && has(r.parcel, f.parcel)
      && has(r.subaltern, f.subaltern) && has(r.cadastralCategory, f.cadastralCategory)
      && (!f.operatorId || r.responsibleOperatorId === f.operatorId)
      && (!f.qualification || r.subjectLinks.some(link => link.role === f.qualification)) && has(r.occupancy, f.occupancy)
      && boolMatch(r.inherited, f.inherited) && boolMatch(r.isAppraised, f.appraised)
      && (!f.engagementType || r.engagementType === f.engagementType) && has(latest?.response, f.response)
      && (!f.contactStatus || (f.contactStatus === "never" ? operational.isNeverContacted : !operational.isNeverContacted))
      && operationalMatch;
  });
}
