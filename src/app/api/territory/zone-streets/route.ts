import { z } from "zod";
import { pageZoneStreets } from "@/repositories/territory-repository";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";

export async function GET(request:Request){
  const params=new URL(request.url).searchParams;
  const parsed=z.object({zoneId:z.string().min(1).max(100),q:z.string().max(100),page:z.coerce.number().int().min(1).max(10000)}).safeParse({
    zoneId:params.get("zoneId"),q:params.get("q")??"",page:params.get("page")??1,
  });
  if(!parsed.success)return Response.json({error:"Ricerca non valida"},{status:400});
  if(hasSupabaseEnvironment()&&!z.string().uuid().safeParse(parsed.data.zoneId).success)return Response.json({error:"Zona non valida"},{status:400});
  try{
    const {streets,total}=await pageZoneStreets(parsed.data.zoneId,parsed.data.q,parsed.data.page,30);
    return Response.json({streets,total});
  }catch{return Response.json({error:"Vie della Zona non disponibili"},{status:502})}
}
