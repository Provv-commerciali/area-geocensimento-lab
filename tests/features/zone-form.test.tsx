import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ZoneForm } from "@/features/zones/zone-form";

describe("New Zone territorial selects", () => {
  it("cascades database-backed country, region, province and municipality choices", async () => {
    const user = userEvent.setup();
    render(<ZoneForm
      databaseMode
      countries={[{ id: "it", code: "IT", name: "Italia" }]}
      regions={[
        { id: "tos", countryId: "it", name: "Toscana", istatCode: "09" },
        { id: "laz", countryId: "it", name: "Lazio", istatCode: "12" },
      ]}
      provinces={[
        { id: "lu", regionId: "tos", name: "Lucca", istatCode: "046" },
        { id: "rm", regionId: "laz", name: "Roma", istatCode: "258" },
      ]}
      municipalities={[
        { id: "cam", provinceId: "lu", name: "Camaiore", istatCode: "046005" },
        { id: "rom", provinceId: "rm", name: "Roma", istatCode: "058091" },
      ]}
      operators={[{ id: "op", name: "Elena Rossi" }]}
      streets={[]}
    />);

    await user.selectOptions(screen.getByLabelText("Nazione *"), "it");
    expect(screen.getByLabelText("Regione *")).toHaveTextContent("Toscana");
    await user.selectOptions(screen.getByLabelText("Regione *"), "tos");
    expect(screen.getByLabelText("Provincia *")).toHaveTextContent("Lucca");
    expect(screen.getByLabelText("Provincia *")).not.toHaveTextContent("Roma");
    await user.selectOptions(screen.getByLabelText("Provincia *"), "lu");
    expect(screen.getByLabelText("Comune *")).toHaveTextContent("Camaiore");
    expect(screen.getByLabelText("Comune *")).not.toHaveTextContent(/^Roma$/);
  });
});
