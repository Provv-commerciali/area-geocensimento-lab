import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContactForm } from "@/features/census/contact-form";

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

  it("does not expose interview fields during record creation", () => {
    render(<ContactForm/>);
    expect(screen.queryByText("Prima intervista")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Data intervista")).not.toBeInTheDocument();
  });

  it("supports private, company and existing-subject flows",async()=>{
    const user=userEvent.setup();render(<ContactForm/>);
    expect(screen.getByLabelText("Cognome *")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Azienda"));
    expect(screen.getByLabelText("Ragione sociale *")).toBeInTheDocument();
    expect(screen.getByLabelText("Partita IVA")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Anagrafica già presente"));
    expect(screen.getByLabelText("Contatto già presente *")).toBeInTheDocument();
  });

  it("suggests linking an existing subject only from a strong identifier",async()=>{
    const user=userEvent.setup();render(<ContactForm/>);
    await user.type(screen.getByLabelText("Codice fiscale"),"FRRNNA80A41A944X");
    expect(screen.getByText(/Questo soggetto è già presente/)).toBeInTheDocument();
    await user.click(screen.getByRole("button",{name:"Usa anagrafica esistente"}));
    expect(screen.getByLabelText("Contatto già presente *")).toHaveValue("subject-1");
  });

  it("searches the registry on demand in database mode",async()=>{
    const user=userEvent.setup();vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({subjects:[{id:"subject-db",subjectType:"PRIVATO",firstName:"Ada",lastName:"Lovelace"}]}),{status:200})));
    render(<ContactForm databaseMode subjects={[]}/>);
    await user.click(screen.getByLabelText("Anagrafica già presente"));
    await user.type(screen.getByLabelText("Cerca anagrafica"),"Lovelace");
    await user.click(screen.getByRole("button",{name:"Cerca"}));
    await waitFor(()=>expect(screen.getByLabelText("Contatto già presente *")).toHaveTextContent("Lovelace Ada"));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("shows persistence errors instead of a false success", async () => {
    const user=userEvent.setup(); const formAction=vi.fn().mockResolvedValue({error:"Database non disponibile"});
    render(<ContactForm databaseMode formAction={formAction}/>);
    await user.selectOptions(screen.getByLabelText("Zona di censimento *"),"zone-1");
    await user.selectOptions(screen.getByLabelText("Via *"),"st-1");
    await user.selectOptions(screen.getByLabelText("Civico *"),"cv-1");
    await user.type(screen.getByLabelText("Cognome *"),"Ferri");
    await user.selectOptions(screen.getByLabelText("Ruolo nel contesto *"),"Proprietario");
    await user.click(screen.getByRole("button",{name:"Salva contatto"}));
    await waitFor(()=>expect(screen.getByRole("alert")).toHaveTextContent("Database non disponibile"));
  });
});
