import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, hasSupabaseEnvironment } from "@/lib/supabase/server";

const id = z.string().uuid();
export async function GET(request: NextRequest) {
  if (!hasSupabaseEnvironment()) return NextResponse.json({ accesses: [] });
  const streetId = id.safeParse(request.nextUrl.searchParams.get("streetId"));
  if (!streetId.success) return NextResponse.json({ error: "streetId non valido" }, { status: 400 });
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length > 40) return NextResponse.json({ error: "Ricerca troppo lunga" }, { status: 400 });
  const db = await createClient();
  let query = db.from("address_accesses").select("id,street_id,civic,exponent,metric,progressivo_snc")
    .eq("street_id", streetId.data).order("civic").order("exponent").limit(100);
  const needle=q.replace(/[^\p{L}\p{N}]+/gu,"%").replace(/^%|%$/g,"");
  if (needle) query = query.or(`civic.ilike.%${needle}%,metric.ilike.%${needle}%,progressivo_snc.ilike.%${needle}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Ricerca accessi non disponibile" }, { status: 500 });
  const {data:locations,error:locationError}=data?.length?await db.rpc("access_effective_locations_lab",{p_access_ids:data.map(row=>row.id)}):{data:[],error:null};
  if(locationError)return NextResponse.json({error:"Posizioni accessi non disponibili"},{status:500});
  const parsedLocations=z.array(z.object({address_access_id:z.string(),longitude:z.number(),latitude:z.number(),
    location_status:z.enum(["VERIFIED","AUTO_GEOLOCATED"]),location_source:z.string(),observed_at:z.string()})).parse(locations??[]);
  const byId=new Map(parsedLocations.map(location=>[location.address_access_id,location]));
  return NextResponse.json({ accesses: (data ?? []).map(row => {const location=byId.get(row.id);return ({ id: row.id, streetId: row.street_id,
    number: String(row.civic ?? row.metric ?? row.progressivo_snc ?? "SNC"),
    extension: row.exponent ?? undefined, geocodingStatus: location?.location_status??"NOT_GEOLOCATED",
    ...(location?{location:{longitude:location.longitude,latitude:location.latitude,source:location.location_source,geocodedAt:location.observed_at,verifiedAt:location.location_status==="VERIFIED"?location.observed_at:undefined}}:{}) });}) });
}
