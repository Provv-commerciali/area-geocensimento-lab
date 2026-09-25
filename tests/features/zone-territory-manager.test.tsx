import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ZoneTerritoryManager } from "@/features/zones/zone-territory-manager";

const zone={id:"zone",name:"Centro",municipalityId:"municipality",municipality:"Comune",operator:{id:"operator",name:"Operatore"},streetIds:["street-1"]};
const street={id:"street-1",municipalityId:"municipality",name:"Via Uno",localityName:"Centro",totalAccesses:1,sourceKind:"OFFICIAL_ANNCSU" as const,anncsuProgressivoNazionale:"123",isPresentInLatestSnapshot:true};
const counts={streetCount:1,accessCount:1,locatedCount:0,unlocatedCount:1};

describe("Zone territory management",()=>{
  it("uses operational language while keeping the address count",()=>{
    render(<ZoneTerritoryManager zone={zone} streets={[street]} counts={counts} databaseMode={false}/>);
    expect(screen.getByText(/1 civico/)).toBeInTheDocument();
    expect(screen.getByText("Vie e indirizzi della zona")).toBeInTheDocument();
    expect(screen.getByText("Cerca via o indirizzo")).toBeInTheDocument();
    expect(screen.getByText("Inserisci manualmente")).toBeInTheDocument();
    expect(screen.queryByText(/ANNCSU 123/)).not.toBeInTheDocument();
  });
});
