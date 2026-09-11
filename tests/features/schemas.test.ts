import { describe, expect, it } from "vitest";
import { censusRecordSchema, complexSchema, interviewSchema, zoneSchema } from "@/features/census/schemas";

describe("runtime validators", () => {
  it("accepts a minimal valid census record", () => expect(censusRecordSchema.safeParse({zoneId:"z",streetId:"s",civicId:"c",buildingScope:"Parte di edificio",lastName:"Ferri",contactType:"Notizia",inherited:false,isAppraised:false}).success).toBe(true));
  it("rejects a missing surname", () => expect(censusRecordSchema.safeParse({zoneId:"z",streetId:"s",civicId:"c",buildingScope:"Intero edificio",lastName:"",contactType:"Generico",inherited:false,isAppraised:false}).success).toBe(false));
  it("validates zone street links", () => expect(zoneSchema.safeParse({country:"Italia",region:"Emilia-Romagna",province:"Bologna",municipality:"Bologna",name:"Murri",operatorId:"op",streetIds:["s1","s2"]}).success).toBe(true));
  it("requires at least one civic for a complex", () => expect(complexSchema.safeParse({name:"Test",zoneId:"z",civicIds:[]}).success).toBe(false));
  it("validates interview dates", () => expect(interviewSchema.safeParse({operatorId:"op",interviewDate:"2026-09-11",response:"Positiva"}).success).toBe(true));
});
