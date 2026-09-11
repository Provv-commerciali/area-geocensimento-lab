import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContactForm } from "@/features/census/contact-form";

describe("contact form", () => {
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
  });

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
    expect(screen.getByLabelText("Qualifica")).toHaveTextContent("Proprietario");
    expect(screen.getByLabelText("Qualifica")).toHaveTextContent("Inquilino");
    expect(screen.getByLabelText("Occupazione")).toHaveTextContent("Libero al rogito");
    expect(screen.getByLabelText("Occupazione")).not.toHaveTextContent(/^Occupato$/);
  });

  it("does not expose interview fields during record creation", () => {
    render(<ContactForm/>);
    expect(screen.queryByText("Prima intervista")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Data intervista")).not.toBeInTheDocument();
  });

  it("shows persistence errors instead of a false success", async () => {
    const user=userEvent.setup(); const formAction=vi.fn().mockResolvedValue({error:"Database non disponibile"});
    render(<ContactForm databaseMode formAction={formAction}/>);
    await user.selectOptions(screen.getByLabelText("Zona di censimento *"),"zone-1");
    await user.selectOptions(screen.getByLabelText("Via *"),"st-1");
    await user.selectOptions(screen.getByLabelText("Civico *"),"cv-1");
    await user.type(screen.getByLabelText("Cognome *"),"Ferri");
    await user.click(screen.getByRole("button",{name:"Salva contatto"}));
    await waitFor(()=>expect(screen.getByRole("alert")).toHaveTextContent("Database non disponibile"));
  });
});
