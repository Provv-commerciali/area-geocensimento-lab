import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StreetCatalogPicker } from "@/features/zones/street-catalog-picker";

const street={id:"street-1",municipalityId:"municipality",name:"LOCALITA' AI VENTI",localityName:"Corsanico - Bargecchia",totalAccesses:2,sourceKind:"OFFICIAL_ANNCSU" as const,isPresentInLatestSnapshot:true};

describe("Street catalog picker",()=>{
  it("does not load streets until the operator searches, filters or requests all",async()=>{
    const user=userEvent.setup();const fetchMock=vi.fn((input:string)=>input.includes("localities")?Promise.resolve(new Response(JSON.stringify({localities:[{id:"loc",name:"Corsanico - Bargecchia"}]}))):Promise.resolve(new Response(JSON.stringify({streets:[street]}))));vi.stubGlobal("fetch",fetchMock);
    render(<StreetCatalogPicker municipalityId="municipality" inputName="streetIds"/>);
    await waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Cerca una via/indirizzo oppure scegli un’area/località per iniziare.")).toBeInTheDocument();
    expect(screen.queryByText("LOCALITA' AI VENTI")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Area / località"),"Corsanico - Bargecchia");
    await waitFor(()=>expect(screen.getByText("LOCALITA' AI VENTI")).toBeInTheDocument());
    await user.click(screen.getByRole("checkbox",{name:/LOCALITA' AI VENTI/}));
    expect(screen.getByText("Selezionati: 1")).toBeInTheDocument();
  });
});
