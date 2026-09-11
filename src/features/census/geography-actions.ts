"use server";

import { revalidatePath } from "next/cache";
import { createClient, hasSupabaseEnvironment } from "@/lib/supabase/server";
import { persistCadastralAssociation, persistCivicLocation, type GeographyGateway, type GeographyResult } from "./geography-persistence";

async function gateway(): Promise<GeographyGateway> {
  const db = await createClient();
  return {
    async saveCivicLocation(civicId, payload) { const { error } = await db.rpc("save_civic_location_lab", { p_civic_id: civicId, p_location: payload }); if (error) throw new Error(error.message); },
    async confirmCadastralAssociation(recordId, payload) { const { error } = await db.rpc("confirm_cadastral_association_lab", { p_record_id: recordId, p_feature: payload }); if (error) throw new Error(error.message); },
  };
}

export async function saveCivicLocationAction(input: unknown): Promise<GeographyResult> {
  if (!hasSupabaseEnvironment()) return { ok: false, error: "Database LAB non configurato" };
  const result = await persistCivicLocation(await gateway(), input);
  if (result.ok) { revalidatePath("/geocensimento"); revalidatePath("/censimento/contatti"); }
  return result;
}

export async function confirmCadastralAssociationAction(input: unknown): Promise<GeographyResult> {
  if (!hasSupabaseEnvironment()) return { ok: false, error: "Database LAB non configurato" };
  const result = await persistCadastralAssociation(await gateway(), input);
  if (result.ok && typeof input === "object" && input && "recordId" in input) revalidatePath(`/censimento/contatti/${String(input.recordId)}`);
  return result;
}
