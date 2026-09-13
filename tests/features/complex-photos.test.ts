import { describe, expect, it } from "vitest";
import { duplicateProposalIds, type DoorbellProposal } from "@/domain/complex-photos";
import { doorbellRecognitionResultSchema } from "@/services/doorbell-text-recognition-provider";

const proposal = (id: string, photoId: string, lastName: string): DoorbellProposal => ({ id, photoId, sessionId: "session", sourceText: lastName, subjectType: "PRIVATO", lastName, warnings: [], status: "DRAFT", buildingScope: "Parte di edificio", contactType: "Generico", sourceDetectionIds: [] });

describe("doorbell recognition contracts", () => {
  it("accepts five structured proposals without creating domain contacts", () => {
    const result = doorbellRecognitionResultSchema.parse({ schemaVersion: "1", rawText: "ROSSI MARIO\nBIANCHI ANNA\nSTUDIO VERDI SRL\nNERI LUCA\nCONTI PAOLA", warnings: [], proposals: [
      { sourceText: "ROSSI MARIO", proposedFirstName: "Mario", proposedLastName: "Rossi", proposedSubjectType: "PERSON", confidence: .96, warnings: [] },
      { sourceText: "BIANCHI ANNA", proposedFirstName: "Anna", proposedLastName: "Bianchi", proposedSubjectType: "PERSON", confidence: .91, warnings: [] },
      { sourceText: "STUDIO VERDI SRL", proposedCompanyName: "Studio Verdi SRL", proposedSubjectType: "COMPANY", confidence: .87, warnings: [] },
      { sourceText: "NERI LUCA", proposedFirstName: "Luca", proposedLastName: "Neri", proposedSubjectType: "PERSON", confidence: .82, warnings: [] },
      { sourceText: "CONTI PAOLA", proposedFirstName: "Paola", proposedLastName: "Conti", proposedSubjectType: "PERSON", confidence: .79, warnings: [] },
    ] });
    expect(result.proposals).toHaveLength(5);
    expect(result.proposals.some((item) => item.proposedSubjectType === "COMPANY")).toBe(true);
    expect(result).not.toHaveProperty("contacts");
  });

  it("rejects invalid confidence and preserves UNKNOWN instead of inventing data", () => {
    expect(doorbellRecognitionResultSchema.safeParse({ schemaVersion: "1", rawText: "Fam. Rossi", warnings: [], proposals: [{ sourceText: "Fam. Rossi", proposedSubjectType: "UNKNOWN", confidence: 1.2, warnings: [] }] }).success).toBe(false);
    const ambiguous = doorbellRecognitionResultSchema.parse({ schemaVersion: "1", rawText: "Fam. Rossi", warnings: [], proposals: [{ sourceText: "Fam. Rossi", proposedSubjectType: "UNKNOWN", warnings: [{ code: "AMBIGUOUS_SUBJECT_TYPE" }] }] });
    expect(ambiguous.proposals[0]).not.toHaveProperty("proposedFirstName");
  });

  it("flags the same normalized name across photos only inside one acquisition session", () => {
    const duplicates = duplicateProposalIds([proposal("one","photo-1","Rossi"), proposal("two","photo-2"," ROSSI "), { ...proposal("three","photo-3","Rossi"), sessionId: "other" }]);
    expect([...duplicates]).toEqual(expect.arrayContaining(["one","two"]));
    expect(duplicates.has("three")).toBe(false);
  });
});
