import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ContactForm } from "@/features/census/contact-form";

describe("contact form appraisal behavior", () => {
  it("reveals an unchecked manual appraisal only for Notizia", async () => { const user=userEvent.setup(); render(<ContactForm/>); expect(screen.queryByText("Perizia Immobiliare")).not.toBeInTheDocument(); await user.selectOptions(screen.getByLabelText("Tipologia contatto"),"Notizia"); const checkbox=screen.getByLabelText(/Perizia Immobiliare/); expect(checkbox).toBeInTheDocument(); expect(checkbox).not.toBeChecked() });
});
