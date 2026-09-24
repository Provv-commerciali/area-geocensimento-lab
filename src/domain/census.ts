export const contactTypes = ["Generico", "Informatore", "Informazione", "Notizia"] as const;
export type ContactType = (typeof contactTypes)[number];
export const engagementTypes = ["Nessuno", "Incarico altre agenzie", "In esclusiva", "Verbale", "Non esclusivo"] as const;
export type EngagementType = (typeof engagementTypes)[number];
export type BuildingScope = "Intero edificio" | "Parte di edificio";
export const occupancies = ["Libero", "Libero al rogito", "Occupato dal proprietario", "Occupato dall'inquilino", "Inagibile"] as const;
export type Occupancy = (typeof occupancies)[number];
export const qualifications = ["Proprietario", "Comproprietario", "Inquilino"] as const;
export type Qualification = (typeof qualifications)[number];
/** Quadro generale delle categorie del Catasto Fabbricati (Agenzia delle Entrate). */
export const cadastralCategories = [
  ["A/1","Abitazioni di tipo signorile"],["A/2","Abitazioni di tipo civile"],["A/3","Abitazioni di tipo economico"],["A/4","Abitazioni di tipo popolare"],["A/5","Abitazioni di tipo ultrapopolare"],["A/6","Abitazioni di tipo rurale"],["A/7","Abitazioni in villini"],["A/8","Abitazioni in ville"],["A/9","Castelli e palazzi di pregio"],["A/10","Uffici e studi privati"],["A/11","Abitazioni e alloggi tipici"],
  ["B/1","Collegi, convitti e caserme"],["B/2","Case di cura e ospedali"],["B/3","Prigioni e riformatori"],["B/4","Uffici pubblici"],["B/5","Scuole e laboratori scientifici"],["B/6","Biblioteche, musei e gallerie"],["B/7","Cappelle e oratori"],["B/8","Magazzini sotterranei"],
  ["C/1","Negozi e botteghe"],["C/2","Magazzini e locali di deposito"],["C/3","Laboratori per arti e mestieri"],["C/4","Fabbricati per esercizi sportivi"],["C/5","Stabilimenti balneari e termali"],["C/6","Stalle, scuderie e autorimesse"],["C/7","Tettoie chiuse o aperte"],
  ["D/1","Opifici"],["D/2","Alberghi e pensioni"],["D/3","Teatri e cinematografi"],["D/4","Case di cura e ospedali"],["D/5","Istituti di credito"],["D/6","Impianti sportivi"],["D/7","Fabbricati industriali speciali"],["D/8","Fabbricati commerciali speciali"],["D/9","Edifici galleggianti e ponti"],["D/10","Fabbricati produttivi agricoli"],
  ["E/1","Stazioni per servizi di trasporto"],["E/2","Ponti a pedaggio"],["E/3","Costruzioni per esigenze pubbliche"],["E/4","Recinti per esigenze pubbliche"],["E/5","Fortificazioni"],["E/6","Fari, semafori e torri"],["E/7","Fabbricati per culto"],["E/8","Cimiteri"],["E/9","Altre costruzioni particolari"],
  ["F/1","Area urbana"],["F/2","Unità collabente"],["F/3","Unità in corso di costruzione"],["F/4","Unità in corso di definizione"],["F/5","Lastrico solare"],["F/6","Fabbricato in attesa di dichiarazione"],["F/7","Portici, porzioni e beni comuni non censibili"],["F/9","Unità provenienti dal catasto fondiario"],["F/10","Unità dichiarate o ritenute rurali"],["F/11","Unità in attesa di accatastamento"],
] as const;
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
export interface SubjectSearchContext { recordId: string; role: Qualification | "Non specificato"; address: string }
export interface SubjectSearchResult extends Subject { contextCount: number; contexts: SubjectSearchContext[] }
export interface CensusRecordSubject { subjectId: string; role: Qualification | "Non specificato"; isPrimary: boolean; ownershipShare?: number; subjectName?: string; subjectTaxCode?: string }
export interface CensusZone { id: string; name: string; municipalityId: string; municipality: string; municipalityCadastralCode?: string; province?: string; provinceCode?: string; operator: Operator; streetIds: string[] }
export interface Street { id: string; municipalityId: string; name: string; municipality: string }
export type GeocodingStatus = "NOT_GEOLOCATED" | "AUTO_GEOLOCATED" | "VERIFIED";
export type GeocodingMethod = "GEOCODER" | "MANUAL_MAP" | "CADASTRAL";
export interface CivicLocation {
  longitude: number; latitude: number; source?: string; method?: GeocodingMethod; geocodedAt?: string; verifiedAt?: string; quality?: number;
}
export interface Civic { id: string; streetId: string; number: string; extension?: string; geocodingStatus?: GeocodingStatus; location?: CivicLocation }
export interface CadastralAssociation {
  recordId: string; municipalityCode: string; municipalityName?: string; section?: string; sheet: string; parcel: string;
  featureType?: string; source: string; sourceLayer: string; verifiedAt: string;
}
export interface Complex { id: string; name: string; zoneId: string; civicIds: string[]; sheet?: string; parcel?: string; units?: number; description?: string }
export interface CensusInterview {
  id: string; recordId: string; operatorId: string; operatorName: string;
  interviewDate: string; recallDate?: string; response?: string; reason?: string; outcome?: string;
}
export interface CensusRecord {
  id: string; subjectType?: SubjectType; firstName?: string; lastName: string; phone?: string; email?: string;
  taxCode?: string; contactType: ContactType; qualification?: string; inherited: boolean;
  birthDate?: string; responsibleOperatorId?: string; responsibleOperatorName?: string; notes?: string;
  zoneId: string; zoneName: string; streetId: string; streetName: string; civicId: string;
  civicNumber: string; civicExtension?: string; complexId?: string; complexName?: string;
  buildingScope: BuildingScope; levels?: number; staircase?: string; unitIdentifier?: string; floorCode?: string; totalFloors?: number; isTopFloor: boolean; floorLabel?: string; rooms?: number; surface?: number;
  occupancy?: Occupancy; elevator?: boolean; sheet?: string; parcel?: string; subaltern?: string;
  cadastralCategory?: string; cadastralClass?:string; cadastralConsistency?:string; cadastralIncome?:string; cadastralCensusZone?:string; cadastralRegistryLot?:string; cadastralAddress?:string; cadastralAcquiredAt?:string; cadastralSourceRequestId?:string; photoUrl?:string; isAppraised: boolean; probableAssignment?: boolean;
  engagementType: EngagementType; engagementExpiresOn?: string; createdAt: string; createdByOperatorId?: string; createdByOperatorName?: string;
  newsFoundAt?: string; newsFoundByOperatorId?: string; newsFoundByOperatorName?: string;
  appraisedAt?: string; appraisedByOperatorId?: string; appraisedByOperatorName?: string;
  engagementAcquiredAt?: string; engagementAcquiredByOperatorId?: string; engagementAcquiredByOperatorName?: string;
  interviews: CensusInterview[];
  subjectLinks: CensusRecordSubject[]; cadastralAssociation?: CadastralAssociation;
}

