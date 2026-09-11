import { censusRecordSchema } from "@/features/census/schemas";

export interface CensusRecordGateway {
  createRecord(record: Record<string, unknown>): Promise<string>;
}

export type SaveRecordResult = { ok: true; id: string } | { ok: false; error: string };

export async function saveCensusRecord(
  gateway: CensusRecordGateway,
  recordInput: unknown,
): Promise<SaveRecordResult> {
  const parsedRecord = censusRecordSchema.safeParse(recordInput);
  if (!parsedRecord.success) return { ok: false, error: parsedRecord.error.issues[0]?.message ?? "Dati contatto non validi" };

  try {
    return { ok: true, id: await gateway.createRecord(parsedRecord.data) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Salvataggio non riuscito";
    const duplicate = message.includes("identical census record") || message.includes("census_records_significant_duplicate_uidx") || message.includes("duplicate key value");
    return { ok: false, error: duplicate ? "Esiste già un record identico per questo contatto e questa posizione." : message };
  }
}
