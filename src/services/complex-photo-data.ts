import { z } from "zod";
import { COMPLEX_PHOTO_BUCKET, type ComplexPhotoData, type DoorbellProposal } from "@/domain/complex-photos";
import { contactTypes, occupancies, qualifications } from "@/domain/census";
import { createClient, hasSupabaseEnvironment } from "@/lib/supabase/server";

const row = z.record(z.string(), z.unknown());
const rows = z.array(row);
const text = (value: unknown) => typeof value === "string" ? value : undefined;

export async function loadComplexPhotoData(complexId: string): Promise<ComplexPhotoData> {
  if (!hasSupabaseEnvironment()) return { photos: [], proposals: [], ocrConfigured: Boolean(process.env.DOORBELL_OCR_SERVICE_URL), databaseMode: false };
  const db = await createClient();
  const { data: photoData, error: photoError } = await db.from("complex_photos").select("id,complex_id,acquisition_session_id,photo_type,storage_path,original_filename,mime_type,byte_size,caption,sort_order,is_primary,processing_status,processing_error_message,uploaded_at").eq("complex_id", complexId).is("deleted_at", null).order("sort_order").order("uploaded_at");
  if (photoError) throw new Error(photoError.message);
  const photoRows = rows.parse(photoData);
  const photos = await Promise.all(photoRows.map(async (photo) => {
    const { data } = await db.storage.from(COMPLEX_PHOTO_BUCKET).createSignedUrl(String(photo.storage_path), 600);
    return { id: String(photo.id), complexId: String(photo.complex_id), sessionId: text(photo.acquisition_session_id), photoType: photo.photo_type === "DOORBELL" ? "DOORBELL" as const : "COMPLEX" as const, storagePath: String(photo.storage_path), originalFilename: String(photo.original_filename), mimeType: String(photo.mime_type), byteSize: Number(photo.byte_size), caption: text(photo.caption), sortOrder: Number(photo.sort_order), isPrimary: Boolean(photo.is_primary), processingStatus: ["PROCESSING","PROCESSED","NEEDS_REVIEW","FAILED"].includes(String(photo.processing_status)) ? photo.processing_status as "PROCESSING"|"PROCESSED"|"NEEDS_REVIEW"|"FAILED" : "UPLOADED" as const, uploadedAt: String(photo.uploaded_at), signedUrl: data?.signedUrl, processingError: text(photo.processing_error_message) };
  }));
  if (!photoRows.length) return { photos, proposals: [], ocrConfigured: Boolean(process.env.DOORBELL_OCR_SERVICE_URL), databaseMode: true };
  const photoIds = photoRows.map((photo) => String(photo.id));
  const { data: proposalData, error: proposalError } = await db.from("doorbell_contact_proposals").select("id,acquisition_session_id,photo_id,source_text,subject_type,first_name,last_name,company_name,confidence,warnings,status,existing_subject_id,civic_id,building_scope,staircase,unit_identifier,floor_code,total_floors,qualification,occupancy,contact_type,responsible_operator_id,census_record_id,doorbell_proposal_sources(detection_id)").in("photo_id", photoIds).order("created_at");
  if (proposalError) throw new Error(proposalError.message);
  const proposals = rows.parse(proposalData).map<DoorbellProposal>((proposal) => ({
    id: String(proposal.id), sessionId: String(proposal.acquisition_session_id), photoId: String(proposal.photo_id), sourceText: String(proposal.source_text),
    subjectType: proposal.subject_type === "AZIENDA" ? "AZIENDA" : proposal.subject_type === "PRIVATO" ? "PRIVATO" : "UNKNOWN",
    firstName: text(proposal.first_name), lastName: text(proposal.last_name), companyName: text(proposal.company_name), confidence: proposal.confidence == null ? undefined : Number(proposal.confidence),
    warnings: Array.isArray(proposal.warnings) ? proposal.warnings.map((warning) => typeof warning === "string" ? warning : String(row.parse(warning).code ?? "DA_VERIFICARE")) : [],
    status: proposal.status === "CREATED" ? "CREATED" : proposal.status === "DISCARDED" ? "DISCARDED" : "DRAFT", existingSubjectId: text(proposal.existing_subject_id), civicId: text(proposal.civic_id),
    buildingScope: proposal.building_scope === "Intero edificio" ? "Intero edificio" : "Parte di edificio", staircase: text(proposal.staircase), unitIdentifier: text(proposal.unit_identifier), floorCode: text(proposal.floor_code), totalFloors: proposal.total_floors == null ? undefined : Number(proposal.total_floors),
    qualification: qualifications.find((value) => value === proposal.qualification), occupancy: occupancies.find((value) => value === proposal.occupancy), contactType: contactTypes.find((value) => value === proposal.contact_type) ?? "Generico", responsibleOperatorId: text(proposal.responsible_operator_id), censusRecordId: text(proposal.census_record_id),
    sourceDetectionIds: Array.isArray(proposal.doorbell_proposal_sources) ? proposal.doorbell_proposal_sources.map((source) => String(row.parse(source).detection_id)) : [],
  }));
  return { photos, proposals, ocrConfigured: Boolean(process.env.DOORBELL_OCR_SERVICE_URL), databaseMode: true };
}