export function subjectDisplayName(subject: Subject): string {
  return subject.subjectType === "AZIENDA" ? subject.companyName ?? "Azienda" : [subject.lastName, subject.firstName].filter(Boolean).join(" ");
}
export function searchTokens(query:string):string[]{return query.trim().toLocaleLowerCase("it").split(/\s+/).map(token=>token.replace(/[%_]/g,"")).filter(Boolean).slice(0,8)}
export function matchesSearchTokens(query:string,values:Array<string|undefined>):boolean{const haystack=values.filter(Boolean).join(" ").toLocaleLowerCase("it");return searchTokens(query).every(token=>haystack.includes(token))}
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

export function canShowAppraisal(type: ContactType): boolean { return type === "Notizia"; }
export function isAgencyEngagement(type: EngagementType): boolean { return type === "In esclusiva" || type === "Verbale" || type === "Non esclusivo"; }
export function normalizeAppraisal(type: ContactType, manuallyChecked: boolean): boolean {
  return type === "Notizia" ? manuallyChecked : false;
}

export function formatFloor(floorCode?: string, totalFloors?: number, isTopFloor = false): string | undefined {
  if (!floorCode) return undefined;
  return `${floorCode}${totalFloors ? ` di ${totalFloors}` : ""}${isTopFloor ? " · ultimo piano" : ""}`;
}
