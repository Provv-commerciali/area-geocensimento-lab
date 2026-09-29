import { z } from "zod";
import type { Complex } from "@/domain/census";
import { accessLabel } from "@/domain/territory";
import { COMPLEX_PHOTO_BUCKET } from "@/domain/complex-photos";
import { createClient, hasSupabaseEnvironment } from "@/lib/supabase/server";

export interface StreetComplexSummary { primaryAddress?:string;photoUrl?:string;accesses:{id:string;streetId:string;label:string}[] }
const accessRow=z.object({id:z.string(),street_id:z.string(),civic:z.string().nullable(),exponent:z.string().nullable(),specificity:z.string().nullable(),metric:z.string().nullable(),progressivo_snc:z.string().nullable(),streets:z.object({name:z.string()}).nullable()});
const linkRow=z.object({complex_id:z.string(),address_accesses:accessRow});
const photoRow=z.object({complex_id:z.string(),storage_path:z.string(),is_primary:z.boolean(),sort_order:z.number(),uploaded_at:z.string()});

export async function loadStreetComplexSummaries(complexes:Complex[]):Promise<Record<string,StreetComplexSummary>>{
  if(!hasSupabaseEnvironment()||!complexes.length)return {};
  const db=await createClient();
  const ids=complexes.map(item=>item.id);
  const [accessResult,photoResult]=await Promise.all([
    db.from("complex_address_accesses").select("complex_id,address_accesses(id,street_id,civic,exponent,specificity,metric,progressivo_snc,streets(name))").in("complex_id",ids),
    db.from("complex_photos").select("complex_id,storage_path,is_primary,sort_order,uploaded_at").in("complex_id",ids).eq("photo_type","COMPLEX").is("deleted_at",null).order("is_primary",{ascending:false}).order("sort_order").order("uploaded_at"),
  ]);
  if(accessResult.error)throw new Error(accessResult.error.message);
  if(photoResult.error)throw new Error(photoResult.error.message);
  const links=z.array(linkRow).parse(accessResult.data);
  const accesses=new Map(links.map(link=>[link.address_accesses.id,link.address_accesses]));
  const photos=z.array(photoRow).parse(photoResult.data);
  const firstPhotos=new Map<string,string>();for(const photo of photos)if(!firstPhotos.has(photo.complex_id))firstPhotos.set(photo.complex_id,photo.storage_path);
  const paths=[...new Set(firstPhotos.values())];
  const signed=paths.length?await db.storage.from(COMPLEX_PHOTO_BUCKET).createSignedUrls(paths,600):null;
  const urls=new Map((signed?.data??[]).filter(item=>item.signedUrl).map(item=>[item.path,item.signedUrl]));
  return Object.fromEntries(complexes.map(complex=>{
    const access=complex.primaryAccessId?accesses.get(complex.primaryAccessId):undefined;
    return [complex.id,{
      primaryAddress:access?`${access.streets?.name??"Via"} ${accessLabel({civic:access.civic??undefined,exponent:access.exponent??undefined,specificity:access.specificity??undefined,metric:access.metric??undefined,progressivoSnc:access.progressivo_snc??undefined})}`:undefined,
      photoUrl:urls.get(firstPhotos.get(complex.id)??"")??undefined,
      accesses:links.filter(link=>link.complex_id===complex.id).map(link=>({id:link.address_accesses.id,streetId:link.address_accesses.street_id,label:`${link.address_accesses.streets?.name??"Via"} ${accessLabel({civic:link.address_accesses.civic??undefined,exponent:link.address_accesses.exponent??undefined,specificity:link.address_accesses.specificity??undefined,metric:link.address_accesses.metric??undefined,progressivoSnc:link.address_accesses.progressivo_snc??undefined})}`})),
    }];
  }));
}
