"use server";

import { revalidatePath } from "next/cache";
import { createClient, hasSupabaseEnvironment } from "@/lib/supabase/server";
import { qualifications } from "@/domain/census";

export interface SubjectLinkActionState{error?:string;success?:string}
const value=(data:FormData,key:string)=>String(data.get(key)??"").trim();
export async function linkSubjectAction(_state:SubjectLinkActionState,data:FormData):Promise<SubjectLinkActionState>{
  if(!hasSupabaseEnvironment())return{error:"Modalità demo: il collegamento non è stato salvato."};
  const recordId=value(data,"recordId"),subjectId=value(data,"subjectId"),role=value(data,"role");
  if(!recordId||!subjectId||!qualifications.some(candidate=>candidate===role))return{error:"Seleziona soggetto e ruolo."};
  const db=await createClient();const {error}=await db.rpc("link_subject_to_census_record_lab",{p_record_id:recordId,p_subject_id:subjectId,p_role:role});
  if(error)return{error:error.message};revalidatePath(`/censimento/contatti/${recordId}`);return{success:"Anagrafica collegata al contatto."};
}
