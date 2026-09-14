export type CadastralOperationType = "ELENCO_IMMOBILI" | "PROSPETTO_CATASTALE" | "VISURA_ORDINARIA";
export type CadastralRequestStatus = "CREATED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

export interface CadastralContext {
  recordId?: string;
  provinceCode: string;
  municipality: string;
  municipalityCode: string;
  section?: string;
  sheet: string;
  parcel: string;
}

export interface CadastralPropertyUnit {
  id?: string;
  providerPropertyId: string;
  section?: string;
  urbanSection?: string;
  sheet: string;
  parcel: string;
  subaltern?: string;
  address?: string;
  censusZone?: string;
  category?: string;
  class?: string;
  consistency?: string;
  cadastralIncome?: string;
  registryLot?: string;
  acquiredAt?: string;
}

export interface CadastralHolder {
  id?: string;
  holderType: "PRIVATO" | "AZIENDA" | "NON_DETERMINATO";
  firstName?: string;
  lastName?: string;
  companyName?: string;
  taxCode?: string;
  rightTypeOriginal?: string;
  shareOriginal?: string;
  linkedSubjectId?: string;
  possibleSubjectId?: string;
}

export interface CadastralOperationResult {
  requestId: string;
  providerRequestId?: string;
  operationType: CadastralOperationType;
  status: CadastralRequestStatus;
  fromCache: boolean;
  requestedAt: string;
  completedAt?: string;
  units: CadastralPropertyUnit[];
  holders: CadastralHolder[];
  documentId?: string;
  error?: string;
}

export type CadastralContactPrefill={zoneId?:string;streetId?:string;civicId?:string;complexId?:string;subjectType:"PRIVATO"|"AZIENDA";firstName?:string;lastName?:string;companyName?:string;taxCode?:string;relationshipRole?:"Proprietario"|"Comproprietario";sheet:string;parcel:string;subaltern?:string;cadastralCategory?:string;cadastralClass?:string;cadastralConsistency?:string;cadastralIncome?:string;cadastralCensusZone?:string;cadastralRegistryLot?:string;cadastralAddress?:string};
