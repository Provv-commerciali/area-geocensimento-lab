"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Check, Hash, Pencil, Plus } from "lucide-react";
import type { CensusZone, Civic, Street } from "@/domain/census";
import { addCivicsAction, attachStreetAction, renameStreetAction } from "./actions";

function Feedback({state}:{state:{error?:string;success?:string}}){return <>{state.error&&<div className="error-banner compact" role="alert"><AlertTriangle/>{state.error}</div>}{state.success&&<div className="success-banner compact"><Check/>{state.success}</div>}</>}

export function ZoneTerritoryManager({zone,streets,civics,databaseMode}:{zone:CensusZone;streets:Street[];civics:Civic[];databaseMode:boolean}){
  const [streetState,streetAction]=useActionState(attachStreetAction,{});const [renameState,renameAction]=useActionState(renameStreetAction,{});const [civicState,civicAction]=useActionState(addCivicsAction,{});const [activeStreet,setActiveStreet]=useState("");const [mode,setMode]=useState("range");
  const associated=streets.filter((street)=>zone.streetIds.includes(street.id));const available=streets.filter((street)=>street.municipalityId===zone.municipalityId&&!zone.streetIds.includes(street.id));const activeCivics=civics.filter((civic)=>civic.streetId===activeStreet);
  return <div className="territory-manager">
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Gestione zona</p><h2>Vie associate</h2></div><span>{associated.length} vie</span></div><div className="street-tabs">{associated.map((street)=><button type="button" aria-pressed={activeStreet===street.id} key={street.id} className={activeStreet===street.id?"active":""} onClick={()=>setActiveStreet(street.id)}><span>{street.name}</span><small>{civics.filter((civic)=>civic.streetId===street.id).length} civici</small></button>)}</div>
      <form action={streetAction} className={`inline-management-form${available.length?"":" single"}`}><input type="hidden" name="zoneId" value={zone.id}/>{available.length>0&&<><label>Via già presente nel Comune<select name="existingStreetId" defaultValue=""><option value="">Seleziona una via da associare…</option>{available.map((street)=><option value={street.id} key={street.id}>{street.name}</option>)}</select></label><span className="form-separator">oppure crea</span></>}<label>Aggiungi nuova via<input name="newStreetName" placeholder="Nome completo della via"/></label><button className="button secondary" disabled={!databaseMode}><Plus size={16}/> {available.length?"Salva via":"Aggiungi via"}</button></form><Feedback state={streetState}/>
    </section>
    {!activeStreet&&<section className="panel territory-empty"><Pencil size={20}/><div><h2>Seleziona una via da modificare</h2><p className="muted">I civici e gli strumenti di modifica si aprono solo dopo una scelta esplicita.</p></div></section>}
    {activeStreet&&<section className="panel"><div className="panel-heading"><div><p className="eyebrow">{associated.find((street)=>street.id===activeStreet)?.name}</p><h2>Modifica Via e civici</h2></div><span>{activeCivics.length} civici</span></div><form key={activeStreet} action={renameAction} className="street-rename-form"><input type="hidden" name="zoneId" value={zone.id}/><input type="hidden" name="streetId" value={activeStreet}/><label>Nome Via<input name="streetName" defaultValue={associated.find((street)=>street.id===activeStreet)?.name} required/></label><button className="button secondary" disabled={!databaseMode}><Pencil size={16}/> Salva nome</button></form><Feedback state={renameState}/><div className="civic-chips">{activeCivics.slice(0,100).map((civic)=><span key={civic.id}>{civic.number}{civic.extension?`/${civic.extension}`:""}</span>)}{activeCivics.length>100&&<span>+{activeCivics.length-100}</span>}</div>
      <form action={civicAction} className="civic-form"><input type="hidden" name="streetId" value={activeStreet}/><input type="hidden" name="returnPath" value={`/censimento/zone/${zone.id}/modifica`}/><fieldset className="mode-switch"><legend>Modalità inserimento</legend>{[["range","Intervallo"],["single","Singolo"],["manual","Particolari"]].map(([value,label])=><label key={value}><input type="radio" name="mode" value={value} checked={mode===value} onChange={()=>setMode(value)}/>{label}</label>)}</fieldset>
        {mode==="range"&&<div className="management-grid"><label>Da<input name="from" type="number" min="0" required/></label><label>A<input name="to" type="number" min="0" required/></label><label>Selezione<select name="parity" defaultValue="all"><option value="all">Tutti</option><option value="even">Solo pari</option><option value="odd">Solo dispari</option></select></label></div>}
        {mode==="single"&&<div className="management-grid"><label>Numero<input name="number" required/></label><label>Estensione<input name="extension" placeholder="es. A, bis"/></label></div>}
        {mode==="manual"&&<label>Civici particolari<textarea name="manualCivics" rows={3} placeholder={'7 bis, 12 A, 12 B\nSNC'}/><small>Separali con virgola, punto e virgola o a capo.</small></label>}
        <button className="button primary" disabled={!databaseMode}><Hash size={16}/> Aggiungi civici</button>
      </form><Feedback state={civicState}/>
    </section>}
  </div>
}
