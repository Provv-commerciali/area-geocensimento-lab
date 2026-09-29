import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComplexCreateForm } from "@/features/complexes/complex-create-form";
import { ContactForm } from "@/features/census/contact-form";
import { zones, complexes } from "@/lib/demo-data";

const create=vi.hoisted(()=>vi.fn());
vi.mock("@/features/complexes/actions",()=>({createComplexAction:create}));
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn()})}));
const response=(body:unknown)=>new Response(JSON.stringify(body),{status:200});
function mockTerritory(){vi.stubGlobal("fetch",vi.fn(async(input:string)=>{
  if(input.includes("zone-streets"))return response({streets:[{id:"st-1",name:"Via Francesca"},{id:"st-5",name:"Via Verdi"}],total:2});
  if(input.includes("territory/accesses"))return response({accesses:input.includes("st-5")?[{id:"cv-20",number:"4"}]:[{id:"cv-1",number:"59"},{id:"cv-6",number:"61"}],hasMore:false});
  return response({subjects:[]});
}));}
describe("Complex operational creation",()=>{
  afterEach(()=>{vi.unstubAllGlobals();create.mockReset()});
  it("persists one primary and another access on a different Zone Street",async()=>{
    mockTerritory();create.mockResolvedValue({id:"created",name:"Corte Nuova",zoneId:"zone-1",primaryAccessId:"cv-1",accessIds:["cv-1","cv-20"]});
    const onCreated=vi.fn();const user=userEvent.setup();
    render(<ComplexCreateForm zones={zones} initial={{zoneId:"zone-1",streetId:"st-1",streetLabel:"Via Francesca",accessId:"cv-1",accessLabel:"59"}} onCreated={onCreated}/>);
    await user.type(screen.getByLabelText("Nome complesso *"),"Corte Nuova");
    await user.click(screen.getByRole("button",{name:/Aggiungi civico/}));
    await waitFor(()=>expect(screen.getByLabelText("Via / indirizzo",{exact:true})).toBeInTheDocument());
    const add=screen.getByLabelText("Via / indirizzo",{exact:true}).closest(".complex-add-access")!;
    await user.click(within(add as HTMLElement).getByLabelText("Via / indirizzo"));
    await user.click(await within(add as HTMLElement).findByRole("button",{name:"Via Verdi"}));
    await user.click(within(add as HTMLElement).getByLabelText("Civico"));
    await user.click(await within(add as HTMLElement).findByRole("button",{name:"4"}));
    await user.click(screen.getByRole("button",{name:"Aggiungi accesso"}));
    await user.click(screen.getByRole("button",{name:"Salva complesso"}));
    await waitFor(()=>expect(create).toHaveBeenCalledWith(expect.objectContaining({zoneId:"zone-1",primaryAccessId:"cv-1",otherAccessIds:["cv-20"]})));
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({id:"created"}));
  });
  it("preserves Contact draft and selects the newly created Complex within Zone and Access",async()=>{
    mockTerritory();create.mockResolvedValue({id:"created",name:"Nuovo",zoneId:"zone-1",primaryAccessId:"cv-1",accessIds:["cv-1"]});
    const user=userEvent.setup();render(<ContactForm databaseMode complexes={[...complexes,{id:"foreign",name:"Altro Comune",zoneId:"zone-2",civicIds:["cv-1"],streetIds:["st-1"]},{id:"same-zone-other",name:"Case Geska",zoneId:"zone-1",civicIds:["cv-20"],streetIds:["st-1"]}]}/>);
    await user.click(screen.getByRole("button",{name:"Non è presente? Crea nuova anagrafica"}));
    await user.type(screen.getByLabelText("Cognome *"),"Matteucci");
    await user.selectOptions(screen.getByLabelText("Zona di censimento *"),"zone-1");
    await user.selectOptions(screen.getByLabelText("Via *"),"st-1");
    await user.selectOptions(screen.getByLabelText("Civico *"),"cv-1");
    expect(screen.getByLabelText("Complesso")).not.toHaveTextContent("Altro Comune");
    expect(screen.getByRole("option",{name:"Case Geska"})).toBeEnabled();
    await user.selectOptions(screen.getByLabelText("Complesso"),"same-zone-other");
    expect(screen.getByText(/Salvando il Contatto, questo civico sarà collegato a Case Geska/)).toBeVisible();
    await user.click(screen.getByRole("button",{name:/Crea nuovo complesso/}));
    const dialog=screen.getByRole("dialog",{name:"Crea nuovo complesso"});
    expect(within(dialog).getByLabelText("Zona di censimento *")).toHaveValue("zone-1");
    expect(within(dialog).getByLabelText("Civico principale *")).toHaveValue("2/A");
    await user.type(within(dialog).getByLabelText("Nome complesso *"),"Nuovo");
    await user.click(within(dialog).getByRole("button",{name:"Salva complesso"}));
    await waitFor(()=>expect(screen.queryByRole("dialog",{name:"Crea nuovo complesso"})).not.toBeInTheDocument());
    expect(screen.getByLabelText("Cognome *")).toHaveValue("Matteucci");
    expect(screen.getByLabelText("Complesso")).toHaveValue("created");
  });
});
