import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CadastralOperationResult } from "@/domain/cadastral-data";

const mocks=vi.hoisted(()=>({findPropertyUnitsAction:vi.fn()}));
vi.mock("@/features/cadastral/actions",()=>({findPropertyUnitsAction:mocks.findPropertyUnitsAction,getPropertyHoldersAction:vi.fn(),requestOrdinaryReportAction:vi.fn(),requestPlanimetricElaborationAction:vi.fn(),pollCadastralRequestAction:vi.fn(),linkCadastralHolderAction:vi.fn(),getCadastralDocumentUrlAction:vi.fn()}));
import { CadastralServicesPanel } from "@/features/cadastral/cadastral-services-panel";

const context={provinceCode:"LU",municipality:"Pietrasanta",municipalityCode:"G628",sheet:"18",parcel:"245"};
const operation:CadastralOperationResult={requestId:"11111111-1111-4111-8111-111111111111",operationType:"ELENCO_IMMOBILI",status:"COMPLETED",fromCache:true,requestedAt:"2026-09-14T10:00:00Z",units:[{id:"22222222-2222-4222-8222-222222222222",providerPropertyId:"one",sheet:"18",parcel:"245",subaltern:"1",category:"A/2"},{id:"33333333-3333-4333-8333-333333333333",providerPropertyId:"two",sheet:"18",parcel:"245",subaltern:"2",category:"C/6"}],holders:[]};

describe("CadastralServicesPanel",()=>{
  beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal("confirm",vi.fn(()=>true))});
  it("does not call OpenAPI on render and requires explicit confirmation",async()=>{mocks.findPropertyUnitsAction.mockResolvedValue({ok:true,data:operation});render(<CadastralServicesPanel authorized context={context}/>);expect(mocks.findPropertyUnitsAction).not.toHaveBeenCalled();fireEvent.click(screen.getByRole("button",{name:"Ottieni dati immobile"}));await waitFor(()=>expect(mocks.findPropertyUnitsAction).toHaveBeenCalledTimes(1));expect(confirm).toHaveBeenCalledTimes(1)});
  it("renders multiple subalterns as distinct units and exposes cached acquisition",()=>{render(<CadastralServicesPanel authorized context={context} initialOperations={[operation]}/>);expect(screen.getByText(/Sub\. 1/)).toBeInTheDocument();expect(screen.getByText(/Sub\. 2/)).toBeInTheDocument();expect(screen.getByText(/nessuna nuova richiesta/i)).toBeInTheDocument()});
});
