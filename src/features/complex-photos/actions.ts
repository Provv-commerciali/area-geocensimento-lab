"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { COMPLEX_PHOTO_BUCKET, complexPhotoTypes } from "@/domain/complex-photos";
import { contactTypes, floorCodes, occupancies, qualifications } from "@/domain/census";
import { createClient, hasSupabaseEnvironment } from "@/lib/supabase/server";
import { doorbellRecognitionProvider, DoorbellRecognitionError } from "@/services/doorbell-text-recognition-provider";

const id = z.string().uuid();
const optionalText = z.string().trim().max(500).optional().or(z.literal(""));
async function authenticatedClient() {
  if (!hasSupabaseEnvironment()) throw new Error("Modalità demo: operazione non disponibile.");
  const db = await createClient(); const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Autenticazione richiesta.");
  return { db, user };
}
const refresh = (complexId: string) => revalidatePath(`/censimento/complessi/${complexId}`);

export async function createAcquisitionSessionAction(complexId: string) {
  id.parse(complexId); const { db } = await authenticatedClient();
  const { data, error } = await db.from("doorbell_acquisition_sessions").insert({ complex_id: complexId }).select("id").single();
  if (error) throw new Error(error.message); return String(data.id);
}

const registrationSchema = z.object({ id, complexId: id, sessionId: id.optional(), photoType: z.enum(complexPhotoTypes), storagePath: z.string().min(1), originalFilename: z.string().min(1).max(255), mimeType: z.enum(["image/jpeg","image/png","image/webp"]), byteSize: z.number().int().positive().max(10_485_760) });
export async function registerComplexPhotoAction(input: z.input<typeof registrationSchema>) {
  const value = registrationSchema.parse(input); const { db } = await authenticatedClient();
  const expectedExtension = value.mimeType === "image/jpeg" ? ".jpg" : value.mimeType === "image/png" ? ".png" : ".webp";
  if (value.storagePath !== `${value.complexId}/${value.id}${expectedExtension}`) throw new Error("Percorso Storage non valido.");
  const { error } = await db.from("complex_photos").insert({ id: value.id, complex_id: value.complexId, acquisition_session_id: value.photoType === "DOORBELL" ? value.sessionId : null, photo_type: value.photoType, storage_path: value.storagePath, original_filename: value.originalFilename, mime_type: value.mimeType, byte_size: value.byteSize });
  if (error) throw new Error(error.message); refresh(value.complexId);
}

export async function updateComplexPhotoAction(input: { photoId: string; complexId: string; caption?: string; sortOrder: number; isPrimary: boolean }) {
  const value = z.object({ photoId: id, complexId: id, caption: optionalText, sortOrder: z.number().int().min(0).max(10_000), isPrimary: z.boolean() }).parse(input); const { db } = await authenticatedClient();
  if (value.isPrimary) { const { error } = await db.from("complex_photos").update({ is_primary: false }).eq("complex_id", value.complexId); if (error) throw new Error(error.message); }
  const { error } = await db.from("complex_photos").update({ caption: value.caption || null, sort_order: value.sortOrder, is_primary: value.isPrimary }).eq("id", value.photoId).eq("complex_id", value.complexId);
  if (error) throw new Error(error.message); refresh(value.complexId);
}

export async function deleteComplexPhotoAction(photoId: string, complexId: string) {
  id.parse(photoId); id.parse(complexId); const { db, user } = await authenticatedClient();
  const { data, error } = await db.from("complex_photos").select("storage_path").eq("id", photoId).eq("complex_id", complexId).is("deleted_at", null).single(); if (error) throw new Error(error.message);
  const removed = await db.storage.from(COMPLEX_PHOTO_BUCKET).remove([String(data.storage_path)]); if (removed.error) throw new Error(removed.error.message);
  const updated = await db.from("complex_photos").update({ deleted_at: new Date().toISOString(), deleted_by: user.id, is_primary: false }).eq("id", photoId); if (updated.error) throw new Error(updated.error.message); refresh(complexId);
}

