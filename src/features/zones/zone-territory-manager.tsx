"use client";

import { useActionState } from "react";
import { AlertTriangle, Check, Plus } from "lucide-react";
import type { CensusZone } from "@/domain/census";
import type { CanonicalStreet, ZoneAccessCounts } from "@/domain/territory";
import { attachStreetAction, createManualStreetAction, detachStreetAction } from "./actions";
import { StreetCatalogPicker } from "./street-catalog-picker";

function Feedback({state}:{state:{error?:string;success?:string}}){return <>{state.error&&<div className="error-banner compact" role="alert"><AlertTriangle/>{state.error}</div>}{state.success&&<div className="success-banner compact"><Check/>{state.success}</div>}</>}

export function ZoneTerritoryManager({zone,streets,counts,databaseMode}:{zone:CensusZone;streets:CanonicalStreet[];counts:ZoneAccessCounts;databaseMode:boolean}){
  const[streetState,streetAction]=useActionState(attachStreetAction,{});const[manualState,manualAction]=useActionState(createManualStreetAction,{});const[removeState,removeAction]=useActionState(detachStreetAction,{});
  return <div className="territory-manager">
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Gestione zona</p><h2>Vie e indirizzi della zona</h2><p className="muted">Scegli le vie e gli indirizzi che fanno parte di questa zona.</p></div><span>{counts.streetCount} vie / indirizzi · {counts.accessCount} civici</span></div>
      <div className="zone-street-list">{streets.map(street=><article key={street.id}><div><strong>{street.name}</strong>{street.localityName&&<small>{street.localityName}</small>}</div><div><span>{street.totalAccesses} {street.totalAccesses===1?"civico":"civici"}{street.sourceKind==="MANUAL"&&<em>Inserito manualmente</em>}</span><form action={removeAction} onSubmit={event=>{if(!confirm(`Rimuovere ${street.name} dalla zona?`))event.preventDefault()}}><input type="hidden" name="zoneId" value={zone.id}/><input type="hidden" name="streetId" value={street.id}/><button className="text-button" disabled={!databaseMode}>Rimuovi</button></form></div></article>)}{!streets.length&&<p className="muted">Non hai ancora aggiunto vie o indirizzi.</p>}</div><Feedback state={removeState}/>
    </section>
    <section className="panel"><form action={streetAction}><input type="hidden" name="zoneId" value={zone.id}/><StreetCatalogPicker municipalityId={zone.municipalityId} inputName="existingStreetId" excludedIds={zone.streetIds}/><div className="catalog-cta"><button className="button primary" disabled={!databaseMode}><Plus size={16}/> Aggiungi alla zona</button></div></form><Feedback state={streetState}/></section>
    <section className="panel manual-panel"><details><summary>Non trovi l’indirizzo?</summary><div className="manual-panel-content"><h3>Inserisci manualmente</h3><p>Usa questa funzione solo se la via o l’indirizzo non compare nei risultati.</p><form action={manualAction} className="record-form"><input type="hidden" name="zoneId" value={zone.id}/><div className="fields-grid"><label>Via / indirizzo *<input name="name" required placeholder="Denominazione completa"/></label><label>Area / località<input name="locality"/></label><label>Motivo *<input name="reason" required/></label></div><button className="button secondary" disabled={!databaseMode}>Aggiungi manualmente</button></form><Feedback state={manualState}/></div></details></section>
  </div>;
}
