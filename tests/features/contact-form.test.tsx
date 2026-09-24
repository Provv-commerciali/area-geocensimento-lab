import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContactForm } from "@/features/census/contact-form";

vi.mock("@/features/census/cadastral-picker",()=>({CadastralPicker:({onSaved}:{onSaved:(feature:{municipalityCode:string;municipalityName:string;sheet:string;parcel:string})=>void})=><button type="button" onClick={()=>onSaved({municipalityCode:"A944",municipalityName:"Bologna",sheet:"12",parcel:"88"})}>Conferma particella test</button>}));

describe("contact form", () => {
  afterEach(()=>vi.unstubAllGlobals());
  it("reveals an unchecked manual appraisal only for Notizia", async () => {
    const user=userEvent.setup(); render(<ContactForm/>);
    expect(screen.queryByText("Perizia Immobiliare")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Tipologia contatto"),"Notizia");
    expect(screen.getByLabelText(/Perizia Immobiliare/)).not.toBeChecked();
  });

  it("cascades zone, street and civic while displaying extension separately", async () => {
    const user=userEvent.setup(); render(<ContactForm/>);
    await user.selectOptions(screen.getByLabelText("Zona di censimento *"),"zone-1");
    expect(screen.getByLabelText("Via *")).toHaveValue("");
    await user.selectOptions(screen.getByLabelText("Via *"),"st-1");
    await user.selectOptions(screen.getByLabelText("Civico *"),"cv-1");
    expect(screen.getByRole("textbox",{name:/Estensione/})).toHaveValue("A");
    expect(screen.getByText("Posizione geografica verificata")).toBeInTheDocument();
  });

  it("shows an explicit map action for an unlocated civic",async()=>{const user=userEvent.setup();render(<ContactForm/>);await user.selectOptions(screen.getByLabelText("Zona di censimento *"),"zone-1");await user.selectOptions(screen.getByLabelText("Via *"),"st-5");await user.selectOptions(screen.getByLabelText("Civico *"),"cv-20");expect(screen.getByText("Posizione non verificata")).toBeInTheDocument();expect(screen.getByRole("button",{name:"Individua sulla mappa"})).toBeInTheDocument()});

  it("shows structured floor controls only for a partial building", async () => {
    const user=userEvent.setup(); render(<ContactForm/>);
    expect(screen.queryByLabelText("Piano *")).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("Parte di edificio"));
    expect(screen.getByLabelText("Piano *")).toBeInTheDocument();
    expect(screen.getByLabelText("Numero totale piani")).toBeInTheDocument();
    expect(screen.getByLabelText("Ultimo piano")).toBeInTheDocument();
  });

  it("offers only controlled qualification and occupancy choices", () => {
    render(<ContactForm/>);
    expect(screen.getByLabelText("Ruolo nel contesto *")).toHaveTextContent("Proprietario");
    expect(screen.getByLabelText("Ruolo nel contesto *")).toHaveTextContent("Comproprietario");
    expect(screen.getByLabelText("Ruolo nel contesto *")).toHaveTextContent("Inquilino");
    expect(screen.getByLabelText("Occupazione")).toHaveTextContent("Libero al rogito");
    expect(screen.getByLabelText("Occupazione")).not.toHaveTextContent(/^Occupato$/);
  });

  it("offers the controlled engagement choices from the approved reference",()=>{
    render(<ContactForm/>);const select=screen.getByLabelText("Tipo di incarico");
    for(const value of ["Nessuno","Incarico altre agenzie","In esclusiva","Verbale","Non esclusivo"])expect(select).toHaveTextContent(value);
  });

  it("requires a calendar date only for external and exclusive assignments",async()=>{const user=userEvent.setup();render(<ContactForm/>);expect(screen.queryByLabelText("Scadenza incarico *")).not.toBeInTheDocument();await user.selectOptions(screen.getByLabelText("Tipo di incarico"),"Incarico altre agenzie");expect(screen.getByLabelText("Scadenza incarico *")).toBeRequired();await user.selectOptions(screen.getByLabelText("Tipo di incarico"),"Verbale");expect(screen.queryByLabelText("Scadenza incarico *")).not.toBeInTheDocument()});

  it("offers the free GeoCensimento import only after selecting a civic",async()=>{const user=userEvent.setup();render(<ContactForm/>);const open=screen.getByRole("button",{name:"Apri GeoCensimento"});expect(open).toBeDisabled();await user.selectOptions(screen.getByLabelText("Zona di censimento *"),"zone-1");await user.selectOptions(screen.getByLabelText("Via *"),"st-1");await user.selectOptions(screen.getByLabelText("Civico *"),"cv-1");expect(open).toBeEnabled()});

  it("copies only the confirmed free sheet and parcel into the draft",async()=>{const user=userEvent.setup();render(<ContactForm/>);await user.selectOptions(screen.getByLabelText("Zona di censimento *"),"zone-1");await user.selectOptions(screen.getByLabelText("Via *"),"st-1");await user.selectOptions(screen.getByLabelText("Civico *"),"cv-1");await user.click(screen.getByRole("button",{name:"Apri GeoCensimento"}));await user.click(screen.getByRole("button",{name:"Conferma particella test"}));expect(screen.getByLabelText("Foglio")).toHaveValue("12");expect(screen.getByLabelText("Particella")).toHaveValue("88");expect(screen.getByLabelText("Subalterno")).toHaveValue("")});

  it("does not expose interview fields during record creation", () => {
    render(<ContactForm/>);
    expect(screen.queryByText("Prima intervista")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Data intervista")).not.toBeInTheDocument();
  });

  it("supports private, company and existing-subject flows",async()=>{
    const user=userEvent.setup();render(<ContactForm/>);
    expect(screen.getByLabelText("Cerca anagrafica")).toBeInTheDocument();
    await user.click(screen.getByRole("button",{name:"Non è presente? Crea nuova anagrafica"}));
    expect(screen.getByLabelText("Cognome *")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Azienda"));
    expect(screen.getByLabelText("Ragione sociale *")).toBeInTheDocument();
    expect(screen.getByLabelText("Partita IVA")).toBeInTheDocument();
    await user.click(screen.getByRole("button",{name:"Cerca un’anagrafica già presente"}));
    expect(screen.getByLabelText("Cerca anagrafica")).toBeInTheDocument();
  });

  it("suggests linking an existing subject only from a strong identifier",async()=>{
    const user=userEvent.setup();render(<ContactForm/>);
    await user.click(screen.getByRole("button",{name:"Non è presente? Crea nuova anagrafica"}));
    await user.type(screen.getByLabelText("Codice fiscale"),"FRRNNA80A41A944X");
    expect(screen.getByText(/Questa anagrafica è già presente/)).toBeInTheDocument();
    await user.click(screen.getByRole("button",{name:/Usa Ferri Anna/}));
    expect(screen.getByText("Anagrafica selezionata")).toBeInTheDocument();
  });

  it("searches the registry on demand in database mode",async()=>{
    const user=userEvent.setup();vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({subjects:[{id:"subject-db",subjectType:"PRIVATO",firstName:"Ada",lastName:"Lovelace",contextCount:2,contexts:[{recordId:"one",role:"Proprietario",address:"Centro · Via Uno, 1"}]}]}),{status:200})));
    render(<ContactForm databaseMode subjects={[]}/>);
    await user.type(screen.getByLabelText("Cerca anagrafica"),"Lovelace Ada");
    await user.click(screen.getByRole("button",{name:"Cerca"}));
    await waitFor(()=>expect(screen.getByText("Lovelace Ada")).toBeInTheDocument());
    expect(screen.getByText("2 immobili collegati")).toBeInTheDocument();
    await user.click(screen.getByRole("button",{name:"Seleziona"}));
    expect(screen.getByText("Anagrafica selezionata")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reports an empty registry search and offers new identity creation",async()=>{const user=userEvent.setup();vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({subjects:[]}),{status:200})));render(<ContactForm databaseMode subjects={[]}/>);await user.type(screen.getByLabelText("Cerca anagrafica"),"Nessuno Presente");await user.click(screen.getByRole("button",{name:"Cerca"}));await waitFor(()=>expect(screen.getByText("Nessuna anagrafica trovata")).toBeInTheDocument());await user.click(screen.getByRole("button",{name:"Crea nuova anagrafica"}));expect(screen.getByLabelText("Cognome *")).toBeInTheDocument()});

  it("shows persistence errors instead of a false success", async () => {
    const user=userEvent.setup(); const formAction=vi.fn().mockResolvedValue({error:"Database non disponibile"});
    render(<ContactForm databaseMode formAction={formAction}/>);
    await user.click(screen.getByRole("button",{name:"Non è presente? Crea nuova anagrafica"}));
    await user.selectOptions(screen.getByLabelText("Zona di censimento *"),"zone-1");
    await user.selectOptions(screen.getByLabelText("Via *"),"st-1");
    await user.selectOptions(screen.getByLabelText("Civico *"),"cv-1");
    await user.type(screen.getByLabelText("Cognome *"),"Ferri");
    await user.selectOptions(screen.getByLabelText("Ruolo nel contesto *"),"Proprietario");
    await user.click(screen.getByRole("button",{name:"Salva contatto"}));
    await waitFor(()=>expect(screen.getByRole("alert")).toHaveTextContent("Database non disponibile"));
  });
});
