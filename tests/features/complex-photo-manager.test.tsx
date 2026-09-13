import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComplexPhotoManager } from "@/features/complex-photos/complex-photo-manager";

describe("complex photo manager", () => {
  it("keeps building photos separate from explicit doorbell analysis", () => {
    render(<ComplexPhotoManager complexId="00000000-0000-0000-0000-000000000001" databaseMode ocrConfigured={false} civics={[]} operators={[]} proposals={[]} photos={[{ id:"00000000-0000-0000-0000-000000000002",complexId:"00000000-0000-0000-0000-000000000001",photoType:"COMPLEX",storagePath:"x",originalFilename:"facciata.jpg",mimeType:"image/jpeg",byteSize:100,sortOrder:0,isPrimary:false,processingStatus:"UPLOADED",uploadedAt:"2026-09-11" },{ id:"00000000-0000-0000-0000-000000000003",complexId:"00000000-0000-0000-0000-000000000001",sessionId:"00000000-0000-0000-0000-000000000004",photoType:"DOORBELL",storagePath:"y",originalFilename:"citofono.jpg",mimeType:"image/jpeg",byteSize:100,sortOrder:0,isPrimary:false,processingStatus:"UPLOADED",uploadedAt:"2026-09-11" }]}/>);
    expect(screen.getByText("Foto del complesso")).toBeInTheDocument();
    expect(screen.getByText("Foto campanelli / citofoni")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analizza foto" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Aggiungi manualmente" })).toBeEnabled();
    expect(screen.getAllByText(/Nessun OCR automatico/)).toHaveLength(1);
  });
});
