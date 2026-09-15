"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, hasSupabaseEnvironment } from "@/lib/supabase/server";
import { interviewSchema } from "./schemas";

export interface InterviewActionState { error?: string }
const value=(data:FormData,key:string)=>String(data.get(key)??"").trim();

export async function createInterviewAction(_state:InterviewActionState,data:FormData):Promise<InterviewActionState>{
  if(!hasSupabaseEnvironment()) return {error:"Modalità demo: l'intervista non è stata salvata."};
  const recordId=value(data,"recordId");
  const parsed=interviewSchema.safeParse({operatorId:value(data,"operatorId"),interviewDate:value(data,"interviewDate"),recallDate:value(data,"recallDate"),response:value(data,"response"),reason:value(data,"reason"),outcome:value(data,"outcome")});
  if(!recordId) return {error:"Record contatto non valido."};
  if(!parsed.success) return {error:parsed.error.issues[0]?.message??"Dati intervista non validi."};
  const db=await createClient();
  const {error}=await db.rpc("create_census_interview_lab",{p_record_id:recordId,p_interview:parsed.data});
  if(error) return {error:error.message};
  revalidatePath("/"); revalidatePath("/censimento/contatti"); revalidatePath(`/censimento/contatti/${recordId}`);
  redirect(`/censimento/contatti/${recordId}?interviewCreated=1`);
}
