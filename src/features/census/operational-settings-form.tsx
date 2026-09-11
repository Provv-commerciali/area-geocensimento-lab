"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateOperationalSettingsAction, type OperationalSettingsActionState } from "./settings-actions";

export function OperationalSettingsForm({ staleNewsDays, databaseMode, formAction = updateOperationalSettingsAction }: {
  staleNewsDays: number;
  databaseMode: boolean;
  formAction?: (state: OperationalSettingsActionState, data: FormData) => Promise<OperationalSettingsActionState>;
}) {
  const [state, action, pending] = useActionState(formAction, {});
  return <form action={action} className="record-form">
    <section className="form-section">
      <div className="section-title"><span>01</span><div><h2>Stato delle Notizie</h2><p>La tipologia resta “Notizia”; cambia soltanto lo stato operativo derivato.</p></div></div>
      <label className="standalone-field">Giorni massimo senza aggiornamento di una Notizia
        <input name="staleNewsDays" type="number" min="1" max="3650" step="1" defaultValue={staleNewsDays} required disabled={!databaseMode}/>
        <small>Una Notizia diventa non aggiornata quando i giorni dall&apos;ultima intervista superano questa soglia.</small>
      </label>
      {state.error && <div className="error-banner compact" role="alert">{state.error}</div>}
      {state.success && <div className="success-banner compact" role="status">{state.success}</div>}
    </section>
    <div className="form-footer"><span>{databaseMode ? "Configurazione persistente nel Supabase LAB" : "Modalità demo in sola lettura"}</span><button className="button primary" type="submit" disabled={!databaseMode || pending}><Save size={17}/>{pending ? "Salvataggio…" : "Salva impostazione"}</button></div>
  </form>;
}
