"use server";

import { revalidatePath } from "next/cache";
import { createClient, hasSupabaseEnvironment } from "@/lib/supabase/server";
import { operationalSettingsSchema } from "./schemas";

export interface OperationalSettingsActionState { error?: string; success?: string }

export async function updateOperationalSettingsAction(
  _state: OperationalSettingsActionState,
  data: FormData,
): Promise<OperationalSettingsActionState> {
  if (!hasSupabaseEnvironment()) return { error: "Modalità demo: l'impostazione è disponibile in sola lettura." };
  const parsed = operationalSettingsSchema.safeParse({ staleNewsDays: data.get("staleNewsDays") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Valore non valido" };
  const db = await createClient();
  const { error } = await db.from("census_operational_settings").update({ stale_news_days: parsed.data.staleNewsDays }).eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/censimento/contatti");
  revalidatePath("/censimento/contatti/[recordId]", "page");
  revalidatePath("/censimento/impostazioni");
  return { success: "Soglia operativa aggiornata." };
}
