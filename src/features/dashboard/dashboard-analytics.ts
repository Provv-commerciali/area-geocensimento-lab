import type { CensusRecord, CensusZone, EngagementType, Operator, Qualification } from "@/domain/census";
import { isAgencyEngagement } from "@/domain/census";
import { deriveNewsManagementStatus, type NewsManagementStatus } from "@/domain/census-operational-status";

export interface DashboardFilters { zoneId?: string; operatorId?: string; months: 3 | 6 | 12 }
export interface DashboardCount { value: number; percentage: number }
export interface MonthlyPerformance { key: string; label: string; contacts: number; news: number; appraisals: number; assignments: number }
export interface OperatorPerformance {
  operator: Operator; contacts: number; news: number; appraisals: number; assignments: number;
  newsRate: number; appraisalRate: number; assignmentRate: number;
  overdue: number; expiring: number; withoutRecall: number;
}
export interface ZonePerformance { zone: CensusZone; contacts: number; news: number; vacant: number; inherited: number; owners: number; tenants: number; assignments: number }

const percentage=(part:number,total:number)=>total?Math.round(part/total*100):0;
const monthKey=(value:string)=>value.slice(0,7);
const DAY_MS=86_400_000;
const civilDay=(value:string)=>{const[year,month,day]=value.slice(0,10).split("-").map(Number);return Date.UTC(year,month-1,day)/DAY_MS};

