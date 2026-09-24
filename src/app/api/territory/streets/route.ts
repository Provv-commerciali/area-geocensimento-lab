import { z } from "zod";
import { searchStreetCatalog } from "@/repositories/territory-repository";

const municipalityIdSchema = z.string().trim().min(1).max(100);

export async function GET(request: Request) {
  const parsed = municipalityIdSchema.safeParse(new URL(request.url).searchParams.get("municipalityId"));
  if (!parsed.success) return Response.json({ error: "Comune non valido" }, { status: 400 });
  try {
    const params=new URL(request.url).searchParams;
    return Response.json(
      { streets: await searchStreetCatalog(parsed.data,params.get("q")??"",params.get("locality")??"") },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch {
    return Response.json({ error: "Vie temporaneamente non disponibili" }, { status: 502 });
  }
}
