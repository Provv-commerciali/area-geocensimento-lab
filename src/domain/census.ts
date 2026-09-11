export const contactTypes = ["Generico", "Informatore", "Informazione", "Notizia"] as const;
export type ContactType = (typeof contactTypes)[number];
export type BuildingScope = "Intero edificio" | "Parte di edificio";
export const occupancies = ["Libero", "Libero al rogito", "Occupato dal proprietario", "Occupato dall'inquilino", "Inagibile"] as const;
export type Occupancy = (typeof occupancies)[number];
export const qualifications = ["Proprietario", "Comproprietario", "Inquilino"] as const;
export type Qualification = (typeof qualifications)[number];
export type SubjectType = "PRIVATO" | "AZIENDA";
export const floorCodes = ["Interrato", "Seminterrato", "Terra", "Rialzato", ...Array.from({ length: 60 }, (_, index) => `${index + 1}°`)] as const;
export type CivicParity = "all" | "even" | "odd";

export interface Operator { id: string; name: string }
export interface Country { id: string; code: string; name: string }
export interface Region { id: string; countryId: string; name: string; istatCode?: string }
export interface Province { id: string; regionId: string; code?: string; name: string; istatCode?: string; territorialUnitType?: number }
export interface Municipality { id: string; provinceId: string; name: string; istatCode?: string; cadastralCode?: string }
export interface Subject {
  id: string; subjectType: SubjectType; firstName?: string; lastName?: string; companyName?: string;
  taxCode?: string; vatNumber?: string; phone?: string; email?: string; birthDate?: string; notes?: string;
}
export interface CensusRecordSubject { subjectId: string; role: Qualification | "Non specificato"; isPrimary: boolean; ownershipShare?: number }
export interface CensusZone { id: string; name: string; municipalityId: string; municipality: string; operator: Operator; streetIds: string[] }
export interface Street { id: string; municipalityId: string; name: string; municipality: string }
export interface Civic { id: string; streetId: string; number: string; extension?: string }
export interface Complex { id: string; name: string; zoneId: string; civicIds: string[]; sheet?: string; parcel?: string; units?: number; description?: string }
export interface CensusInterview {
  id: string; recordId: string; operatorId: string; operatorName: string;
  interviewDate: string; recallDate?: string; response?: string; reason?: string; outcome?: string;
}
export interface CensusRecord {
  id: string; firstName?: string; lastName: string; phone?: string; email?: string;
  taxCode?: string; contactType: ContactType; qualification?: string; inherited: boolean;
  birthDate?: string; responsibleOperatorId?: string; responsibleOperatorName?: string; notes?: string;
  zoneId: string; zoneName: string; streetId: string; streetName: string; civicId: string;
  civicNumber: string; civicExtension?: string; complexId?: string; complexName?: string;
  buildingScope: BuildingScope; levels?: number; floorCode?: string; totalFloors?: number; isTopFloor: boolean; floorLabel?: string; rooms?: number; surface?: number;
  occupancy?: Occupancy; elevator?: boolean; sheet?: string; parcel?: string; subaltern?: string;
  cadastralCategory?: string; isAppraised: boolean; probableAssignment?: boolean;
  engagementType?: string; createdAt: string; interviews: CensusInterview[];
  subjectLinks: CensusRecordSubject[];
}

export function subjectDisplayName(subject: Subject): string {
  return subject.subjectType === "AZIENDA" ? subject.companyName ?? "Azienda" : [subject.lastName, subject.firstName].filter(Boolean).join(" ");
}
export function recordsForSubject(records: CensusRecord[], subjectId: string): CensusRecord[] { return records.filter(record=>record.subjectLinks.some(link=>link.subjectId===subjectId)); }
export function subjectsForRecord(record: Pick<CensusRecord,"subjectLinks">, subjects: Subject[]): Subject[] { return record.subjectLinks.map(link=>subjects.find(subject=>subject.id===link.subjectId)).filter((subject):subject is Subject=>Boolean(subject)); }

export function civicLabel(civic: Pick<Civic, "number" | "extension">): string {
  return [civic.number, civic.extension].filter(Boolean).join("/");
}

export function latestInterview(record: CensusRecord): CensusInterview | undefined {
  return [...record.interviews].sort((a, b) => b.interviewDate.localeCompare(a.interviewDate))[0];
}

export function hasBeenContacted(record: Pick<CensusRecord, "interviews">): boolean {
  return record.interviews.length > 0;
}

export function nextRecall(record: CensusRecord): string | undefined {
  return record.interviews.filter((i) => i.recallDate).sort((a, b) => a.recallDate!.localeCompare(b.recallDate!))[0]?.recallDate;
}

export function canShowAppraisal(type: ContactType): boolean { return type === "Notizia"; }
export function normalizeAppraisal(type: ContactType, manuallyChecked: boolean): boolean {
  return type === "Notizia" ? manuallyChecked : false;
}

export function formatFloor(floorCode?: string, totalFloors?: number, isTopFloor = false): string | undefined {
  if (!floorCode) return undefined;
  return `${floorCode}${totalFloors ? ` di ${totalFloors}` : ""}${isTopFloor ? " · ultimo piano" : ""}`;
}
