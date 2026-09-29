import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, hasSupabaseEnvironment } from "@/lib/supabase/server";
import { civics as demoCivics } from "@/lib/demo-data";

const id = z.string().uuid();
export async function GET(request: NextRequest) {
  if (!hasSupabaseEnvironment()) {
    const streetId=request.nextUrl.searchParams.get("streetId")??"";
    const needle=(request.nextUrl.searchParams.get("q")??"").trim().toLocaleLowerCase("it");
    const page=Math.min(Math.max(Number(request.nextUrl.searchParams.get("page")??1)||1,1),10000);
    const limit=40;
    const matching=demoCivics.filter(item=>item.streetId===streetId&&`${item.number}${item.extension?`/${item.extension}`:""}`.toLocaleLowerCase("it").includes(needle));
    const offset=(page-1)*limit;
    return NextResponse.json({accesses:matching.slice(offset,offset+limit).map(item=>({id:item.id,streetId:item.streetId,number:item.number,extension:item.extension,geocodingStatus:item.geocodingStatus})),hasMore:matching.length>offset+limit});
  }
  const streetId = id.safeParse(request.nextUrl.searchParams.get("streetId"));
  if (!streetId.success) return NextResponse.json({ error: "streetId non valido" }, { status: 400 });
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length > 40) return NextResponse.json({ error: "Ricerca troppo lunga" }, { status: 400 });
  const db = await createClient();
  const zoneId=request.nextUrl.searchParams.get("zoneId");
  if(zoneId){
    if(!id.safeParse(zoneId).success)return NextResponse.json({error:"Zona non valida"},{status:400});
    const {data:link,error:linkError}=await db.from("census_zone_streets").select("street_id")
      .eq("census_zone_id",zoneId).eq("street_id",streetId.data).maybeSingle();
    if(linkError||!link)return NextResponse.json({error:"Via non associata alla Zona"},{status:404});
  }
  const page=Math.min(Math.max(Number(request.nextUrl.searchParams.get("page")??1)||1,1),10000);
  const limit=zoneId?40:100;
  let query = db.from("address_accesses").select("id,street_id,civic,exponent,metric,progressivo_snc")
    .eq("street_id", streetId.data).order("civic").order("exponent").range((page-1)*limit,page*limit);
  const needle=q.replace(/[^\p{L}\p{N}]+/gu,"%").replace(/^%|%$/g,"");
  const civicWithExtension=q.match(/^(\d+)\s*[/\- ]\s*([\p{L}\p{N}]+)$/u);
  if(civicWithExtension)query=query.ilike("civic",civicWithExtension[1]).ilike("exponent",civicWithExtension[2]);
  else if (needle) query = query.or(`civic.ilike.%${needle}%,metric.ilike.%${needle}%,progressivo_snc.ilike.%${needle}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Ricerca accessi non disponibile" }, { status: 500 });
  const {data:locations,error:locationError}=data?.length?await db.rpc("access_effective_locations_lab",{p_access_ids:data.map(row=>row.id)}):{data:[],error:null};
  if(locationError)return NextResponse.json({error:"Posizioni accessi non disponibili"},{status:500});
  const parsedLocations=z.array(z.object({address_access_id:z.string(),longitude:z.number(),latitude:z.number(),
    location_status:z.enum(["VERIFIED","AUTO_GEOLOCATED"]),location_source:z.string(),observed_at:z.string()})).parse(locations??[]);
  const byId=new Map(parsedLocations.map(location=>[location.address_access_id,location]));
  return NextResponse.json({ hasMore:(data??[]).length>limit, accesses: (data ?? []).slice(0,limit).map(row => {const location=byId.get(row.id);return ({ id: row.id, streetId: row.street_id,
    number: String(row.civic ?? row.metric ?? row.progressivo_snc ?? "SNC"),
    extension: row.exponent ?? undefined, geocodingStatus: location?.location_status??"NOT_GEOLOCATED",
    ...(location?{location:{longitude:location.longitude,latitude:location.latitude,source:location.location_source,geocodedAt:location.observed_at,verifiedAt:location.location_status==="VERIFIED"?location.observed_at:undefined}}:{}) });}) });
}
