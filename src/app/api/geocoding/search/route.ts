import { z } from "zod";
import { NominatimGeocodingProvider } from "@/services/geocoding-provider";

const querySchema = z.string().trim().min(3).max(180);
export async function GET(request: Request) {
  const parsed = querySchema.safeParse(new URL(request.url).searchParams.get("q"));
  if (!parsed.success) return Response.json({ error: "Ricerca non valida" }, { status: 400 });
  try { return Response.json({ results: await new NominatimGeocodingProvider().search(parsed.data) }, { headers: { "Cache-Control": "private, max-age=300" } }); }
  catch { return Response.json({ error: "Provider di geocoding temporaneamente non disponibile" }, { status: 502 }); }
}
