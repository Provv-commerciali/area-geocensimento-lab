import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenApiCatastoProvider } from "@/services/cadastral-data-provider";

const context={provinceCode:"LU",municipality:"PIETRASANTA",municipalityCode:"G628",sheet:"18",parcel:"245"};
afterEach(()=>vi.unstubAllGlobals());

describe("OpenApiCatastoProvider",()=>{
  it("maps every returned property unit without inventing absent fields",async()=>{
    const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({success:true,message:"",error:null,data:{id:"req-1",stato:"evasa",risultato:{immobili:[{id_immobile:"unit-1",foglio:18,particella:245,subalterno:1,categoria:"A/2",rendita:"Euro:100,00"},{id_immobile:"unit-2",foglio:18,particella:245,subalterno:2,categoria:"C/6"}]}}}),{status:200,headers:{"content-type":"application/json"}}));vi.stubGlobal("fetch",fetchMock);
    const result=await new OpenApiCatastoProvider("server-secret","https://test.catasto.openapi.it").requestPropertyUnits(context);
    expect(result.status).toBe("COMPLETED");expect(result.units).toHaveLength(2);expect(result.units[0]).toMatchObject({providerPropertyId:"unit-1",subaltern:"1",category:"A/2"});expect(result.units[1].cadastralIncome).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("https://test.catasto.openapi.it/richiesta/elenco_immobili/",expect.objectContaining({method:"POST",headers:expect.objectContaining({authorization:"Bearer server-secret"})}));
  });

  it("preserves multiple holders, original rights and shares",async()=>{
    const payload={success:true,data:{id:"req-2",stato:"evasa",risultato:{immobili:[{
      id_immobile:"unit-1",foglio:18,particella:245,subalterno:1,
      intestatari:[
        {nome:"Mario",cognome:"Rossi",codice_fiscale:"RSS",titolarita:"Proprietà",quota:"1/2"},
        {nome:"Anna",cognome:"Bianchi",codice_fiscale:"BNC",titolarita:"Proprietà",quota:"1/2"},
      ],
    }]}}};
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify(payload),{status:200})));
    const result=await new OpenApiCatastoProvider("secret","https://test.catasto.openapi.it").requestPropertyHolders(context,{providerPropertyId:"unit-1",sheet:"18",parcel:"245",subaltern:"1"});
    expect(result.holders).toHaveLength(2);expect(result.holders.map(holder=>holder.shareOriginal)).toEqual(["1/2","1/2"]);expect(result.holders[0].rightTypeOriginal).toBe("Proprietà");
  });

  it("surfaces HTTP 402 without returning partial data",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("{}",{status:402})));
    await expect(new OpenApiCatastoProvider("secret","https://test.catasto.openapi.it").requestPropertyUnits(context)).rejects.toMatchObject({code:"PAYMENT_REQUIRED",retryable:false});
  });
});
