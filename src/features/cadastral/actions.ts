"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CadastralOperationResult } from "@/domain/cadastral-data";
import { getCadastralDocumentUrl, importCadastralUnitIntoContact, linkCadastralHolderToSubject, pollCadastralRequest, requestOrdinaryReport, requestPropertyHolders, requestPropertyUnits } from "@/services/cadastral-data-service";

export type CadastralActionResult={ok:true;data:CadastralOperationResult}|{ok:false;error:string};
const id=z.string().uuid();const context=z.object({recordId:id.optional(),provinceCode:z.string().min(1),municipality:z.string().min(1),municipalityCode:z.string().min(1),section:z.string().optional(),sheet:z.string().min(1),parcel:z.string().min(1)});
const failure=(error:unknown):CadastralActionResult=>({ok:false,error:error instanceof z.ZodError?"Dati catastali incompleti o non validi.":error instanceof Error?error.message:"Operazione catastale non completata."});
export async function findPropertyUnitsAction(input:unknown):Promise<CadastralActionResult>{try{const parsed=z.object({recordId:id.optional(),context:context.optional(),refresh:z.boolean().optional()}).parse(input);return{ok:true,data:await requestPropertyUnits(parsed)}}catch(error){return failure(error)}}
export async function getPropertyHoldersAction(input:unknown):Promise<CadastralActionResult>{try{const parsed=z.object({recordId:id.optional(),unitId:id,refresh:z.boolean().optional()}).parse(input);return{ok:true,data:await requestPropertyHolders(parsed)}}catch(error){return failure(error)}}
export async function requestOrdinaryReportAction(input:unknown):Promise<CadastralActionResult>{try{const parsed=z.object({recordId:id.optional(),unitId:id,refresh:z.boolean().optional()}).parse(input);return{ok:true,data:await requestOrdinaryReport(parsed)}}catch(error){return failure(error)}}
export async function pollCadastralRequestAction(input:unknown):Promise<CadastralActionResult>{try{return{ok:true,data:await pollCadastralRequest(id.parse(input))}}catch(error){return failure(error)}}
export async function linkCadastralHolderAction(input:unknown):Promise<{ok:true}|{ok:false;error:string}>{try{const parsed=z.object({recordId:id,holderId:id,subjectId:id}).parse(input);await linkCadastralHolderToSubject(parsed);revalidatePath(`/censimento/contatti/${parsed.recordId}`);return{ok:true}}catch(error){return{ok:false,error:error instanceof Error?error.message:"Associazione non riuscita."}}}
export async function getCadastralDocumentUrlAction(input:unknown):Promise<{ok:true;url:string}|{ok:false;error:string}>{try{return{ok:true,url:await getCadastralDocumentUrl(id.parse(input))}}catch(error){return{ok:false,error:error instanceof Error?error.message:"Documento non disponibile."}}}
export async function importCadastralUnitAction(input:unknown):Promise<{ok:true}|{ok:false;error:string}>{try{const parsed=z.object({recordId:id,unitId:id}).parse(input);await importCadastralUnitIntoContact(parsed);revalidatePath(`/censimento/contatti/${parsed.recordId}`);return{ok:true}}catch(error){return{ok:false,error:error instanceof Error?error.message:"Importazione non riuscita."}}}
