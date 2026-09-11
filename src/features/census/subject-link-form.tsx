"use client";

import { useActionState } from "react";
import { AlertTriangle, Link2 } from "lucide-react";
import { qualifications, subjectDisplayName, type Subject } from "@/domain/census";
import { linkSubjectAction } from "./subject-actions";

export function SubjectLinkForm({recordId,subjects,databaseMode}:{recordId:string;subjects:Subject[];databaseMode:boolean}){
  const [state,action,pending]=useActionState(linkSubjectAction,{});
  return <form className="panel record-form" action={action}><input type="hidden" name="recordId" value={recordId}/><div className="panel-heading"><div><p className="eyebrow">Relazione molti-a-molti</p><h2>Collega altro soggetto</h2></div><Link2/></div>{state.error&&<div className="error-banner" role="alert"><AlertTriangle/>{state.error}</div>}{state.success&&<div className="success-banner">{state.success}</div>}<div className="fields-grid"><label>Soggetto *<select name="subjectId" required><option value="">Seleziona…</option>{subjects.map(subject=><option value={subject.id} key={subject.id}>{subjectDisplayName(subject)}</option>)}</select></label><label>Ruolo *<select name="role" required><option value="">Seleziona…</option>{qualifications.map(role=><option key={role}>{role}</option>)}</select></label></div><div className="button-row"><button className="button primary" disabled={pending||!databaseMode}>{pending?"Collegamento…":"Collega soggetto"}</button></div></form>;
}
