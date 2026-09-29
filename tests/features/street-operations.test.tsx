import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { records, complexes } from "@/lib/demo-data";
import { StreetCivicsList } from "@/features/zones/street-civics-list";
import { metrics } from "@/features/zones/operational-metrics";
import { recordMatchesQuickSearch, recordMatchesStreetFilters } from "@/features/zones/street-operations";
import type { AddressAccess } from "@/domain/territory";

const accesses:AddressAccess[]=["empty","one","many","complex"].map((id,index)=>({id,streetId:"st-1",streetName:"Via Roma",sourceKind:"OFFICIAL_ANNCSU",civic:String(index+1)}));
const one={...records[0],id:"one-record",civicId:"one",streetId:"st-1",zoneId:"zone-1",interviews:[]};
const many=[{...records[1],id:"many-1",civicId:"many",streetId:"st-1",zoneId:"zone-1"},{...records[2],id:"many-2",civicId:"many",streetId:"st-1",zoneId:"zone-1"}];
const inComplex={...records[3],id:"complex-record",civicId:"complex",streetId:"st-1",zoneId:"zone-1"};
const complex={...complexes[0],civicIds:["complex"],units:13,primaryAccessId:"complex"};
const props={zoneId:"zone-1",streetId:"st-1",items:accesses.map(access=>({access,complexId:access.id==="complex"?complex.id:undefined})),records:[one,...many],complexRecords:[{...inComplex,complexId:complex.id}],complexes:[complex],complexSummaries:{[complex.id]:{primaryAddress:"Via Roma 4",photoUrl:"https://example.test/private.jpg",accesses:[{id:"complex",streetId:"st-1",label:"Via Roma 4"}]}},total:4,page:1,query:{},sort:"civic_asc" as const,filters:{}};

describe("street operational workflow",()=>{
  it("counts CensusRecords independently of type or interviews",()=>{
    expect(metrics([one,...many]).censiti).toBe(3);
    expect(metrics([one]).censiti).toBe(1);
  });
  it("searches contact name and phone and applies supported filters",()=>{
    expect(recordMatchesQuickSearch(one,one.lastName)).toBe(true);
    expect(recordMatchesQuickSearch(one,one.phone??"")).toBe(true);
    expect(recordMatchesStreetFilters(one,{contactType:one.contactType,qualification:one.qualification})).toBe(true);
    expect(recordMatchesStreetFilters(one,{contactType:"Notizia"})).toBe(one.contactType==="Notizia");
  });
  it("routes empty, single, multiple and shows one autonomous Complex row",()=>{
    render(<StreetCivicsList {...props}/>);
    const rows=screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Mai censito · nessun contatto")).toBeInTheDocument();
    expect(within(rows[0]).getByRole("link",{name:"+ Nuovo contatto"})).toHaveAttribute("href",expect.stringContaining("civicId=empty"));
    expect(within(rows[1]).getByRole("link",{name:"Apri contatto"})).toHaveAttribute("href","/censimento/contatti/one-record");
    expect(within(rows[2]).getByRole("link",{name:"Apri contatti"})).toHaveAttribute("href",expect.stringContaining("/civici/many"));
    expect(within(rows[3]).getByRole("article",{name:"Complesso Corte Mercanti"})).toBeInTheDocument();
    expect(within(rows[3]).getByText("13 unità dichiarate")).toBeInTheDocument();
    expect(within(rows[3]).getByText("1 contatto censito")).toBeInTheDocument();
    expect(within(rows[3]).getByRole("img",{name:"Foto del complesso Corte Mercanti"})).toHaveAttribute("src","https://example.test/private.jpg");
    expect(within(rows[3]).queryByRole("link",{name:"Apri contatti"})).not.toBeInTheDocument();
  });
  it("expands and collapses real contacts inline without duplicating the civic",async()=>{
    const user=userEvent.setup();render(<StreetCivicsList {...props}/>);
    const card=screen.getByRole("article",{name:"Complesso Corte Mercanti"});
    expect(within(card).queryByText(`${inComplex.lastName} ${inComplex.firstName}`)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button",{name:/Mostra interni/}));
    expect(screen.getByRole("button",{name:/Nascondi interni/})).toHaveAttribute("aria-expanded","true");
    expect(within(card).getByRole("link",{name:"Apri contatto"})).toHaveAttribute("href","/censimento/contatti/complex-record");
    await user.click(screen.getByRole("button",{name:/Nascondi interni/}));
    expect(within(card).queryByRole("link",{name:"Apri contatto"})).not.toBeInTheDocument();
  });
  it("keeps a Complex with no contacts and uses a local placeholder",async()=>{
    const user=userEvent.setup();render(<StreetCivicsList {...props} complexRecords={[]} complexSummaries={{[complex.id]:{primaryAddress:"Via Roma 4",accesses:[{id:"complex",streetId:"st-1",label:"Via Roma 4"}]}}}/>);
    expect(screen.getByText("Nessun censimento")).toBeInTheDocument();
    expect(screen.getByLabelText("Nessuna foto del complesso")).toBeInTheDocument();
    await user.click(screen.getByRole("button",{name:/Mostra interni/}));
    expect(screen.getByText("Nessun contatto registrato")).toBeInTheDocument();
  });
  it("shows multiple Accesses and multiple CensusRecords without inventing units",async()=>{
    const user=userEvent.setup();const second={...inComplex,id:"complex-second",civicId:"complex-other",complexId:complex.id,lastName:"Secondo"};
    const same={...inComplex,id:"complex-same",complexId:complex.id,lastName:"Terzo"};
    render(<StreetCivicsList {...props} complexRecords={[{...inComplex,complexId:complex.id},same,second]} complexes={[{...complex,civicIds:["complex","complex-other"]}]} complexSummaries={{[complex.id]:{primaryAddress:"Via Roma 4",accesses:[{id:"complex",streetId:"st-1",label:"Via Roma 4"},{id:"complex-other",streetId:"st-1",label:"Via Roma 4/A"}]}}}/>);
    expect(screen.getByText("3 contatti censiti")).toBeInTheDocument();
    expect(screen.getByText("+ 1 altro accesso")).toBeInTheDocument();
    expect(screen.queryByText("3 unità censite")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button",{name:/Mostra interni/}));
    const card=screen.getByRole("article",{name:"Complesso Corte Mercanti"});
    expect(within(card).getAllByRole("link",{name:"Apri contatto"})).toHaveLength(3);
    expect(card.querySelectorAll(".street-complex-access")).toHaveLength(2);
    expect(within(card).getByText("Via Roma 4/A")).toBeInTheDocument();
  });
});
