import { z } from "zod";
import { createClient, hasSupabaseEnvironment } from "@/lib/supabase/server";

export const CONTACT_PHOTO_BUCKET="contact-photos";
const id=z.string().uuid();
const photo=z.object({id,storage_path:z.string(),original_filename:z.string(),mime_type:z.enum(["image/jpeg","image/png","image/webp"]),byte_size:z.number(),caption:z.string().nullable().optional(),is_primary:z.boolean(),uploaded_at:z.string()});
export type ContactPhoto={id:string;storagePath:string;originalFilename:string;mimeType:"image/jpeg"|"image/png"|"image/webp";byteSize:number;caption?:string;isPrimary:boolean;uploadedAt:string;signedUrl?:string};

export async function loadContactPhotos(recordId:string):Promise<ContactPhoto[]>{
  if(!hasSupabaseEnvironment())return[];id.parse(recordId);const db=await createClient();const {data,error}=await db.from("census_record_photos").select("id,storage_path,original_filename,mime_type,byte_size,caption,is_primary,uploaded_at").eq("census_record_id",recordId).is("deleted_at",null).order("is_primary",{ascending:false}).order("uploaded_at",{ascending:false});if(error)throw new Error(error.message);
  return Promise.all((data??[]).map(async item=>{const parsed=photo.parse(item);const signed=await db.storage.from(CONTACT_PHOTO_BUCKET).createSignedUrl(parsed.storage_path,600);return{id:parsed.id,storagePath:parsed.storage_path,originalFilename:parsed.original_filename,mimeType:parsed.mime_type,byteSize:parsed.byte_size,caption:parsed.caption??undefined,isPrimary:parsed.is_primary,uploadedAt:parsed.uploaded_at,signedUrl:signed.data?.signedUrl}}));
}

export async function loadPrimaryContactPhotoUrls(recordIds:string[]):Promise<Record<string,string>>{
  if(!hasSupabaseEnvironment()||!recordIds.length)return{};const db=await createClient();const {data,error}=await db.from("census_record_photos").select("census_record_id,storage_path").in("census_record_id",recordIds).is("deleted_at",null).eq("is_primary",true);if(error)throw new Error(error.message);const pairs=await Promise.all((data??[]).map(async item=>{const signed=await db.storage.from(CONTACT_PHOTO_BUCKET).createSignedUrl(String(item.storage_path),600);return[String(item.census_record_id),signed.data?.signedUrl] as const}));return Object.fromEntries(pairs.filter((item):item is [string,string]=>Boolean(item[1])));
}

export async function uploadContactPhoto(recordId:string,file:File){
  id.parse(recordId);if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size<1||file.size>10_485_760)throw new Error("Sono ammesse immagini JPG, PNG o WebP fino a 10 MB.");if(!hasSupabaseEnvironment())throw new Error("Database LAB non configurato.");const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)throw new Error("Autenticazione richiesta.");const photoId=crypto.randomUUID();const extension=file.type==="image/jpeg"?".jpg":file.type==="image/png"?".png":".webp";const storagePath=`${recordId}/${photoId}${extension}`;const uploaded=await db.storage.from(CONTACT_PHOTO_BUCKET).upload(storagePath,file,{contentType:file.type,upsert:false});if(uploaded.error)throw new Error(uploaded.error.message);const {error}=await db.from("census_record_photos").insert({id:photoId,census_record_id:recordId,storage_path:storagePath,original_filename:file.name,mime_type:file.type,byte_size:file.size,is_primary:true});if(error){await db.storage.from(CONTACT_PHOTO_BUCKET).remove([storagePath]);throw new Error(error.message)}const clear=await db.from("census_record_photos").update({is_primary:false}).eq("census_record_id",recordId).neq("id",photoId);if(clear.error)throw new Error(clear.error.message);return photoId;
}