export async function analyzeDoorbellPhotoAction(photoId: string, complexId: string) {
  id.parse(photoId); id.parse(complexId); const provider = doorbellRecognitionProvider(); if (!provider) return { ok: false as const, error: "Provider OCR non configurato: la foto resta disponibile per la revisione manuale." };
  const { db } = await authenticatedClient(); const { data: photo, error } = await db.from("complex_photos").select("id,complex_id,storage_path,mime_type,original_filename").eq("id", photoId).eq("complex_id", complexId).eq("photo_type", "DOORBELL").is("deleted_at", null).single(); if (error) return { ok: false as const, error: error.message };
  const begun = await db.rpc("begin_doorbell_recognition_lab", { p_photo_id: photoId }); if (begun.error || typeof begun.data !== "string") return { ok: false as const, error: begun.error?.message ?? "Analisi non avviata." };
  try {
    const download = await db.storage.from(COMPLEX_PHOTO_BUCKET).download(String(photo.storage_path)); if (download.error) throw new Error(download.error.message);
    const result = await provider.recognize({ photoId, bytes: new Uint8Array(await download.data.arrayBuffer()), mimeType: String(photo.mime_type), originalFilename: String(photo.original_filename) });
    const saved = await db.rpc("record_doorbell_recognition_lab", { p_run_id: begun.data, p_result: result }); if (saved.error) throw new Error(saved.error.message); refresh(complexId); return { ok: true as const, count: Number(saved.data) };
  } catch (caught) {
    const safe = caught instanceof DoorbellRecognitionError ? caught : new DoorbellRecognitionError("UPSTREAM_UNAVAILABLE", "Analisi OCR non riuscita.", true);
    await db.rpc("fail_doorbell_recognition_lab", { p_run_id: begun.data, p_code: safe.code, p_message: safe.message }); refresh(complexId); return { ok: false as const, error: safe.message };
  }
}

export async function addManualDoorbellProposalAction(photoId: string, complexId: string) {
  id.parse(photoId); id.parse(complexId); const { db } = await authenticatedClient();
  const { data: photo, error } = await db.from("complex_photos").select("id,acquisition_session_id").eq("id", photoId).eq("complex_id", complexId).eq("photo_type", "DOORBELL").is("deleted_at", null).single(); if (error) throw new Error(error.message);
  const inserted = await db.from("doorbell_contact_proposals").insert({ acquisition_session_id: photo.acquisition_session_id, photo_id: photo.id, source_text: "Inserimento manuale", subject_type: "UNKNOWN", warnings: ["INSERIMENTO_MANUALE"] }); if (inserted.error) throw new Error(inserted.error.message); refresh(complexId);
}

