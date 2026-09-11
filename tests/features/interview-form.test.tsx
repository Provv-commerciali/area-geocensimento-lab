import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InterviewForm } from "@/features/census/interview-form";

describe("explicit interview form",()=>{
  it("submits an interview only from the dedicated record action",async()=>{
    const user=userEvent.setup(); const formAction=vi.fn().mockResolvedValue({});
    render(<InterviewForm recordId="record-1" operators={[{id:"op-1",name:"Elena Rossi"}]} databaseMode formAction={formAction}/>);
    await user.selectOptions(screen.getByLabelText("Operatore *"),"op-1");
    await user.type(screen.getByLabelText("Data intervista *"),"2026-09-11");
    await user.click(screen.getByRole("button",{name:"Registra intervista"}));
    await waitFor(()=>expect(formAction).toHaveBeenCalledOnce());
    const data=formAction.mock.calls[0][1] as FormData;
    expect(data.get("recordId")).toBe("record-1");
  });
});
