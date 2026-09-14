import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ComplexPhotoManager } from "@/features/complex-photos/complex-photo-manager";

const actions = vi.hoisted(() => ({
  addManualDoorbellProposalAction: vi.fn(), analyzeDoorbellPhotoAction: vi.fn(), confirmDoorbellProposalsAction: vi.fn(), createAcquisitionSessionAction: vi.fn(), deleteComplexPhotoAction: vi.fn(), mergeDoorbellProposalsAction: vi.fn(), registerComplexPhotoAction: vi.fn(), saveDoorbellProposalAction: vi.fn(), splitDoorbellProposalAction: vi.fn(), updateComplexPhotoAction: vi.fn(),
}));
vi.mock("@/features/complex-photos/actions", () => actions);

describe("complex photo manager", () => {
  beforeEach(() => { vi.clearAllMocks(); actions.saveDoorbellProposalAction.mockResolvedValue({ ok: true }); });

  it("keeps building photos separate from explicit doorbell analysis", () => {
    render(<ComplexPhotoManager complexId="00000000-0000-0000-0000-000000000001" databaseMode ocrConfigured={false} civics={[]} operators={[]} proposals={[]} photos={[{ id:"00000000-0000-0000-0000-000000000002",complexId:"00000000-0000-0000-0000-000000000001",photoType:"COMPLEX",storagePath:"x",originalFilename:"facciata.jpg",mimeType:"image/jpeg",byteSize:100,sortOrder:0,isPrimary:false,processingStatus:"UPLOADED",uploadedAt:"2026-09-11" },{ id:"00000000-0000-0000-0000-000000000003",complexId:"00000000-0000-0000-0000-000000000001",sessionId:"00000000-0000-0000-0000-000000000004",photoType:"DOORBELL",storagePath:"y",originalFilename:"citofono.jpg",mimeType:"image/jpeg",byteSize:100,sortOrder:0,isPrimary:false,processingStatus:"UPLOADED",uploadedAt:"2026-09-11" }]}/>);
    expect(screen.getByText("Foto del complesso")).toBeInTheDocument();
    expect(screen.getByText("Foto campanelli / citofoni")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analizza foto" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Aggiungi manualmente" })).toBeEnabled();
    expect(screen.getAllByText(/Nessun OCR automatico/)).toHaveLength(1);
  });

  it("edits, saves and discards OCR proposals without requiring contact fields for discard", async () => {
    const user = userEvent.setup();
    const proposal = { id:"00000000-0000-0000-0000-000000000005",sessionId:"00000000-0000-0000-0000-000000000004",photoId:"00000000-0000-0000-0000-000000000003",sourceText:"Mario Rossi",subjectType:"PRIVATO" as const,firstName:"Mario",lastName:"Rossi",warnings:[],status:"DRAFT" as const,buildingScope:"Parte di edificio" as const,contactType:"Generico" as const,sourceDetectionIds:[] };
    render(<ComplexPhotoManager complexId="00000000-0000-0000-0000-000000000001" databaseMode ocrConfigured civics={[{id:"00000000-0000-0000-0000-000000000006",streetId:"00000000-0000-0000-0000-000000000007",number:"6"}]} operators={[]} proposals={[proposal]} photos={[]}/>);

    await user.selectOptions(screen.getByLabelText("Civico"), "00000000-0000-0000-0000-000000000006");
    await user.selectOptions(screen.getByLabelText("Piano"), "Terra");
    await user.selectOptions(screen.getByLabelText("Qualifica"), "Proprietario");
    await user.click(screen.getByRole("button", { name: "Salva correzione" }));
    await waitFor(() => expect(actions.saveDoorbellProposalAction).toHaveBeenLastCalledWith(expect.objectContaining({ civicId:"00000000-0000-0000-0000-000000000006", floorCode:"Terra", qualification:"Proprietario", status:"DRAFT" })));

    await user.click(screen.getByRole("button", { name: "Separa" }));
    await waitFor(() => expect(actions.splitDoorbellProposalAction).toHaveBeenCalledWith(proposal.id, "00000000-0000-0000-0000-000000000001"));

    await user.click(screen.getByRole("button", { name: "Scarta" }));
    await waitFor(() => expect(screen.queryByText("Mario Rossi")).not.toBeInTheDocument());
    expect(actions.saveDoorbellProposalAction).toHaveBeenLastCalledWith(expect.objectContaining({ status:"DISCARDED" }));
    expect(screen.getByText("Proposta scartata.")).toBeInTheDocument();
  });
});
