"use client";

import { useActionState } from "react";
import { AlertTriangle, MessageSquarePlus } from "lucide-react";
import type { Operator } from "@/domain/census";
import { createInterviewAction, type InterviewActionState } from "./interview-actions";

export function InterviewForm({recordId,operators,databaseMode,formAction=createInterviewAction}:{recordId:string;operators:Operator[];databaseMode:boolean;formAction?:(state:InterviewActionState,data:FormData)=>Promise<InterviewActionState>}){
  const [state,action,pending]=useActionState(formAction,{});
  return <form className="panel record-form" action={action}><input type="hidden" name="recordId" value={recordId}/><div className="panel-heading"><div><p className="eyebrow">Azione esplicita</p><h2>Registra intervista</h2></div><MessageSquarePlus/></div>{state.error&&<div className="error-banner" role="alert"><AlertTriangle/>{state.error}</div>}<div className="fields-grid"><label>Operatore *<select name="operatorId" required><option value="">Seleziona…</option>{operators.map(operator=><option key={operator.id} value={operator.id}>{operator.name}</option>)}</select></label><label>Data intervista *<input name="interviewDate" type="date" required/></label><label>Data ricontatto<input name="recallDate" type="date"/></label><label>Risposta<input name="response"/></label><label>Motivo<input name="reason"/></label><label>Esito<input name="outcome"/></label></div><div className="button-row"><button className="button primary" type="submit" disabled={pending||!databaseMode}>{pending?"Salvataggio…":"Registra intervista"}</button></div></form>;
}