function monthKeys(today:string,months:number):string[]{
  const [year,month]=today.split("-").map(Number);
  return Array.from({length:months},(_,index)=>{
    const date=new Date(Date.UTC(year,month-1-(months-1-index),1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}`;
  });
}

function inMonths(value:string|undefined,keys:Set<string>):boolean{return Boolean(value&&keys.has(monthKey(value)))}
function operatorMatches(actual:string|undefined,selected:string|undefined):boolean{return !selected||actual===selected}
function zoneMatches(record:CensusRecord,zoneId:string|undefined):boolean{return !zoneId||record.zoneId===zoneId}
function hasRole(record:CensusRecord,role:Qualification):boolean{return record.subjectLinks.some(link=>link.role===role)}

export function buildDashboardSnapshot(records:CensusRecord[],zones:CensusZone[],operators:Operator[],today:string,filters:DashboardFilters){
  const keys=monthKeys(today,filters.months);const keySet=new Set(keys);
  const zoneRecords=records.filter(record=>zoneMatches(record,filters.zoneId));
  const currentRecords=zoneRecords.filter(record=>operatorMatches(record.responsibleOperatorId,filters.operatorId));
  const news=currentRecords.filter(record=>record.contactType==="Notizia");
  const newsByStatus:Record<NewsManagementStatus,CensusRecord[]>={SCADUTA:[],IN_SCADENZA:[],GESTITA_CORRETTAMENTE:[],SENZA_RICONTATTO:[]};
  news.forEach(record=>newsByStatus[deriveNewsManagementStatus(record.interviews,today).status].push(record));

  const monthly:MonthlyPerformance[]=keys.map(key=>({
    key,label:new Intl.DateTimeFormat("it-IT",{month:"short",year:"2-digit",timeZone:"UTC"}).format(new Date(`${key}-01T00:00:00Z`)),
    contacts:zoneRecords.filter(record=>monthKey(record.createdAt)===key&&operatorMatches(record.createdByOperatorId,filters.operatorId)).length,
    news:zoneRecords.filter(record=>record.newsFoundAt&&monthKey(record.newsFoundAt)===key&&operatorMatches(record.newsFoundByOperatorId,filters.operatorId)).length,
    appraisals:zoneRecords.filter(record=>record.appraisedAt&&monthKey(record.appraisedAt)===key&&operatorMatches(record.appraisedByOperatorId,filters.operatorId)).length,
    assignments:zoneRecords.filter(record=>record.engagementAcquiredAt&&monthKey(record.engagementAcquiredAt)===key&&operatorMatches(record.engagementAcquiredByOperatorId,filters.operatorId)).length,
  }));

  const visibleOperators=filters.operatorId?operators.filter(operator=>operator.id===filters.operatorId):operators;
  const operatorPerformance:OperatorPerformance[]=visibleOperators.map(operator=>{
    const current=zoneRecords.filter(record=>record.responsibleOperatorId===operator.id);
    const currentNews=current.filter(record=>record.contactType==="Notizia");
    const statuses=currentNews.map(record=>deriveNewsManagementStatus(record.interviews,today).status);
    const contacts=zoneRecords.filter(record=>record.createdByOperatorId===operator.id&&inMonths(record.createdAt,keySet)).length;
    const found=zoneRecords.filter(record=>record.newsFoundByOperatorId===operator.id&&inMonths(record.newsFoundAt,keySet)).length;
    const appraisals=zoneRecords.filter(record=>record.appraisedByOperatorId===operator.id&&inMonths(record.appraisedAt,keySet)).length;
    const assignments=zoneRecords.filter(record=>record.newsFoundAt&&record.engagementAcquiredByOperatorId===operator.id&&inMonths(record.engagementAcquiredAt,keySet)).length;
    return{operator,contacts,news:found,appraisals,assignments,newsRate:percentage(found,contacts),appraisalRate:percentage(appraisals,found),assignmentRate:percentage(assignments,found),overdue:statuses.filter(status=>status==="SCADUTA").length,expiring:statuses.filter(status=>status==="IN_SCADENZA").length,withoutRecall:statuses.filter(status=>status==="SENZA_RICONTATTO").length};
  });

  const visibleZones=filters.zoneId?zones.filter(zone=>zone.id===filters.zoneId):zones;
  const zonePerformance:ZonePerformance[]=visibleZones.map(zone=>{
    const scoped=records.filter(record=>record.zoneId===zone.id&&operatorMatches(record.responsibleOperatorId,filters.operatorId));
    return{zone,contacts:scoped.length,news:scoped.filter(record=>record.contactType==="Notizia").length,vacant:scoped.filter(record=>record.occupancy==="Libero").length,inherited:scoped.filter(record=>record.inherited).length,owners:scoped.filter(record=>hasRole(record,"Proprietario")||hasRole(record,"Comproprietario")).length,tenants:scoped.filter(record=>hasRole(record,"Inquilino")).length,assignments:scoped.filter(record=>isAgencyEngagement(record.engagementType)).length};
  });

  const engagementTypes:EngagementType[]=["Nessuno","Incarico altre agenzie","In esclusiva","Verbale","Non esclusivo"];
  const engagementBreakdown=engagementTypes.map(type=>({type,value:currentRecords.filter(record=>record.engagementType===type).length}));
  const qualifications=["Proprietario","Comproprietario","Inquilino"] as const;
  const qualificationBreakdown=qualifications.map(type=>({type,value:currentRecords.filter(record=>hasRole(record,type)).length}));
  const occupancyBreakdown=["Libero","Libero al rogito","Occupato dal proprietario","Occupato dall'inquilino","Inagibile"] as const;
  const occupancies=occupancyBreakdown.map(type=>({type,value:currentRecords.filter(record=>record.occupancy===type).length}));
  const actionable=[...news].sort((a,b)=>{
    const order:Record<NewsManagementStatus,number>={SCADUTA:0,IN_SCADENZA:1,SENZA_RICONTATTO:2,GESTITA_CORRETTAMENTE:3};
    const left=deriveNewsManagementStatus(a.interviews,today),right=deriveNewsManagementStatus(b.interviews,today);
    return order[left.status]-order[right.status]||(left.recallDate??"9999").localeCompare(right.recallDate??"9999");
  });
  const engagementExpiries=currentRecords.filter(record=>record.engagementExpiresOn&&(record.engagementType==="Incarico altre agenzie"||record.engagementType==="In esclusiva")).map(record=>({record,daysUntilExpiry:civilDay(record.engagementExpiresOn!)-civilDay(today)})).sort((a,b)=>a.record.engagementExpiresOn!.localeCompare(b.record.engagementExpiresOn!));
  const acquired=currentRecords.filter(record=>isAgencyEngagement(record.engagementType)).length;
  const acquiredNews=news.filter(record=>isAgencyEngagement(record.engagementType)).length;
  return{
    currentRecords,news,newsByStatus,monthly,operatorPerformance,zonePerformance,engagementBreakdown,qualificationBreakdown,occupancies,actionable,engagementExpiries,
    totals:{contacts:currentRecords.length,news:news.length,appraisedNews:news.filter(record=>record.isAppraised).length,acquired,exclusive:currentRecords.filter(record=>record.engagementType==="In esclusiva").length,external:currentRecords.filter(record=>record.engagementType==="Incarico altre agenzie").length,vacant:currentRecords.filter(record=>record.occupancy==="Libero").length,inherited:currentRecords.filter(record=>record.inherited).length},
    rates:{news:percentage(news.length,currentRecords.length),appraisal:percentage(news.filter(record=>record.isAppraised).length,news.length),assignment:percentage(acquiredNews,news.length)},
  };
}
