import { z } from "zod";
import { listLocalityCatalog } from "@/repositories/territory-repository";

const municipalityIdSchema=z.string().trim().min(1).max(100);

export async function GET(request:Request){
  const params=new URL(request.url).searchParams;
  const municipalityId=municipalityIdSchema.safeParse(params.get("municipalityId"));
  if(!municipalityId.success)return Response.json({error:"Comune non valido"},{status:400});
  try{return Response.json({localities:await listLocalityCatalog(municipalityId.data,params.get("q")??"")},{headers:{"Cache-Control":"private, max-age=300"}})}
  catch{return Response.json({error:"Aree/località temporaneamente non disponibili"},{status:502})}
}
