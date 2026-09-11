import { z } from "zod";
import { censusRepository } from "@/services/census-data";

const municipalityIdSchema = z.string().trim().min(1).max(100);

export async function GET(request: Request) {
  const parsed = municipalityIdSchema.safeParse(new URL(request.url).searchParams.get("municipalityId"));
  if (!parsed.success) return Response.json({ error: "Comune non valido" }, { status: 400 });
  try {
    return Response.json(
      { streets: await censusRepository().listStreets(parsed.data) },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch {
    return Response.json({ error: "Vie temporaneamente non disponibili" }, { status: 502 });
  }
}
