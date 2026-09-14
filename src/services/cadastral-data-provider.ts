import { z } from "zod";
import type { CadastralContext, CadastralHolder, CadastralPropertyUnit } from "@/domain/cadastral-data";

const scalar=z.union([z.string(),z.number()]);
const unitSchema=z.object({
  id_immobile:z.string().min(1),sezione:z.string().nullable().optional(),sezione_urbana:z.string().nullable().optional(),foglio:scalar,particella:scalar,
  subalterno:scalar.nullable().optional(),indirizzo:z.string().nullable().optional(),zona_censuaria:scalar.nullable().optional(),categoria:z.string().nullable().optional(),classe:scalar.nullable().optional(),
  consistenza:scalar.nullable().optional(),rendita:scalar.nullable().optional(),partita:scalar.nullable().optional(),intestatari:z.array(z.record(z.string(),z.unknown())).optional(),
}).passthrough();
const responseSchema=z.object({success:z.boolean(),message:z.string().optional(),error:z.union([z.string(),z.number()]).nullable().optional(),data:z.object({
  id:z.string().min(1),stato:z.string(),risultato:z.object({immobili:z.array(unitSchema).optional(),intestatari:z.array(z.record(z.string(),z.unknown())).optional()}).passthrough().nullable().optional(),
}).passthrough()});

export type ProviderRequestState={providerRequestId:string;status:"IN_PROGRESS"|"COMPLETED";units:CadastralPropertyUnit[];holders:CadastralHolder[];raw:unknown};
export interface CadastralDataProvider{
  requestPropertyUnits(context:CadastralContext):Promise<ProviderRequestState>;
  requestPropertyHolders(context:CadastralContext,unit:CadastralPropertyUnit):Promise<ProviderRequestState>;
  getRequest(providerRequestId:string):Promise<ProviderRequestState>;
  requestOrdinaryReport(providerPropertyId:string):Promise<ProviderRequestState>;
  getOrdinaryReport(providerRequestId:string):Promise<ProviderRequestState>;
  downloadOrdinaryReport(providerRequestId:string):Promise<Uint8Array>;
  requestPlanimetricElaboration(context:CadastralContext):Promise<ProviderRequestState>;
  getPlanimetricElaboration(providerRequestId:string):Promise<ProviderRequestState>;
  downloadPlanimetricElaboration(providerRequestId:string):Promise<Uint8Array>;
}

export class CadastralProviderError extends Error{
  constructor(public readonly code:"NOT_CONFIGURED"|"UNAUTHORIZED"|"PAYMENT_REQUIRED"|"TIMEOUT"|"UPSTREAM_UNAVAILABLE"|"UPSTREAM_REJECTED"|"INVALID_RESPONSE",message:string,public readonly retryable:boolean){super(message)}
}

function optional(value:unknown){if(value===null||value===undefined||value==="")return undefined;return String(value)}
function mapUnit(value:z.infer<typeof unitSchema>):CadastralPropertyUnit{return{providerPropertyId:value.id_immobile,section:optional(value.sezione),urbanSection:optional(value.sezione_urbana),sheet:String(value.foglio),parcel:String(value.particella),subaltern:optional(value.subalterno),address:optional(value.indirizzo),censusZone:optional(value.zona_censuaria),category:optional(value.categoria),class:optional(value.classe),consistency:optional(value.consistenza),cadastralIncome:optional(value.rendita),registryLot:optional(value.partita)}}
function holderText(holder:Record<string,unknown>,...keys:string[]){for(const key of keys){const value=holder[key];if(typeof value==="string"&&value.trim())return value.trim()}return undefined}
function mapHolder(holder:Record<string,unknown>):CadastralHolder{
  const companyName=holderText(holder,"denominazione","ragione_sociale");const firstName=holderText(holder,"nome");const lastName=holderText(holder,"cognome");
  return{holderType:companyName?"AZIENDA":firstName||lastName?"PRIVATO":"NON_DETERMINATO",firstName,lastName,companyName,taxCode:holderText(holder,"codice_fiscale","cf_piva","partita_iva"),rightTypeOriginal:holderText(holder,"titolarita","tipo_diritto","diritto"),shareOriginal:holderText(holder,"quota")};
}

