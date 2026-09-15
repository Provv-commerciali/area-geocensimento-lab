import { z } from "zod";
import { contactTypes, engagementTypes, occupancies, qualifications } from "@/domain/census";

const optionalText = z.string().trim().optional().or(z.literal(""));
export const censusRecordSchema = z.object({
  zoneId: z.string().min(1, "Seleziona una zona"),
  streetId: z.string().min(1, "Seleziona una via"),
  civicId: z.string().min(1, "Seleziona un civico"),
  complexId: optionalText,
  buildingScope: z.enum(["Intero edificio", "Parte di edificio"]),
  levels: z.coerce.number().int().positive().optional().or(z.literal("")),
  staircase: optionalText,
  unitIdentifier: optionalText,
  floorCode: optionalText,
  totalFloors: z.coerce.number().int().positive().optional().or(z.literal("")),
  isTopFloor: z.boolean().default(false),
  subjectMode: z.enum(["new", "existing"]),
  existingSubjectId: optionalText,
  subjectType: z.enum(["PRIVATO", "AZIENDA"]),
  firstName: optionalText,
  lastName: optionalText,
  companyName: optionalText,
  vatNumber: optionalText,
  phone: optionalText,
  email: z.string().email("E-mail non valida").optional().or(z.literal("")),
  taxCode: optionalText,
  contactType: z.enum(contactTypes),
  engagementType: z.enum(engagementTypes),
  relationshipRole: z.enum(qualifications),
  inherited: z.boolean().default(false),
  birthDate: optionalText,
  responsibleOperatorId: optionalText,
  notes: optionalText,
  rooms: z.coerce.number().nonnegative().optional().or(z.literal("")),
  surface: z.coerce.number().nonnegative().optional().or(z.literal("")),
  occupancy: z.enum(occupancies).optional().or(z.literal("")),
  elevator: z.boolean().optional(),
  sheet: optionalText,
  parcel: optionalText,
  subaltern: optionalText,
  cadastralCategory: optionalText,
  isAppraised: z.boolean().default(false),
}).superRefine((record, context) => {
  if (record.subjectMode === "existing" && !record.existingSubjectId) context.addIssue({ code: "custom", path: ["existingSubjectId"], message: "Seleziona un soggetto esistente" });
  if (record.subjectMode === "new" && record.subjectType === "PRIVATO" && !record.lastName) context.addIssue({ code: "custom", path: ["lastName"], message: "Il cognome è obbligatorio" });
  if (record.subjectMode === "new" && record.subjectType === "AZIENDA" && !record.companyName) context.addIssue({ code: "custom", path: ["companyName"], message: "La ragione sociale è obbligatoria" });
  if (record.buildingScope === "Parte di edificio" && !record.floorCode) context.addIssue({ code: "custom", path: ["floorCode"], message: "Seleziona il piano dell'unità" });
  if (record.buildingScope === "Intero edificio" && (record.floorCode || record.isTopFloor)) context.addIssue({ code: "custom", path: ["buildingScope"], message: "Il piano dell'unità è disponibile solo per Parte di edificio" });
  const numericFloor = record.floorCode?.match(/^(\d+)°$/)?.[1];
  if (numericFloor && typeof record.totalFloors === "number" && Number(numericFloor) > record.totalFloors) context.addIssue({ code: "custom", path: ["totalFloors"], message: "Il totale piani non può essere inferiore al piano dell'unità" });
});

export const zoneSchema = z.object({
  countryId: z.string().min(1), regionId: z.string().min(1), provinceId: z.string().min(1),
  municipalityId: z.string().min(1), name: z.string().trim().min(1, "Il nome zona è obbligatorio"),
  operatorId: z.string().min(1, "Seleziona un assegnatario"), streetIds: z.array(z.string()).default([]),
});

export const complexSchema = z.object({
  name: z.string().trim().min(1), zoneId: z.string().min(1), civicIds: z.array(z.string()).min(1),
  sheet: optionalText, parcel: optionalText, units: z.coerce.number().int().positive().optional().or(z.literal("")), description: optionalText,
});

