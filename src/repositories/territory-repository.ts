import { z } from "zod";
import { createClient, hasSupabaseEnvironment } from "@/lib/supabase/server";
import { streets as demoStreets, civics as demoCivics, zones as demoZones } from "@/lib/demo-data";
import type { AddressAccess, CanonicalStreet, ZoneAccessCounts } from "@/domain/territory";

const streetRow = z.object({
  id:z.string(),municipality_id:z.string(),name:z.string(),locality_name:z.string().nullable().optional(),
  locality_id:z.string().nullable().optional(),total_accesses:z.number().nullable().optional(),
  source_kind:z.enum(["OFFICIAL_ANNCSU","MANUAL"]),anncsu_progressivo_nazionale:z.string().nullable().optional(),
  is_present_in_latest_snapshot:z.boolean(),manual_review_state:z.enum(["PROPOSED","APPROVED","RETIRED"]).nullable().optional(),
});
const accessRow=z.object({id:z.string(),street_id:z.string(),street_name:z.string(),
  source_kind:z.enum(["OFFICIAL_ANNCSU","MANUAL"]),anncsu_progressivo_accesso:z.string().nullable().optional(),
  civic:z.string().nullable().optional(),exponent:z.string().nullable().optional(),specificity:z.string().nullable().optional(),
  metric:z.string().nullable().optional(),progressivo_snc:z.string().nullable().optional(),
  longitude:z.union([z.number(),z.string()]).nullable().optional(),latitude:z.union([z.number(),z.string()]).nullable().optional(),
  location_crs:z.string().nullable().optional(),location_source:z.string().nullable().optional()});

function mapStreet(input:unknown):CanonicalStreet {const r=streetRow.parse(input);return{
  id:r.id,municipalityId:r.municipality_id,name:r.name,localityName:r.locality_name??undefined,
  localityId:r.locality_id??undefined,totalAccesses:r.total_accesses??0,sourceKind:r.source_kind,
  anncsuProgressivoNazionale:r.anncsu_progressivo_nazionale??undefined,
  isPresentInLatestSnapshot:r.is_present_in_latest_snapshot,manualReviewState:r.manual_review_state??undefined};}
function mapAccess(input:unknown):AddressAccess {const r=accessRow.parse(input);return{
  id:r.id,streetId:r.street_id,streetName:r.street_name,sourceKind:r.source_kind,
  anncsuProgressivoAccesso:r.anncsu_progressivo_accesso??undefined,civic:r.civic??undefined,
  exponent:r.exponent??undefined,specificity:r.specificity??undefined,metric:r.metric??undefined,
  progressivoSnc:r.progressivo_snc??undefined,
  longitude:r.longitude==null?undefined:Number(r.longitude),latitude:r.latitude==null?undefined:Number(r.latitude),
  locationCrs:r.location_crs??undefined,locationSource:r.location_source??undefined};}

const streetSelect="id,municipality_id,name,locality_name,locality_id,total_accesses,source_kind,anncsu_progressivo_nazionale,is_present_in_latest_snapshot,manual_review_state";

export async function searchStreetCatalog(municipalityId:string,query="",locality="",limit=100):Promise<CanonicalStreet[]> {
  if(!hasSupabaseEnvironment())return demoStreets.filter(street=>street.municipalityId===municipalityId&&street.name.toLocaleLowerCase("it").includes(query.toLocaleLowerCase("it"))).slice(0,limit).map(street=>({id:street.id,municipalityId:street.municipalityId,name:street.name,totalAccesses:demoCivics.filter(c=>c.streetId===street.id).length,sourceKind:"MANUAL",isPresentInLatestSnapshot:false,manualReviewState:"PROPOSED"}));
  const db=await createClient();
  let request=db.from("streets").select(streetSelect).eq("municipality_id",municipalityId)
    .eq("source_kind","OFFICIAL_ANNCSU").eq("is_present_in_latest_snapshot",true);
  if(query.trim())request=request.ilike("name",`%${query.trim().replace(/[%,_]/g,"")}%`);
  if(locality.trim())request=request.ilike("locality_name",`%${locality.trim().replace(/[%,_]/g,"")}%`);
  const {data,error}=await request.order("name").order("anncsu_progressivo_nazionale").limit(Math.min(Math.max(limit,1),100));
  if(error)throw new Error(error.message);return z.array(streetRow).parse(data).map(mapStreet);
}

export async function listZoneStreets(zoneId:string):Promise<CanonicalStreet[]>{
  if(!hasSupabaseEnvironment()){const zone=demoZones.find(item=>item.id===zoneId);return zone?searchStreetCatalog(zone.municipalityId).then(rows=>rows.filter(row=>zone.streetIds.includes(row.id))):[];}
  const db=await createClient();const {data:links,error}=await db.from("census_zone_streets").select("street_id").eq("census_zone_id",zoneId);
  if(error)throw new Error(error.message);const ids=z.array(z.object({street_id:z.string()})).parse(links).map(link=>link.street_id);
  if(!ids.length)return[];
  const {data,error:streetError}=await db.from("streets").select(streetSelect).in("id",ids).order("name");
  if(streetError)throw new Error(streetError.message);return z.array(streetRow).parse(data).map(mapStreet);
}

export async function listZoneAddressAccesses(zoneId:string,limit=100,offset=0):Promise<AddressAccess[]>{
  if(!hasSupabaseEnvironment()){const zone=demoZones.find(item=>item.id===zoneId);return zone?demoCivics.filter(c=>zone.streetIds.includes(c.streetId)).slice(offset,offset+limit).map(c=>({id:c.id,streetId:c.streetId,streetName:demoStreets.find(s=>s.id===c.streetId)?.name??"",sourceKind:"MANUAL",civic:c.number,exponent:c.extension,longitude:c.location?.longitude,latitude:c.location?.latitude,locationCrs:"EPSG:4326",locationSource:"OPERATOR"})):[];}
  const db=await createClient();const {data,error}=await db.rpc("zone_address_accesses_lab",{p_zone_id:zoneId,p_limit:limit,p_offset:offset});
  if(error)throw new Error(error.message);return z.array(accessRow).parse(data).map(mapAccess);
}

export async function getZoneAccessCounts(zoneId:string):Promise<ZoneAccessCounts>{
  if(!hasSupabaseEnvironment()){const zone=demoZones.find(item=>item.id===zoneId);const accesses=zone?demoCivics.filter(c=>zone.streetIds.includes(c.streetId)):[];const located=accesses.filter(c=>c.location).length;return{streetCount:zone?.streetIds.length??0,accessCount:accesses.length,locatedCount:located,unlocatedCount:accesses.length-located};}
  const db=await createClient();const {data,error}=await db.rpc("zone_access_counts_lab",{p_zone_id:zoneId});
  if(error)throw new Error(error.message);
  const parsed=z.array(z.object({street_count:z.union([z.string(),z.number()]),access_count:z.union([z.string(),z.number()]),located_count:z.union([z.string(),z.number()]),unlocated_count:z.union([z.string(),z.number()])})).parse(data);
  const row=parsed[0];return{streetCount:Number(row?.street_count??0),accessCount:Number(row?.access_count??0),locatedCount:Number(row?.located_count??0),unlocatedCount:Number(row?.unlocated_count??0)};
}
