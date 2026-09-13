import type { BuildingScope, ContactType, Occupancy, Qualification, SubjectType } from "./census";

export const COMPLEX_PHOTO_BUCKET = "complex-photos";
export const complexPhotoTypes = ["COMPLEX", "DOORBELL"] as const;
export const complexPhotoStatuses = ["UPLOADED", "PROCESSING", "PROCESSED", "NEEDS_REVIEW", "FAILED"] as const;
export type ComplexPhotoType = (typeof complexPhotoTypes)[number];
export type ComplexPhotoStatus = (typeof complexPhotoStatuses)[number];

export interface ComplexPhoto {
  id: string;
  complexId: string;
  sessionId?: string;
  photoType: ComplexPhotoType;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  caption?: string;
  sortOrder: number;
  isPrimary: boolean;
  processingStatus: ComplexPhotoStatus;
  uploadedAt: string;
  signedUrl?: string;
  processingError?: string;
}

export interface DoorbellProposal {
  id: string;
  sessionId: string;
  photoId: string;
  sourceText: string;
  subjectType: SubjectType | "UNKNOWN";
  firstName?: string;
  lastName?: string;
  companyName?: string;
  confidence?: number;
  warnings: string[];
  status: "DRAFT" | "DISCARDED" | "CREATED";
  existingSubjectId?: string;
  civicId?: string;
  buildingScope: BuildingScope;
  staircase?: string;
  unitIdentifier?: string;
  floorCode?: string;
  totalFloors?: number;
  qualification?: Qualification;
  occupancy?: Occupancy;
  contactType: ContactType;
  responsibleOperatorId?: string;
  censusRecordId?: string;
  sourceDetectionIds: string[];
}

export interface ComplexPhotoData {
  photos: ComplexPhoto[];
  proposals: DoorbellProposal[];
  ocrConfigured: boolean;
  databaseMode: boolean;
}

export function normalizedProposalIdentity(proposal: Pick<DoorbellProposal, "subjectType" | "firstName" | "lastName" | "companyName">): string {
  const value = proposal.subjectType === "AZIENDA" ? proposal.companyName ?? "" : `${proposal.lastName ?? ""} ${proposal.firstName ?? ""}`;
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("it");
}

export function duplicateProposalIds(proposals: DoorbellProposal[]): Set<string> {
  const groups = new Map<string, string[]>();
  for (const proposal of proposals.filter((item) => item.status === "DRAFT")) {
    const key = `${proposal.sessionId}:${normalizedProposalIdentity(proposal)}`;
    if (key.endsWith(":")) continue;
    groups.set(key, [...(groups.get(key) ?? []), proposal.id]);
  }
  return new Set([...groups.values()].filter((ids) => ids.length > 1).flat());
}
