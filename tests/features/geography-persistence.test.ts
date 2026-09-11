import { describe,expect,it,vi } from "vitest";
import { persistCadastralAssociation,persistCivicLocation,type GeographyGateway } from "@/features/census/geography-persistence";

function gateway():GeographyGateway{return{saveCivicLocation:vi.fn().mockResolvedValue(undefined),confirmCadastralAssociation:vi.fn().mockResolvedValue(undefined)}}
describe("geography persistence",()=>{
  it("allows a geocoder only to save AUTO_GEOLOCATED",async()=>{const db=gateway();expect(await persistCivicLocation(db,{civicId:"c1",longitude:11,latitude:44,status:"AUTO_GEOLOCATED",method:"GEOCODER",source:"NOMINATIM"})).toEqual({ok:true});expect(db.saveCivicLocation).toHaveBeenCalledTimes(1)});
  it("never lets a geocoder mark a civic VERIFIED",async()=>{const db=gateway();const result=await persistCivicLocation(db,{civicId:"c1",longitude:11,latitude:44,status:"VERIFIED",method:"GEOCODER",source:"NOMINATIM"});expect(result.ok).toBe(false);expect(db.saveCivicLocation).not.toHaveBeenCalled()});
  it("persists an explicit manual confirmation",async()=>{const db=gateway();expect(await persistCivicLocation(db,{civicId:"c1",longitude:11,latitude:44,status:"VERIFIED",method:"MANUAL_MAP",source:"OPERATORE_MAPPA"})).toEqual({ok:true});expect(db.saveCivicLocation).toHaveBeenCalledWith("c1",expect.objectContaining({status:"VERIFIED"}))});
  it("does not write a cadastral association before explicit confirmation",()=>{const db=gateway();expect(db.confirmCadastralAssociation).not.toHaveBeenCalled()});
  it("persists only the confirmed record context",async()=>{const db=gateway();expect(await persistCadastralAssociation(db,{recordId:"r1",municipalityCode:"G628",sheet:"18",parcel:"1"})).toEqual({ok:true});expect(db.confirmCadastralAssociation).toHaveBeenCalledWith("r1",expect.objectContaining({sheet:"18",parcel:"1"}))});
});
