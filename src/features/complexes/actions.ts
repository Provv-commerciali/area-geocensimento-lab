"use server";

import { z } from "zod";
import { createClient, hasSupabaseEnvironment } from "@/lib/supabase/server";

const schema = z.object({
  name:z.string().trim().min(1).max(200), zoneId:z.string().uuid(), primaryAccessId:z.string().uuid(),
  otherAccessIds:z.array(z.string().uuid()).max(100), sheet:z.string().trim().max(100),
  parcel:z.string().trim().max(100), units:z.number().int().positive().nullable(),
  description:z.string().trim().max(5000),
});
export type ComplexCreateInput=z.infer<typeof schema>;
export type ComplexCreateResult={id:string;name:string;zoneId:string;primaryAccessId:string;accessIds:string[]}|{error:string};

export async function createComplexAction(input:ComplexCreateInput):Promise<ComplexCreateResult>{
  if(!hasSupabaseEnvironment())return{error:"La modalità dimostrativa non salva complessi."};
  const parsed=schema.safeParse(input);
  if(!parsed.success)return{error:parsed.error.issues[0]?.message??"Dati non validi."};
  const v=parsed.data;
  const db=await createClient();
  const {data,error}=await db.rpc("create_complex_lab",{
    p_name:v.name,p_zone_id:v.zoneId,p_primary_access_id:v.primaryAccessId,
    p_other_access_ids:v.otherAccessIds.filter(id=>id!==v.primaryAccessId),
    p_sheet:v.sheet||null,p_parcel:v.parcel||null,p_unit_count:v.units,p_description:v.description||null,
  });
  if(error)return{error:error.code==="23505"?"Questo civico appartiene già a un complesso oppure il nome è già usato nella Zona.":error.message};
  return{id:String(data),name:v.name,zoneId:v.zoneId,primaryAccessId:v.primaryAccessId,
    accessIds:[v.primaryAccessId,...v.otherAccessIds.filter(id=>id!==v.primaryAccessId)]};
}

export async function updateComplexAction(input:ComplexCreateInput & {id:string}):Promise<ComplexCreateResult>{
  if(!hasSupabaseEnvironment())return{error:"La modalità dimostrativa non modifica complessi."};
  const parsed=schema.extend({id:z.string().uuid()}).safeParse(input);
  if(!parsed.success)return{error:parsed.error.issues[0]?.message??"Dati non validi."};
  const v=parsed.data;const db=await createClient();
  const {data,error}=await db.rpc("update_complex_lab",{p_id:v.id,p_name:v.name,p_primary_access_id:v.primaryAccessId,
    p_other_access_ids:v.otherAccessIds.filter(id=>id!==v.primaryAccessId),p_sheet:v.sheet||null,
    p_parcel:v.parcel||null,p_unit_count:v.units,p_description:v.description||null});
  if(error)return{error:error.code==="23503"?"Un accesso da rimuovere è usato da Contatti o da una revisione campanelli.":error.message};
  return{id:String(data),name:v.name,zoneId:v.zoneId,primaryAccessId:v.primaryAccessId,
    accessIds:[v.primaryAccessId,...v.otherAccessIds.filter(id=>id!==v.primaryAccessId)]};
}

export async function deleteComplexAction(id:string):Promise<{ok:true}|{error:string}>{
  if(!hasSupabaseEnvironment())return{error:"La modalità dimostrativa non elimina complessi."};
  const parsed=z.string().uuid().safeParse(id);if(!parsed.success)return{error:"Complesso non valido."};
  const db=await createClient();const {error}=await db.rpc("delete_complex_lab",{p_id:parsed.data});
  if(error)return{error:error.code==="23503"?"Il complesso ha Contatti o documentazione fotografica/OCR e non può essere eliminato.":error.message};
  return{ok:true};
}
