import { describe, expect, it } from "vitest";
import { parseCadastralFeatureInfo, resolveCadastralTerritory } from "@/services/cadastral-feature";

describe("cadastral feature info",()=>{
  it("keeps only attributes actually returned by the official service",()=>{
    const feature=parseCadastralFeatureInfo('Layer CP.CadastralParcel\n{"COD_COMUNE":"G628","DENOM":"PIETRASANTA (LU)","SEZIONE":"","FOGLIO":"18","NUM_PART":"1","TIPOLOGIA":"PARTICELLA","ALLEGATO":null}');
    expect(feature).toEqual({municipalityCode:"G628",municipalityName:"PIETRASANTA (LU)",section:undefined,sheet:"18",parcel:"1",featureType:"PARTICELLA"});
    expect(feature).not.toHaveProperty("subaltern");expect(feature).not.toHaveProperty("cadastralCategory");
  });
  it("rejects payloads without sheet and parcel",()=>{expect(()=>parseCadastralFeatureInfo('{"COD_COMUNE":"A944"}')).toThrow()});
  it("parses the actual official HTML reference returned by GetFeatureInfo",()=>{const feature=parseCadastralFeatureInfo("<title>Strato CP.CadastralParcel</title><table><tr><th>Label</th><td>1</td></tr><tr><th>NationalCadastralReference</th><td>G628_001800.1</td></tr></table>");expect(feature).toEqual({municipalityCode:"G628",sheet:"18",parcel:"1",featureType:"PARTICELLA"})});
  it("parses official references containing a cadastral section",()=>{const feature=parseCadastralFeatureInfo("<title>Strato CP.CadastralParcel</title><table><tr><th>Label</th><td>B</td></tr><tr><th>NationalCadastralReference</th><td>H501A050800.B</td></tr></table>");expect(feature).toEqual({municipalityCode:"H501",section:"A",sheet:"508",parcel:"B",featureType:"PARTICELLA"})});
  it("resolves territory by cadastral code instead of the first loaded zone",()=>{const zones=[{municipalityCadastralCode:"A944",municipality:"Bologna"},{municipalityCadastralCode:"F035",municipality:"Massarosa"}];expect(resolveCadastralTerritory(zones,"F035")?.municipality).toBe("Massarosa")});
});
