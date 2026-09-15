import { describe, expect, it, vi } from "vitest";
import { saveCensusRecord, type CensusRecordGateway } from "@/features/census/persistence";

const validRecord={zoneId:"z",streetId:"s",civicId:"c",buildingScope:"Parte di edificio",floorCode:"3°",totalFloors:10,isTopFloor:false,subjectMode:"new",subjectType:"PRIVATO",lastName:"Ferri",relationshipRole:"Proprietario",contactType:"Notizia",engagementType:"Nessuno",occupancy:"Libero",inherited:false,isAppraised:false};

describe("record persistence", () => {
  it("reports success only after the gateway insert resolves", async () => { const gateway:CensusRecordGateway={createRecord:vi.fn().mockResolvedValue("record-1")}; await expect(saveCensusRecord(gateway,validRecord)).resolves.toEqual({ok:true,id:"record-1"}); expect(gateway.createRecord).toHaveBeenCalledOnce() });
  it("never passes or creates an interview while creating a record", async () => { const createRecord=vi.fn().mockResolvedValue("record-1"); await saveCensusRecord({createRecord},validRecord); expect(createRecord).toHaveBeenCalledWith(expect.objectContaining({lastName:"Ferri"})); expect(createRecord.mock.calls[0]).toHaveLength(1) });
  it("surfaces gateway errors", async () => await expect(saveCensusRecord({createRecord:vi.fn().mockRejectedValue(new Error("permission denied"))},validRecord)).resolves.toEqual({ok:false,error:"permission denied"}));
  it("maps duplicate constraint errors", async () => { const result=await saveCensusRecord({createRecord:vi.fn().mockRejectedValue(new Error("duplicate key value violates unique constraint census_records_significant_duplicate_uidx"))},validRecord); expect(result).toEqual({ok:false,error:"Esiste già un record identico per questo contatto e questa posizione."}) });
});
