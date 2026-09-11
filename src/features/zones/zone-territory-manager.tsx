"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Check, Hash, Plus } from "lucide-react";
import type { CensusZone, Civic, Street } from "@/domain/census";
import { addCivicsAction, attachStreetAction } from "./actions";

function Feedback({state}:{state:{error?:string;success?:string}}){return <>{state.error&&<div className="error-banner compact" role="alert"><AlertTriangle/>{state.error}</div>}{state.success&&<div className="success-banner compact"><Check/>{state.success}</div>}</>}

export function ZoneTerritoryManager({zone,streets,civics,databaseMode}:{zone:CensusZone;streets:Street[];civics:Civic[];databaseMode:boolean}){
  const [streetState,streetAction]=useActionState(attachStreetAction,{});const [civicState,civicAction]=useActionState(addCivicsAction,{});const [activeStreet,setActiveStreet]=useState(zone.streetIds[0]??"");const [mode,setMode]=useState("range");
  const associated=streets.filter((street)=>zone.streetIds.includes(street.id));const available=streets.filter((street)=>street.municipalityId===zone.municipalityId&&!zone.streetIds.includes(street.id));const activeCivics=civics.filter((civic)=>civic.streetId===activeStreet);
  return <div className="territory-manager">
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Gestione esplicita</p><h2>Vie associate</h2></div><span>{associated.length} vie</span></div><div className="street-tabs">{associated.map((street)=><button key={street.id} className={activeStreet===street.id?"active":""} onClick={()=>setActiveStreet(street.id)}><span>{street.name}</span><small>{civics.filter((civic)=>civic.streetId===street.id).length} civici</small></button>)}</div>
      <form action={streetAction} className="inline-management-form"><input type="hidden" name="zoneId" value={zone.id}/><label>Via esistente<select name="existingStreetId" defaultValue=""><option value="">Seleziona…</option>{available.map((street)=><option value={street.id} key={street.id}>{street.name}</option>)}</select></label><span className="form-separator">oppure</span><label>Nuova Via<input name="newStreetName" placeholder="Nome completo della via"/></label><button className="button secondary" disabled={!databaseMode}><Plus size={16}/> Associa Via</button></form><Feedback state={streetState}/>
    </section>
    {activeStreet&&<section className="panel"><div className="panel-heading"><div><p className="eyebrow">{associated.find((street)=>street.id===activeStreet)?.name}</p><h2>Civici della Via</h2></div><span>{activeCivics.length} civici</span></div><div className="civic-chips">{activeCivics.slice(0,100).map((civic)=><span key={civic.id}>{civic.number}{civic.extension?`/${civic.extension}`:""}</span>)}{activeCivics.length>100&&<span>+{activeCivics.length-100}</span>}</div>
      <form action={civicAction} className="civic-form"><input type="hidden" name="streetId" value={activeStreet}/><input type="hidden" name="returnPath" value={`/censimento/zone/${zone.id}`}/><fieldset className="mode-switch"><legend>Modalità inserimento</legend>{[["range","Intervallo"],["single","Singolo"],["manual","Particolari"]].map(([value,label])=><label key={value}><input type="radio" name="mode" value={value} checked={mode===value} onChange={()=>setMode(value)}/>{label}</label>)}</fieldset>
        {mode==="range"&&<div className="management-grid"><label>Da<input name="from" type="number" min="0" required/></label><label>A<input name="to" type="number" min="0" required/></label><label>Selezione<select name="parity" defaultValue="all"><option value="all">Tutti</option><option value="even">Solo pari</option><option value="odd">Solo dispari</option></select></label></div>}
        {mode==="single"&&<div className="management-grid"><label>Numero<input name="number" required/></label><label>Estensione<input name="extension" placeholder="es. A, bis"/></label></div>}
        {mode==="manual"&&<label>Civici particolari<textarea name="manualCivics" rows={3} placeholder={'7 bis, 12 A, 12 B\nSNC'}/><small>Separali con virgola, punto e virgola o a capo.</small></label>}
        <button className="button primary" disabled={!databaseMode}><Hash size={16}/> Aggiungi civici</button>
      </form><Feedback state={civicState}/>
    </section>}
  </div>
}
