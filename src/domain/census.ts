export const contactTypes = ["Generico", "Informatore", "Informazione", "Notizia"] as const;
export type ContactType = (typeof contactTypes)[number];
export type BuildingScope = "Intero edificio" | "Parte di edificio";

export interface Operator { id: string; name: string }
export interface CensusZone { id: string; name: string; municipality: string; operator: Operator; streetIds: string[] }
export interface Street { id: string; name: string; municipality: string }
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
  buildingScope: BuildingScope; levels?: number; floorLabel?: string; rooms?: number; surface?: number;
  occupancy?: string; elevator?: boolean; sheet?: string; parcel?: string; subaltern?: string;
  cadastralCategory?: string; isAppraised: boolean; probableAssignment?: boolean;
  engagementType?: string; createdAt: string; interviews: CensusInterview[];
}

export function civicLabel(civic: Pick<Civic, "number" | "extension">): string {
  return [civic.number, civic.extension].filter(Boolean).join("/");
}

export function latestInterview(record: CensusRecord): CensusInterview | undefined {
  return [...record.interviews].sort((a, b) => b.interviewDate.localeCompare(a.interviewDate))[0];
}

export function nextRecall(record: CensusRecord): string | undefined {
  return record.interviews.filter((i) => i.recallDate).sort((a, b) => a.recallDate!.localeCompare(b.recallDate!))[0]?.recallDate;
}

export function canShowAppraisal(type: ContactType): boolean { return type === "Notizia"; }
export function normalizeAppraisal(type: ContactType, manuallyChecked: boolean): boolean {
  return type === "Notizia" ? manuallyChecked : false;
}
