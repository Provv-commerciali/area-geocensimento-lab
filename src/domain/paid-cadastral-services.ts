import type { CadastralOperationType } from "./cadastral-data";

export const PAID_CADASTRAL_SERVICE_PRICES:Record<CadastralOperationType,{label:string;amount:number}>={
  ELENCO_IMMOBILI:{label:"Trova unità immobiliari",amount:.30},
  PROSPETTO_CATASTALE:{label:"Ottieni intestatari",amount:.30},
  VISURA_ORDINARIA:{label:"Ottieni visura catastale",amount:1.90},
  ELABORATO_PLANIMETRICO:{label:"Ottieni elaborato planimetrico",amount:6.90},
};

export function paidCadastralServicePrice(operation:CadastralOperationType){return PAID_CADASTRAL_SERVICE_PRICES[operation]}
export function euro(amount:number){return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(amount)}

export type PaidServiceOperatorSummary={operatorId:string;name:string;monthlyBudget:number;perRequestLimit:number;monthSpend:number;monthRemaining:number;canManage:boolean};
export type PaidServiceHistoryItem={id:string;operatorName:string;operationType:CadastralOperationType;status:string;requestedAt:string;estimatedCost:number;knownCost?:number;documentId?:string;recordId?:string};
export type PaidServiceGovernance={authorized:boolean;canManage:boolean;current?:PaidServiceOperatorSummary;operators:PaidServiceOperatorSummary[];history:PaidServiceHistoryItem[]};
