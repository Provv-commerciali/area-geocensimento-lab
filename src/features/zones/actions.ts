"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, hasSupabaseEnvironment } from "@/lib/supabase/server";
import { zoneSchema } from "@/features/census/schemas";

export interface ZoneActionState { error?: string; success?: string }
const values = (data: FormData, key: string) => data.getAll(key).map(String).filter(Boolean);
const value = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

export async function createZoneAction(_state: ZoneActionState, data: FormData): Promise<ZoneActionState> {
  if (!hasSupabaseEnvironment()) return { error: "Modalità demo: la zona non è stata salvata." };
  const parsed = zoneSchema.safeParse({
    countryId: value(data,"countryId"), regionId: value(data,"regionId"), provinceId: value(data,"provinceId"),
    municipalityId: value(data,"municipalityId"), name: value(data,"name"), operatorId: value(data,"operatorId"), streetIds: values(data,"streetIds"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati zona non validi" };
  const db=await createClient();
  const { data:zoneId,error }=await db.rpc("create_census_zone_lab",{
    p_country_id:parsed.data.countryId,p_region_id:parsed.data.regionId,p_province_id:parsed.data.provinceId,
    p_municipality_id:parsed.data.municipalityId,p_name:parsed.data.name,p_assignee_operator_id:parsed.data.operatorId,
    p_street_ids:parsed.data.streetIds,p_new_street_name:null,
  });
  if(error)return{error:error.code==="23505"?"Esiste già una zona con questo nome nel Comune selezionato.":error.message};
  revalidatePath("/censimento/zone");
  if(value(data,"intent")==="streets"&&typeof zoneId==="string")redirect(`/censimento/zone/${zoneId}/modifica`);
  redirect("/censimento/zone?created=1");
}

export async function attachStreetAction(_state: ZoneActionState,data:FormData):Promise<ZoneActionState>{
  if(!hasSupabaseEnvironment())return{error:"Modalità demo: la via non è stata associata."};
  const zoneId=value(data,"zoneId");const db=await createClient();const {error}=await db.rpc("attach_street_to_zone_lab",{
    p_zone_id:zoneId,p_existing_street_id:value(data,"existingStreetId")||null,p_new_street_name:null,
  });
  if(error)return{error:error.message};revalidatePath("/censimento/zone");revalidatePath(`/censimento/zone/${zoneId}`);revalidatePath(`/censimento/zone/${zoneId}/modifica`);return{success:"Via associata correttamente."};
}

export async function createManualStreetAction(_state:ZoneActionState,data:FormData):Promise<ZoneActionState>{
  if(!hasSupabaseEnvironment())return{error:"Modalità demo: eccezione non salvata."};
  const zoneId=value(data,"zoneId"),name=value(data,"name"),reason=value(data,"reason");
  if(!name||!reason)return{error:"Indica via e motivo dell’eccezione."};
  const db=await createClient();const{error}=await db.rpc("create_manual_street_for_zone_lab",{
    p_zone_id:zoneId,p_name:name,p_locality:value(data,"locality")||null,p_reason:reason});
  if(error)return{error:error.message};
  revalidatePath(`/censimento/zone/${zoneId}`);revalidatePath(`/censimento/zone/${zoneId}/modifica`);
  return{success:"Eccezione manuale proposta e associata alla Zona."};
}

export async function createManualAccessAction(_state:ZoneActionState,data:FormData):Promise<ZoneActionState>{
  if(!hasSupabaseEnvironment())return{error:"Modalità demo: accesso non salvato."};
  const streetId=value(data,"streetId"),reason=value(data,"reason"),zoneId=value(data,"zoneId");
  if(!reason||!["civic","metric","snc"].some(key=>value(data,key)))return{error:"Indica numerazione e motivo."};
  const db=await createClient();const{error}=await db.rpc("create_manual_access_lab",{
    p_street_id:streetId,p_civic:value(data,"civic")||null,p_exponent:value(data,"exponent")||null,
    p_metric:value(data,"metric")||null,p_snc:value(data,"snc")||null,p_reason:reason});
  if(error)return{error:error.message};
  revalidatePath(`/censimento/zone/${zoneId}`);revalidatePath(`/censimento/zone/${zoneId}/modifica`);
  return{success:"Accesso manuale proposto."};
}
