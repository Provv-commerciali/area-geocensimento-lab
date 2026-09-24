"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Check, Plus } from "lucide-react";
import type { CensusZone } from "@/domain/census";
import type { AddressAccess, CanonicalStreet, ZoneAccessCounts } from "@/domain/territory";
import { accessLabel } from "@/domain/territory";
import { attachStreetAction, createManualAccessAction, createManualStreetAction } from "./actions";
import { StreetCatalogPicker } from "./street-catalog-picker";

function Feedback({state}:{state:{error?:string;success?:string}}){return <>{state.error&&<div className="error-banner compact" role="alert"><AlertTriangle/>{state.error}</div>}{state.success&&<div className="success-banner compact"><Check/>{state.success}</div>}</>}

export function ZoneTerritoryManager({zone,streets,accesses,counts,databaseMode}:{zone:CensusZone;streets:CanonicalStreet[];accesses:AddressAccess[];counts:ZoneAccessCounts;databaseMode:boolean}){
  const[streetState,streetAction]=useActionState(attachStreetAction,{});
  const[manualStreetState,manualStreetAction]=useActionState(createManualStreetAction,{});
  const[manualAccessState,manualAccessAction]=useActionState(createManualAccessAction,{});
  const[activeStreet,setActiveStreet]=useState("");
  return <div className="territory-manager">
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Gestione zona</p><h2>Vie associate</h2></div><span>{counts.streetCount} vie · {counts.accessCount} accessi</span></div>
      <p className="muted">{counts.locatedCount} accessi con coordinate ANNCSU valide · {counts.unlocatedCount} senza coordinate ANNCSU utilizzabili.</p>
      <div className="street-tabs">{streets.map(street=><button type="button" aria-pressed={activeStreet===street.id} key={street.id} className={activeStreet===street.id?"active":""} onClick={()=>setActiveStreet(street.id)}><span>{street.name}</span><small>{street.localityName??"Località non indicata"} · {street.totalAccesses} accessi · {street.sourceKind==="OFFICIAL_ANNCSU"?`ANNCSU ${street.anncsuProgressivoNazionale}`:"MANUAL · in revisione"}</small></button>)}</div>
      <form action={streetAction} className="inline-management-form"><input type="hidden" name="zoneId" value={zone.id}/><div><h3>Associa una via ANNCSU</h3><StreetCatalogPicker municipalityId={zone.municipalityId} inputName="existingStreetId" excludedIds={zone.streetIds}/></div><button className="button secondary" disabled={!databaseMode}><Plus size={16}/> Associa via</button></form><Feedback state={streetState}/>
    </section>
    {activeStreet&&<section className="panel"><div className="panel-heading"><div><p className="eyebrow">{streets.find(street=>street.id===activeStreet)?.name}</p><h2>Accessi della via</h2></div></div>
      <div className="civic-chips">{accesses.filter(access=>access.streetId===activeStreet).map(access=><span key={access.id}>{accessLabel(access)}</span>)}</div>
      <p className="muted">Anteprima dei primi accessi della Zona. Ogni accesso mantiene l’identificativo ANNCSU, anche quando l’etichetta coincide.</p>
      <details><summary>Non trovi l’accesso? Crea eccezione manuale</summary><form action={manualAccessAction} className="record-form"><input type="hidden" name="zoneId" value={zone.id}/><input type="hidden" name="streetId" value={activeStreet}/><div className="fields-grid"><label>Civico<input name="civic"/></label><label>Esponente<input name="exponent"/></label><label>Metrico<input name="metric"/></label><label>SNC<input name="snc"/></label><label>Motivo *<input name="reason" required/></label></div><button className="button secondary" disabled={!databaseMode}>Proponi accesso manuale</button></form><Feedback state={manualAccessState}/></details>
    </section>}
    <section className="panel"><details><summary>Non trovi la via? Crea eccezione manuale</summary><p className="muted">L’eccezione è registrata come proposta, con autore, data e motivo. Una futura corrispondenza ANNCSU richiederà riconciliazione esplicita.</p><form action={manualStreetAction} className="record-form"><input type="hidden" name="zoneId" value={zone.id}/><div className="fields-grid"><label>Odonimo *<input name="name" required placeholder="Denominazione completa"/></label><label>Località<input name="locality"/></label><label>Motivo *<input name="reason" required/></label></div><button className="button secondary" disabled={!databaseMode}>Proponi via manuale</button></form><Feedback state={manualStreetState}/></details></section>
  </div>;
}
