"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, hasSupabaseEnvironment } from "@/lib/supabase/server";
import { zoneSchema } from "@/features/census/schemas";
import { deduplicateCivicDrafts, generateCivicRange, parseManualCivics } from "@/features/territory/civics";
import type { CivicParity } from "@/domain/census";

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
    p_street_ids:parsed.data.streetIds,p_new_street_name:value(data,"newStreetName")||null,
  });
  if(error)return{error:error.code==="23505"?"Esiste già una zona con questo nome nel Comune selezionato.":error.message};
  revalidatePath("/censimento/zone");
  if(value(data,"intent")==="streets"&&typeof zoneId==="string")redirect(`/censimento/zone/${zoneId}`);
  redirect("/censimento/zone?created=1");
}

export async function attachStreetAction(_state: ZoneActionState,data:FormData):Promise<ZoneActionState>{
  if(!hasSupabaseEnvironment())return{error:"Modalità demo: la via non è stata associata."};
  const zoneId=value(data,"zoneId");const db=await createClient();const {error}=await db.rpc("attach_street_to_zone_lab",{
    p_zone_id:zoneId,p_existing_street_id:value(data,"existingStreetId")||null,p_new_street_name:value(data,"newStreetName")||null,
  });
  if(error)return{error:error.message};revalidatePath("/censimento/zone");revalidatePath(`/censimento/zone/${zoneId}`);revalidatePath(`/censimento/zone/${zoneId}/modifica`);return{success:"Via associata correttamente."};
}

export async function renameStreetAction(_state:ZoneActionState,data:FormData):Promise<ZoneActionState>{
  if(!hasSupabaseEnvironment())return{error:"Modalità demo: il nome della via non è stato modificato."};
  const zoneId=value(data,"zoneId");const streetName=value(data,"streetName");
  if(!streetName)return{error:"Inserisci il nome della via."};
  const db=await createClient();const {error}=await db.rpc("rename_zone_street_lab",{p_zone_id:zoneId,p_street_id:value(data,"streetId"),p_name:streetName});
  if(error)return{error:error.code==="23505"?"Esiste già una via con questo nome nel Comune selezionato.":error.message};
  revalidatePath("/censimento/zone");revalidatePath(`/censimento/zone/${zoneId}`);revalidatePath(`/censimento/zone/${zoneId}/modifica`);
  return{success:"Nome della via aggiornato correttamente."};
}

export async function addCivicsAction(_state:ZoneActionState,data:FormData):Promise<ZoneActionState>{
  if(!hasSupabaseEnvironment())return{error:"Modalità demo: i civici non sono stati salvati."};
  const streetId=value(data,"streetId");
  try{
    const mode=value(data,"mode");let drafts;
    if(mode==="range")drafts=generateCivicRange(Number(value(data,"from")),Number(value(data,"to")),value(data,"parity") as CivicParity);
    else if(mode==="manual")drafts=parseManualCivics(value(data,"manualCivics"));
    else drafts=[{number:value(data,"number"),extension:value(data,"extension")||undefined}];
    drafts=deduplicateCivicDrafts(drafts);if(!drafts.length)return{error:"Inserisci almeno un civico valido."};
    const db=await createClient();const {data:inserted,error}=await db.rpc("add_civics_to_street_lab",{p_street_id:streetId,p_civics:drafts});
    if(error)return{error:error.message};revalidatePath(value(data,"returnPath")||"/censimento/zone");return{success:`${inserted??0} civici aggiunti; gli eventuali duplicati sono stati ignorati.`};
  }catch(error){return{error:error instanceof Error?error.message:"Inserimento civici non riuscito"};}
}
