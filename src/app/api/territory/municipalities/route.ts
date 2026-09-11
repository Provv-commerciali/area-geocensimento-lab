import { z } from "zod";
import { censusRepository } from "@/services/census-data";

const provinceIdSchema = z.string().trim().min(1).max(100);

export async function GET(request: Request) {
  const parsed = provinceIdSchema.safeParse(new URL(request.url).searchParams.get("provinceId"));
  if (!parsed.success) return Response.json({ error: "Provincia non valida" }, { status: 400 });
  try {
    return Response.json(
      { municipalities: await censusRepository().listMunicipalities(parsed.data) },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch {
    return Response.json({ error: "Comuni temporaneamente non disponibili" }, { status: 502 });
  }
}
