import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ZoneTerritoryManager } from "@/features/zones/zone-territory-manager";

const zone={id:"zone",name:"Centro",municipalityId:"municipality",municipality:"Comune",operator:{id:"operator",name:"Operatore"},streetIds:["street-1"]};
const street={id:"street-1",municipalityId:"municipality",name:"Via Uno",localityName:"Centro",totalAccesses:1,sourceKind:"OFFICIAL_ANNCSU" as const,anncsuProgressivoNazionale:"123",isPresentInLatestSnapshot:true};
const counts={streetCount:1,accessCount:1,locatedCount:0,unlocatedCount:1};

describe("Zone territory management",()=>{
  it("shows the official identity and independent access count",()=>{
    render(<ZoneTerritoryManager zone={zone} streets={[street]} accesses={[{id:"access-1",streetId:street.id,streetName:street.name,sourceKind:"OFFICIAL_ANNCSU",civic:"7"}]} counts={counts} databaseMode={false}/>);
    expect(screen.getByText(/1 vie · 1 accessi/)).toBeInTheDocument();
    expect(screen.getByText(/ANNCSU 123/)).toBeInTheDocument();
    expect(screen.getByText("Associa una via ANNCSU")).toBeInTheDocument();
    expect(screen.getByText("Non trovi la via? Crea eccezione manuale")).toBeInTheDocument();
  });
});
