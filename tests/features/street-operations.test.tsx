import { render, screen, within } from "@testing-library/react";
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
const props={zoneId:"zone-1",streetId:"st-1",accesses,records:[one,...many,inComplex],complexes:[{...complexes[0],civicIds:["complex"]}],total:4,page:1,query:{},sort:"civic_asc" as const,filters:{}};

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
  it("routes empty, single, multiple and Complex civics contextually",()=>{
    render(<StreetCivicsList {...props}/>);
    const rows=screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Mai censito · nessun contatto")).toBeInTheDocument();
    expect(within(rows[0]).getByRole("link",{name:"+ Nuovo contatto"})).toHaveAttribute("href",expect.stringContaining("civicId=empty"));
    expect(within(rows[1]).getByRole("link",{name:"Apri contatto"})).toHaveAttribute("href","/censimento/contatti/one-record");
    expect(within(rows[2]).getByRole("link",{name:"Apri contatti"})).toHaveAttribute("href",expect.stringContaining("/civici/many"));
    expect(within(rows[3]).getByRole("link",{name:"Apri contatti"})).toHaveAttribute("href",expect.stringContaining("/civici/complex"));
    expect(within(rows[3]).getByText(/Complesso:/)).toBeInTheDocument();
  });
});
