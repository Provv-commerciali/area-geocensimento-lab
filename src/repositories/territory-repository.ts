import { z } from "zod";
import { createClient, hasSupabaseEnvironment } from "@/lib/supabase/server";
import { streets as demoStreets, civics as demoCivics, zones as demoZones, records as demoRecords } from "@/lib/demo-data";
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

export async function searchStreetCatalog(municipalityId:string,query="",locality="",limit=100,offset=0):Promise<CanonicalStreet[]> {
  if(!hasSupabaseEnvironment())return demoStreets.filter(street=>street.municipalityId===municipalityId&&street.name.toLocaleLowerCase("it").includes(query.toLocaleLowerCase("it"))).slice(0,limit).map(street=>({id:street.id,municipalityId:street.municipalityId,name:street.name,totalAccesses:demoCivics.filter(c=>c.streetId===street.id).length,sourceKind:"MANUAL",isPresentInLatestSnapshot:false,manualReviewState:"PROPOSED"}));
  const db=await createClient();
  let request=db.from("streets").select(streetSelect).eq("municipality_id",municipalityId)
    .eq("source_kind","OFFICIAL_ANNCSU").eq("is_present_in_latest_snapshot",true);
  if(query.trim())request=request.ilike("name",`%${query.trim().replace(/[%,_]/g,"")}%`);
  if(locality.trim())request=request.ilike("locality_name",`%${locality.trim().replace(/[%,_]/g,"")}%`);
  const size=Math.min(Math.max(limit,1),100), start=Math.max(offset,0);
  const {data,error}=await request.order("name").order("anncsu_progressivo_nazionale").range(start,start+size-1);
  if(error)throw new Error(error.message);return z.array(streetRow).parse(data).map(mapStreet);
}

export async function listLocalityCatalog(municipalityId:string,query="",limit=100):Promise<{id:string;name:string}[]> {
  if(!hasSupabaseEnvironment())return [];
  const db=await createClient();let request=db.from("localities").select("id,display_name").eq("municipality_id",municipalityId);
  if(query.trim())request=request.ilike("display_name",`%${query.trim().replace(/[%,_]/g,"")}%`);
  const {data,error}=await request.order("display_name").limit(Math.min(Math.max(limit,1),100));
  if(error)throw new Error(error.message);
  return z.array(z.object({id:z.string(),display_name:z.string()})).parse(data).map(row=>({id:row.id,name:row.display_name}));
}

export async function listStreetAddressAccesses(streetId:string,limit=200):Promise<AddressAccess[]> {
  if(!hasSupabaseEnvironment())return [];
  const db=await createClient();const {data,error}=await db.from("address_accesses")
    .select("id,street_id,source_kind,anncsu_progressivo_accesso,civic,exponent,specificity,metric,progressivo_snc")
    .eq("street_id",streetId).order("anncsu_progressivo_accesso").limit(Math.min(Math.max(limit,1),200));
  if(error)throw new Error(error.message);
  return z.array(accessRow.omit({street_name:true})).parse(data).map(row=>mapAccess({...row,street_name:""}));
}

