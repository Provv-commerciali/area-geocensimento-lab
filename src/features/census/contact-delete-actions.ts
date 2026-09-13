"use server";

import{redirect}from"next/navigation";import{createClient,hasSupabaseEnvironment}from"@/lib/supabase/server";
export type ContactDeleteState={error?:string};
export async function deleteContactAction(_state:ContactDeleteState,data:FormData):Promise<ContactDeleteState>{
  if(!hasSupabaseEnvironment())return{error:"Database LAB non configurato"};const recordId=String(data.get("recordId")??"").trim();if(!recordId)return{error:"Contatto non valido"};const db=await createClient();const{error}=await db.rpc("delete_census_contact_lab",{p_record_id:recordId});if(error)return{error:error.message};redirect("/censimento/contatti?deleted=1");
}
