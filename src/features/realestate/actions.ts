"use server";
import { z } from "zod";
import { requestComparables } from "@/services/realestate-comparable-service";
const schema=z.object({recordId:z.string().uuid(),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),radius:z.number().int().min(50).max(100000),surface:z.number().positive().optional(),rooms:z.number().positive().optional()});
export async function requestComparablesAction(input:unknown){try{return{ok:true,data:await requestComparables(schema.parse(input))}}catch(error){return{ok:false,error:error instanceof Error?error.message:"Comparabili non disponibili."}}}