export const interviewSchema = z.object({
  operatorId: z.string().min(1), interviewDate: z.string().date(), recallDate: z.string().date().optional().or(z.literal("")),
  response: optionalText, reason: optionalText, outcome: optionalText,
});

export const operationalSettingsSchema = z.object({
  staleNewsDays: z.coerce.number().int("Inserisci un numero intero").min(1, "Il valore minimo è 1 giorno").max(3650, "Il valore massimo è 3650 giorni"),
});

export const civicLocationSchema = z.object({
  civicId: z.string().min(1), longitude: z.number().min(-180).max(180), latitude: z.number().min(-90).max(90),
  status: z.enum(["AUTO_GEOLOCATED", "VERIFIED"]), method: z.enum(["GEOCODER", "MANUAL_MAP", "CADASTRAL"]),
  source: z.string().trim().min(1), quality: z.number().min(0).max(1).optional(),
}).superRefine((value, context) => {
  if (value.status === "VERIFIED" && value.method === "GEOCODER") context.addIssue({ code: "custom", path: ["method"], message: "Il geocoder non può verificare una posizione" });
  if (value.status === "AUTO_GEOLOCATED" && value.method !== "GEOCODER") context.addIssue({ code: "custom", path: ["method"], message: "Una posizione automatica deve provenire dal geocoder" });
});

export const cadastralAssociationSchema = z.object({
  recordId: z.string().min(1), municipalityCode: z.string().trim().min(1), municipalityName: optionalText,
  section: optionalText, sheet: z.string().trim().min(1), parcel: z.string().trim().min(1), featureType: optionalText,
  sourceReference: z.object({ longitude: z.number().min(-180).max(180), latitude: z.number().min(-90).max(90) }).optional(),
});

export const contactUpdateSchema=z.object({
  recordId:z.string().min(1),subjectId:z.string().min(1),subjectType:z.enum(["PRIVATO","AZIENDA"]),
  firstName:optionalText,lastName:optionalText,companyName:optionalText,taxCode:optionalText,vatNumber:optionalText,
  phone:optionalText,email:z.string().email("E-mail non valida").optional().or(z.literal("")),birthDate:optionalText,notes:optionalText,
  zoneId:z.string().min(1,"Seleziona una zona"),streetId:z.string().min(1,"Seleziona una via"),civicId:z.string().min(1,"Seleziona un civico"),complexId:optionalText,
  buildingScope:z.enum(["Intero edificio","Parte di edificio"]),levels:z.coerce.number().int().positive().optional().or(z.literal("")),staircase:optionalText,unitIdentifier:optionalText,floorCode:optionalText,totalFloors:z.coerce.number().int().positive().optional().or(z.literal("")),isTopFloor:z.boolean(),
  rooms:z.coerce.number().nonnegative().optional().or(z.literal("")),surface:z.coerce.number().nonnegative().optional().or(z.literal("")),occupancy:z.enum(occupancies).optional().or(z.literal("")),elevator:z.boolean(),
  contactType:z.enum(contactTypes),engagementType:z.enum(engagementTypes),relationshipRole:z.enum(qualifications),responsibleOperatorId:optionalText,inherited:z.boolean(),isAppraised:z.boolean(),
  sheet:optionalText,parcel:optionalText,subaltern:optionalText,cadastralCategory:optionalText,
}).superRefine((value,context)=>{
  if(value.subjectType==="PRIVATO"&&!value.lastName)context.addIssue({code:"custom",path:["lastName"],message:"Il cognome è obbligatorio"});
  if(value.subjectType==="AZIENDA"&&!value.companyName)context.addIssue({code:"custom",path:["companyName"],message:"La ragione sociale è obbligatoria"});
  if(value.buildingScope==="Parte di edificio"&&!value.floorCode)context.addIssue({code:"custom",path:["floorCode"],message:"Seleziona il piano"});
});
