import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ZoneTerritoryManager } from "@/features/zones/zone-territory-manager";

const zone={id:"zone",name:"Centro",municipalityId:"municipality",municipality:"Comune",operator:{id:"operator",name:"Operatore"},streetIds:["street-1"]};
const associated={id:"street-1",municipalityId:"municipality",municipality:"Comune",name:"Via Uno"};
const available={id:"street-2",municipalityId:"municipality",municipality:"Comune",name:"Via Due"};

describe("Zone territory street choices",()=>{
  it("hides the existing-street choice when every municipal street is already associated",()=>{
    render(<ZoneTerritoryManager zone={zone} streets={[associated]} civics={[]} databaseMode={false}/>);
    expect(screen.queryByLabelText("Via già presente nel Comune")).not.toBeInTheDocument();
    expect(screen.queryByText("oppure crea")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Aggiungi nuova via")).toBeInTheDocument();
  });

  it("explains the existing-street choice when another municipal street is available",()=>{
    render(<ZoneTerritoryManager zone={zone} streets={[associated,available]} civics={[]} databaseMode={false}/>);
    expect(screen.getByLabelText("Via già presente nel Comune")).toHaveTextContent("Via Due");
    expect(screen.getByText("oppure crea")).toBeInTheDocument();
  });
});
