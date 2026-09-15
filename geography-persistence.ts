import { cadastralAssociationSchema, civicLocationSchema } from "./schemas";

export type GeographyGateway = {
  saveCivicLocation(civicId: string, payload: Record<string, unknown>): Promise<void>;
  confirmCadastralAssociation(recordId: string, payload: Record<string, unknown>): Promise<void>;
};
export type GeographyResult = { ok: true } | { ok: false; error: string };

export async function persistCivicLocation(gateway: GeographyGateway, input: unknown): Promise<GeographyResult> {
  const parsed = civicLocationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Posizione non valida" };
  try {
    const { civicId, ...payload } = parsed.data; await gateway.saveCivicLocation(civicId, payload); return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Posizione non salvata" }; }
}

export async function persistCadastralAssociation(gateway: GeographyGateway, input: unknown): Promise<GeographyResult> {
  const parsed = cadastralAssociationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Particella non valida" };
  try {
    const { recordId, ...payload } = parsed.data; await gateway.confirmCadastralAssociation(recordId, payload); return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Associazione catastale non salvata" }; }
}