const accessPageRow=accessRow.omit({street_name:true}).extend({total_count:z.union([z.number(),z.string()])});
export async function getStreetAddressAccess(accessId:string):Promise<AddressAccess|undefined>{
  if(!hasSupabaseEnvironment())return undefined;
  const db=await createClient();const {data,error}=await db.from("address_accesses")
    .select("id,street_id,source_kind,anncsu_progressivo_accesso,civic,exponent,specificity,metric,progressivo_snc")
    .eq("id",accessId).maybeSingle();
  if(error)throw new Error(error.message);return data?mapAccess({...accessRow.omit({street_name:true}).parse(data),street_name:""}):undefined;
}
export interface StreetAccessPageOptions {
  zoneId:string;streetId:string;search?:string;candidateIds?:string[];searchContactIds?:string[];
  sort?:string;page?:number;pageSize?:number;
  civicFrom?:number;civicTo?:number;
}
export async function pageStreetAddressAccesses(options:StreetAccessPageOptions):Promise<{accesses:AddressAccess[];total:number}>{
  if(!hasSupabaseEnvironment())return {accesses:[],total:0};
  const db=await createClient();const pageSize=Math.min(Math.max(options.pageSize??40,1),100);
  const {data,error}=await db.rpc("street_access_page_lab",{
    p_zone_id:options.zoneId,p_street_id:options.streetId,p_search:options.search??"",
    p_candidate_ids:options.candidateIds??null,p_search_contact_ids:options.searchContactIds??[],
    p_sort:options.sort??"civic_asc",p_limit:pageSize,p_offset:(Math.max(options.page??1,1)-1)*pageSize,
    p_civic_from:options.civicFrom??null,p_civic_to:options.civicTo??null,
  });
  if(error)throw new Error(error.message);
  const parsed=z.array(accessPageRow).parse(data);
  return {accesses:parsed.map(row=>mapAccess({...row,street_name:""})),total:Number(parsed[0]?.total_count??0)};
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

export async function getZoneStreet(zoneId:string,streetId:string):Promise<CanonicalStreet|undefined>{
  if(!hasSupabaseEnvironment())return (await listZoneStreets(zoneId)).find(street=>street.id===streetId);
  const db=await createClient();const {data:link,error:linkError}=await db.from("census_zone_streets")
    .select("street_id").eq("census_zone_id",zoneId).eq("street_id",streetId).maybeSingle();
  if(linkError)throw new Error(linkError.message);if(!link)return undefined;
  const {data,error}=await db.from("streets").select(streetSelect).eq("id",streetId).maybeSingle();
  if(error)throw new Error(error.message);return data?mapStreet(data):undefined;
}

export async function pageZoneStreets(zoneId:string,search="",page=1,pageSize=30):Promise<{streets:CanonicalStreet[];total:number}>{
  if(!hasSupabaseEnvironment()){const streets=await listZoneStreets(zoneId);const needle=search.toLocaleLowerCase("it");const filtered=streets.filter(street=>[street.name,street.localityName,...demoCivics.filter(civic=>civic.streetId===street.id).map(civic=>`${civic.number}/${civic.extension??""}`),...demoRecords.filter(record=>record.zoneId===zoneId&&record.streetId===street.id).map(record=>`${record.lastName} ${record.firstName} ${record.phone??""}`)].join(" ").toLocaleLowerCase("it").includes(needle));return {streets:filtered.slice((page-1)*pageSize,page*pageSize),total:filtered.length};}
  const db=await createClient();const {data,error}=await db.rpc("zone_street_page_lab",{p_zone_id:zoneId,p_search:search.trim().replace(/[%,_]/g,"").slice(0,100),p_limit:Math.min(Math.max(pageSize,1),100),p_offset:(Math.max(page,1)-1)*pageSize});
  if(error)throw new Error(error.message);
  const parsed=z.array(streetRow.extend({total_count:z.union([z.number(),z.string()])})).parse(data);
  return {streets:parsed.map(mapStreet),total:Number(parsed[0]?.total_count??0)};
}

export interface ZoneOverview {zoneId:string;streetCount:number;accessCount:number;recordCount:number}
export async function listZoneOverview(search=""):Promise<ZoneOverview[]>{
  if(!hasSupabaseEnvironment())return demoZones.filter(zone=>!search||[zone.name,zone.municipality,zone.operator.name,...demoStreets.filter(street=>zone.streetIds.includes(street.id)).map(street=>street.name),...demoCivics.filter(civic=>zone.streetIds.includes(civic.streetId)).map(civic=>`${civic.number}/${civic.extension??""}`)].join(" ").toLocaleLowerCase("it").includes(search.toLocaleLowerCase("it"))).map(zone=>({zoneId:zone.id,streetCount:zone.streetIds.length,accessCount:demoCivics.filter(civic=>zone.streetIds.includes(civic.streetId)).length,recordCount:demoRecords.filter(record=>record.zoneId===zone.id).length}));
  const db=await createClient();const {data,error}=await db.rpc("zone_overview_lab",{p_search:search.trim().replace(/[%,_]/g,"").slice(0,100)});
  if(error)throw new Error(error.message);
  return z.array(z.object({zone_id:z.string(),street_count:z.union([z.number(),z.string()]),access_count:z.union([z.number(),z.string()]),record_count:z.union([z.number(),z.string()])})).parse(data).map(row=>({zoneId:row.zone_id,streetCount:Number(row.street_count),accessCount:Number(row.access_count),recordCount:Number(row.record_count)}));
}
