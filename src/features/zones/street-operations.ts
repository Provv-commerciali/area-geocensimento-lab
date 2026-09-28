import type { CensusRecord } from "@/domain/census";

export const streetSorts = {
  civic_asc:"Civico crescente", civic_desc:"Civico decrescente",
  name_asc:"Nome A-Z", name_desc:"Nome Z-A",
  created_desc:"Inserimento più recente", created_asc:"Inserimento meno recente",
  updated_desc:"Ultima modifica più recente", updated_asc:"Ultima modifica meno recente",
  activity_desc:"Ultima attività più recente", activity_asc:"Ultima attività meno recente",
  recall_asc:"Ricontatto più vicino",
} as const;
export type StreetSort = keyof typeof streetSorts;

export const streetFilterKeys = ["civicFrom","civicTo","name","phone","contactType","qualification","complex","floor","rooms","surface","occupancy","engagement","category","sheet","parcel","subaltern","createdFrom","interviewFrom","recallFrom","response","elevator","probable","inherited","appraised"] as const;
export type StreetFilterKey = typeof streetFilterKeys[number];
export type StreetFilters = Partial<Record<StreetFilterKey,string>>;
export function parseStreetFilters(params:Record<string,string|string[]|undefined>):StreetFilters {
  return Object.fromEntries(streetFilterKeys.map(key=>[key,typeof params[key]==="string"?String(params[key]).trim().slice(0,100):""]).filter(([,value])=>value)) as StreetFilters;
}
export function hasStreetFilters(filters:StreetFilters):boolean {return Object.values(filters).some(Boolean)}
export function hasRecordFilters(filters:StreetFilters):boolean {return streetFilterKeys.some(key=>key!=="civicFrom"&&key!=="civicTo"&&Boolean(filters[key]))}
const contains=(value:string|undefined,needle:string|undefined)=>!needle||Boolean(value?.toLocaleLowerCase("it").includes(needle.toLocaleLowerCase("it")));
const exact=(value:string|undefined,expected:string|undefined)=>!expected||value===expected;
const boolean=(value:boolean|undefined,expected:string|undefined)=>!expected||String(value)===expected;
const anyInterview=(record:CensusRecord,predicate:(interview:CensusRecord["interviews"][number])=>boolean)=>record.interviews.some(predicate);

export function recordMatchesStreetFilters(record:CensusRecord,filters:StreetFilters):boolean {
  return (!filters.name||[`${record.firstName??""} ${record.lastName}`,`${record.lastName} ${record.firstName??""}`,...record.subjectLinks.map(link=>link.subjectName??"")].some(value=>contains(value,filters.name)))
    && contains(record.phone,filters.phone)
    && exact(record.contactType,filters.contactType)
    && exact(record.qualification,filters.qualification)
    && exact(record.complexId,filters.complex)
    && contains(record.floorLabel??record.floorCode,filters.floor)
    && (!filters.rooms||Number(record.rooms)===Number(filters.rooms))
    && (!filters.surface||Number(record.surface)>=Number(filters.surface))
    && exact(record.occupancy,filters.occupancy)
    && exact(record.engagementType,filters.engagement)
    && exact(record.cadastralCategory,filters.category)
    && contains(record.sheet,filters.sheet)
    && contains(record.parcel,filters.parcel)
    && contains(record.subaltern,filters.subaltern)
    && (!filters.createdFrom||record.createdAt.slice(0,10)>=filters.createdFrom)
    && (!filters.interviewFrom||anyInterview(record,i=>i.interviewDate>=filters.interviewFrom!))
    && (!filters.recallFrom||anyInterview(record,i=>Boolean(i.recallDate&&i.recallDate>=filters.recallFrom!)))
    && (!filters.response||anyInterview(record,i=>i.response===filters.response))
    && boolean(record.elevator,filters.elevator)
    && boolean(record.probableAssignment,filters.probable)
    && boolean(record.inherited,filters.inherited)
    && boolean(record.isAppraised,filters.appraised);
}
export function recordMatchesQuickSearch(record:CensusRecord,query:string):boolean {
  const needle=query.trim().toLocaleLowerCase("it");
  return Boolean(needle&&[`${record.firstName??""} ${record.lastName}`,`${record.lastName} ${record.firstName??""}`,record.phone,...record.subjectLinks.map(link=>link.subjectName)].filter(Boolean).some(value=>value?.toLocaleLowerCase("it").includes(needle)));
}
export function lastActivity(record:CensusRecord):string {
  return [record.createdAt,...record.interviews.map(interview=>interview.interviewDate)].sort().at(-1)??record.createdAt;
}
export function closestRecall(record:CensusRecord):string|undefined {
  const today=new Date().toISOString().slice(0,10);
  return record.interviews.map(i=>i.recallDate).filter((date):date is string=>Boolean(date&&date>=today)).sort()[0];
}
