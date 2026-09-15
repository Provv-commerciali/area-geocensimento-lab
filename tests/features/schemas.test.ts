import { describe, expect, it } from "vitest";
import { censusRecordSchema, complexSchema, contactUpdateSchema, interviewSchema, operationalSettingsSchema, zoneSchema } from "@/features/census/schemas";

describe("runtime validators", () => {
  const base={zoneId:"z",streetId:"s",civicId:"c",subjectMode:"new",subjectType:"PRIVATO",lastName:"Ferri",relationshipRole:"Proprietario",contactType:"Generico",engagementType:"Nessuno",buildingScope:"Intero edificio",inherited:false,isTopFloor:false,isAppraised:false};
  it("accepts a valid structured partial-building record", () => expect(censusRecordSchema.safeParse({...base,buildingScope:"Parte di edificio",floorCode:"3°",totalFloors:10,contactType:"Notizia",occupancy:"Libero al rogito"}).success).toBe(true));
  it("rejects a missing private surname", () => expect(censusRecordSchema.safeParse({...base,lastName:""}).success).toBe(false));
  it("accepts an existing subject link without repeating its identity",()=>expect(censusRecordSchema.safeParse({...base,subjectMode:"existing",existingSubjectId:"subject-1",lastName:""}).success).toBe(true));
  it("accepts comproprietario as a census relationship",()=>expect(censusRecordSchema.safeParse({...base,relationshipRole:"Comproprietario"}).success).toBe(true));
  it("requires company name for an Azienda",()=>expect(censusRecordSchema.safeParse({...base,subjectType:"AZIENDA",lastName:"",companyName:""}).success).toBe(false));
  it("requires a structured floor for a partial building", () => expect(censusRecordSchema.safeParse({...base,buildingScope:"Parte di edificio"}).success).toBe(false));
  it("rejects uncontrolled role and occupancy values", () => expect(censusRecordSchema.safeParse({...base,relationshipRole:"Altro",occupancy:"Occupato"}).success).toBe(false));
  it("accepts only controlled engagement types",()=>{expect(censusRecordSchema.safeParse({...base,engagementType:"Incarico altre agenzie"}).success).toBe(true);expect(censusRecordSchema.safeParse({...base,engagementType:"Da definire"}).success).toBe(false)});
  it("validates hierarchical territory and zone street links", () => expect(zoneSchema.safeParse({countryId:"it",regionId:"er",provinceId:"bo",municipalityId:"bologna",name:"Murri",operatorId:"op",streetIds:["s1","s2"]}).success).toBe(true));
  it("requires at least one civic for a complex", () => expect(complexSchema.safeParse({name:"Test",zoneId:"z",civicIds:[]}).success).toBe(false));
  it("validates interview dates", () => expect(interviewSchema.safeParse({operatorId:"op",interviewDate:"2026-09-11",response:"Positiva"}).success).toBe(true));
  it("validates the persistent stale-News threshold",()=>{expect(operationalSettingsSchema.safeParse({staleNewsDays:"30"}).success).toBe(true);expect(operationalSettingsSchema.safeParse({staleNewsDays:"0"}).success).toBe(false);expect(operationalSettingsSchema.safeParse({staleNewsDays:"30.5"}).success).toBe(false)});
  it("validates a complete contact update",()=>expect(contactUpdateSchema.safeParse({...base,recordId:"r",subjectId:"p",elevator:false,rooms:"",surface:""}).success).toBe(true));
});