export class OpenApiCatastoProvider implements CadastralDataProvider{
  constructor(private readonly token:string,private readonly baseUrl:string,private readonly timeoutMs=12_000){}
  private async json(path:string,init?:RequestInit):Promise<ProviderRequestState>{
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),this.timeoutMs);
    try{
      const response=await fetch(`${this.baseUrl}${path}`,{...init,headers:{authorization:`Bearer ${this.token}`,accept:"application/json",...(init?.body?{"content-type":"application/json"}:{}),...init?.headers},signal:controller.signal,cache:"no-store"});
      if(response.status===401||response.status===403)throw new CadastralProviderError("UNAUTHORIZED","Token OpenAPI non valido o privo dello scope richiesto.",false);
      if(response.status===402)throw new CadastralProviderError("PAYMENT_REQUIRED","Credito OpenAPI insufficiente per completare l’operazione.",false);
      if(!response.ok)throw new CadastralProviderError(response.status>=500?"UPSTREAM_UNAVAILABLE":"UPSTREAM_REJECTED","Il provider catastale non ha accettato la richiesta.",response.status>=500||response.status===429);
      const parsed=responseSchema.safeParse(await response.json());if(!parsed.success||!parsed.data.success)throw new CadastralProviderError("INVALID_RESPONSE","Il provider catastale ha restituito dati non validi.",false);
      if(["errore","fallita","failed"].includes(parsed.data.data.stato.toLocaleLowerCase("it")))throw new CadastralProviderError("UPSTREAM_REJECTED","La richiesta catastale è terminata con errore presso il provider.",false);
      const result=parsed.data.data.risultato;const rawUnits=result?.immobili??[];const units=rawUnits.map(mapUnit);const holderRows=[...(result?.intestatari??[]),...rawUnits.flatMap(unit=>unit.intestatari??[])];const holders=holderRows.map(mapHolder);
      return{providerRequestId:parsed.data.data.id,status:parsed.data.data.stato==="evasa"?"COMPLETED":"IN_PROGRESS",units,holders,raw:{units,holders}};
    }catch(error){if(error instanceof CadastralProviderError)throw error;if(controller.signal.aborted)throw new CadastralProviderError("TIMEOUT","Il provider catastale non ha risposto entro il tempo previsto.",true);throw new CadastralProviderError("UPSTREAM_UNAVAILABLE","Il provider catastale non è raggiungibile.",true)}finally{clearTimeout(timeout)}
  }
  requestPropertyUnits(context:CadastralContext){return this.json("/richiesta/elenco_immobili/",{method:"POST",body:JSON.stringify({tipo_catasto:"F",provincia:context.provinceCode,comune:context.municipality,sezione:context.section??"",foglio:context.sheet,particella:context.parcel})})}
  requestPropertyHolders(context:CadastralContext,unit:CadastralPropertyUnit){return this.json("/richiesta/prospetto_catastale/",{method:"POST",body:JSON.stringify({tipo_catasto:"F",provincia:context.provinceCode,comune:context.municipality,sezione:unit.section??context.section??"",foglio:unit.sheet,particella:unit.parcel,subalterno:unit.subaltern})})}
  getRequest(id:string){return this.json(`/richiesta/${encodeURIComponent(id)}`)}
  requestOrdinaryReport(providerPropertyId:string){return this.json("/visura_catastale",{method:"POST",body:JSON.stringify({entita:"immobile",id_immobile:providerPropertyId,tipo_visura:"ordinaria"})})}
  getOrdinaryReport(id:string){return this.json(`/visura_catastale/${encodeURIComponent(id)}`)}
  requestPlanimetricElaboration(context:CadastralContext){return this.json("/elaborato_planimetrico",{method:"POST",body:JSON.stringify({tipo_catasto:"F",provincia:context.provinceCode,comune:context.municipality,sezione:context.section??"",foglio:context.sheet,particella:context.parcel})})}
  getPlanimetricElaboration(id:string){return this.json(`/elaborato_planimetrico/${encodeURIComponent(id)}`)}
  async downloadOrdinaryReport(id:string){const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),this.timeoutMs);try{const response=await fetch(`${this.baseUrl}/visura_catastale/${encodeURIComponent(id)}/documento`,{headers:{authorization:`Bearer ${this.token}`,accept:"application/pdf"},signal:controller.signal,cache:"no-store"});if(!response.ok)throw new CadastralProviderError(response.status>=500?"UPSTREAM_UNAVAILABLE":"UPSTREAM_REJECTED","Documento catastale non disponibile.",response.status>=500);const type=response.headers.get("content-type")??"";if(!type.toLowerCase().includes("application/pdf"))throw new CadastralProviderError("INVALID_RESPONSE","Il provider non ha restituito un documento PDF valido.",false);const bytes=new Uint8Array(await response.arrayBuffer());if(!bytes.length||bytes.length>20*1024*1024)throw new CadastralProviderError("INVALID_RESPONSE","Dimensione del documento catastale non valida.",false);return bytes}finally{clearTimeout(timeout)}}
  async downloadPlanimetricElaboration(id:string){const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),this.timeoutMs);try{const response=await fetch(`${this.baseUrl}/elaborato_planimetrico/${encodeURIComponent(id)}/documento`,{headers:{authorization:`Bearer ${this.token}`,accept:"application/pdf"},signal:controller.signal,cache:"no-store"});if(!response.ok)throw new CadastralProviderError(response.status>=500?"UPSTREAM_UNAVAILABLE":"UPSTREAM_REJECTED","Elaborato planimetrico non disponibile.",response.status>=500);const type=response.headers.get("content-type")??"";if(!type.toLowerCase().includes("application/pdf"))throw new CadastralProviderError("INVALID_RESPONSE","Il provider non ha restituito un documento PDF valido.",false);const bytes=new Uint8Array(await response.arrayBuffer());if(!bytes.length||bytes.length>20*1024*1024)throw new CadastralProviderError("INVALID_RESPONSE","Dimensione del documento catastale non valida.",false);return bytes}finally{clearTimeout(timeout)}}
}
