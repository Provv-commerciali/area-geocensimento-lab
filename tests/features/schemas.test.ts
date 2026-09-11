import { describe, expect, it } from "vitest";
import { censusRecordSchema, complexSchema, interviewSchema, zoneSchema } from "@/features/census/schemas";

describe("runtime validators", () => {
  it("accepts a valid structured partial-building record", () => expect(censusRecordSchema.safeParse({zoneId:"z",streetId:"s",civicId:"c",buildingScope:"Parte di edificio",floorCode:"3°",totalFloors:10,isTopFloor:false,lastName:"Ferri",contactType:"Notizia",qualification:"Proprietario",occupancy:"Libero al rogito",inherited:false,isAppraised:false}).success).toBe(true));
  it("rejects a missing surname", () => expect(censusRecordSchema.safeParse({zoneId:"z",streetId:"s",civicId:"c",buildingScope:"Intero edificio",lastName:"",contactType:"Generico",inherited:false,isAppraised:false}).success).toBe(false));
  it("requires a structured floor for a partial building", () => expect(censusRecordSchema.safeParse({zoneId:"z",streetId:"s",civicId:"c",buildingScope:"Parte di edificio",lastName:"Ferri",contactType:"Generico",inherited:false,isTopFloor:false,isAppraised:false}).success).toBe(false));
  it("rejects uncontrolled qualification and occupancy values", () => expect(censusRecordSchema.safeParse({zoneId:"z",streetId:"s",civicId:"c",buildingScope:"Intero edificio",lastName:"Ferri",contactType:"Generico",qualification:"Altro",occupancy:"Occupato",inherited:false,isTopFloor:false,isAppraised:false}).success).toBe(false));
  it("validates hierarchical territory and zone street links", () => expect(zoneSchema.safeParse({countryId:"it",regionId:"er",provinceId:"bo",municipalityId:"bologna",name:"Murri",operatorId:"op",streetIds:["s1","s2"]}).success).toBe(true));
  it("requires at least one civic for a complex", () => expect(complexSchema.safeParse({name:"Test",zoneId:"z",civicIds:[]}).success).toBe(false));
  it("validates interview dates", () => expect(interviewSchema.safeParse({operatorId:"op",interviewDate:"2026-09-11",response:"Positiva"}).success).toBe(true));
});
