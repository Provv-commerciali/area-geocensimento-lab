import { z } from "zod";
import { censusRepository } from "@/services/census-data";

const querySchema = z.string().trim().min(2).max(100);

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(new URL(request.url).searchParams.get("q"));
  if (!parsed.success) return Response.json({ error: "Ricerca non valida" }, { status: 400 });
  try {
    return Response.json(
      { subjects: await censusRepository().searchSubjects(parsed.data) },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch {
    return Response.json({ error: "Anagrafiche temporaneamente non disponibili" }, { status: 502 });
  }
}