const proposalSchema = z.object({ proposalId: id, complexId: id, subjectType: z.enum(["PRIVATO","AZIENDA","UNKNOWN"]), firstName: optionalText, lastName: optionalText, companyName: optionalText, existingSubjectId: id.optional().or(z.literal("")), civicId: id.optional().or(z.literal("")), buildingScope: z.enum(["Intero edificio","Parte di edificio"]), staircase: optionalText, unitIdentifier: optionalText, floorCode: z.enum(floorCodes).optional().or(z.literal("")), totalFloors: z.number().int().positive().optional(), qualification: z.enum(qualifications).optional().or(z.literal("")), occupancy: z.enum(occupancies).optional().or(z.literal("")), contactType: z.enum(contactTypes), responsibleOperatorId: id.optional().or(z.literal("")), status: z.enum(["DRAFT","DISCARDED"]) }).superRefine((value, context) => {
  if (value.status === "DISCARDED") return;
  if (value.subjectType === "PRIVATO" && !value.lastName) context.addIssue({ code: "custom", path: ["lastName"], message: "Cognome obbligatorio" });
  if (value.subjectType === "AZIENDA" && !value.companyName) context.addIssue({ code: "custom", path: ["companyName"], message: "Ragione sociale obbligatoria" });
  if (value.buildingScope === "Parte di edificio" && !value.floorCode) context.addIssue({ code: "custom", path: ["floorCode"], message: "Piano obbligatorio" });
});
export async function saveDoorbellProposalAction(input: z.input<typeof proposalSchema>) {
  const parsed = proposalSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dati proposta non validi." };
  try {
    const value = parsed.data; const { db, user } = await authenticatedClient();
    const payload = { subject_type: value.subjectType, first_name: value.subjectType === "PRIVATO" ? value.firstName || null : null, last_name: value.subjectType === "PRIVATO" ? value.lastName || null : null, company_name: value.subjectType === "AZIENDA" ? value.companyName || null : null, existing_subject_id: value.existingSubjectId || null, civic_id: value.civicId || null, building_scope: value.buildingScope, staircase: value.staircase || null, unit_identifier: value.unitIdentifier || null, floor_code: value.buildingScope === "Parte di edificio" ? value.floorCode || null : null, total_floors: value.totalFloors ?? null, qualification: value.qualification || null, occupancy: value.occupancy || null, contact_type: value.contactType, responsible_operator_id: value.responsibleOperatorId || null, status: value.status, reviewed_by: user.id, reviewed_at: new Date().toISOString() };
    const { error } = await db.from("doorbell_contact_proposals").update(payload).eq("id", value.proposalId);
    if (error) return { ok: false as const, error: error.message };
    refresh(value.complexId); return { ok: true as const };
  } catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "Operazione non riuscita." }; }
}

export async function splitDoorbellProposalAction(proposalId: string, complexId: string) {
  id.parse(proposalId); id.parse(complexId); const { db } = await authenticatedClient();
  const { data, error } = await db.from("doorbell_contact_proposals").select("acquisition_session_id,photo_id,source_text,subject_type,first_name,last_name,company_name,confidence,warnings,building_scope,contact_type").eq("id", proposalId).eq("status", "DRAFT").single(); if (error) throw new Error(error.message);
  const inserted = await db.from("doorbell_contact_proposals").insert(data).select("id").single(); if (inserted.error) throw new Error(inserted.error.message);
  const sources = await db.from("doorbell_proposal_sources").select("detection_id").eq("proposal_id", proposalId); if (sources.error) throw new Error(sources.error.message);
  if (sources.data.length) { const linked = await db.from("doorbell_proposal_sources").insert(sources.data.map((source) => ({ proposal_id: inserted.data.id, detection_id: source.detection_id }))); if (linked.error) throw new Error(linked.error.message); } refresh(complexId);
}

export async function mergeDoorbellProposalsAction(targetId: string, sourceId: string, complexId: string) {
  id.parse(targetId); id.parse(sourceId); id.parse(complexId); if (targetId === sourceId) throw new Error("Seleziona due proposte diverse."); const { db } = await authenticatedClient();
  const sources = await db.from("doorbell_proposal_sources").select("detection_id").eq("proposal_id", sourceId); if (sources.error) throw new Error(sources.error.message);
  if (sources.data.length) { const linked = await db.from("doorbell_proposal_sources").upsert(sources.data.map((source) => ({ proposal_id: targetId, detection_id: source.detection_id })), { onConflict: "proposal_id,detection_id" }); if (linked.error) throw new Error(linked.error.message); }
  const discarded = await db.from("doorbell_contact_proposals").update({ status: "DISCARDED" }).eq("id", sourceId).eq("status", "DRAFT"); if (discarded.error) throw new Error(discarded.error.message); refresh(complexId);
}

export async function confirmDoorbellProposalsAction(proposalIds: string[], complexId: string) {
  z.array(id).min(1).parse(proposalIds); id.parse(complexId); const { db } = await authenticatedClient();
  const result = await db.rpc("confirm_doorbell_proposals_lab", { p_proposal_ids: proposalIds }); if (result.error) return { ok: false as const, error: result.error.message }; refresh(complexId); revalidatePath("/censimento/contatti"); return { ok: true as const, ids: z.array(z.string()).parse(result.data) };
}
