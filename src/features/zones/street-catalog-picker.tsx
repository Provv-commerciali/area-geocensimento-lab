"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import type { CanonicalStreet } from "@/domain/territory";

const responseSchema=z.object({streets:z.array(z.object({
  id:z.string(),municipalityId:z.string(),name:z.string(),localityName:z.string().optional(),
  localityId:z.string().optional(),totalAccesses:z.number(),sourceKind:z.enum(["OFFICIAL_ANNCSU","MANUAL"]),
  anncsuProgressivoNazionale:z.string().optional(),isPresentInLatestSnapshot:z.boolean(),
  manualReviewState:z.enum(["PROPOSED","APPROVED","RETIRED"]).optional(),
}))});

interface Props { municipalityId:string; inputName:string; multiple?:boolean; excludedIds?:string[]; initial?:CanonicalStreet[] }
export function StreetCatalogPicker({municipalityId,inputName,multiple=false,excludedIds=[],initial=[]}:Props){
  const [query,setQuery]=useState("");const [locality,setLocality]=useState("");
  const [results,setResults]=useState<CanonicalStreet[]>(initial);const [selected,setSelected]=useState<CanonicalStreet[]>([]);
  const [status,setStatus]=useState<"idle"|"loading"|"error">("idle");
  useEffect(()=>{
    if(!municipalityId)return;
    const controller=new AbortController();const timeout=setTimeout(()=>{
      setStatus("loading");const params=new URLSearchParams({municipalityId,q:query,locality});
      void fetch(`/api/territory/streets?${params}`,{signal:controller.signal})
        .then(async response=>{if(!response.ok)throw new Error("Catalogo non disponibile");return responseSchema.parse(await response.json())})
        .then(({streets})=>{setResults(streets);setStatus("idle")})
        .catch(error=>{if(!controller.signal.aborted){setStatus("error");console.error(error)}});
    },200);
    return()=>{clearTimeout(timeout);controller.abort()};
  },[municipalityId,query,locality]);
  const available=useMemo(()=>municipalityId?results.filter(street=>!excludedIds.includes(street.id)):[],[results,excludedIds,municipalityId]);
  function toggle(street:CanonicalStreet){setSelected(current=>{
    if(current.some(item=>item.id===street.id))return current.filter(item=>item.id!==street.id);
    return multiple?[...current,street]:[street];
  })}
  return <div className="street-catalog-picker">
    <div className="fields-grid"><label>Cerca via ANNCSU<input aria-label="Cerca via ANNCSU" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Odonimo completo o parte" disabled={!municipalityId}/></label>
      <label>Filtra per località<input aria-label="Filtra per località" value={locality} onChange={event=>setLocality(event.target.value)} placeholder="Località o frazione" disabled={!municipalityId}/></label></div>
    {status==="loading"&&<p className="muted">Ricerca vie…</p>}{status==="error"&&<p className="form-error">Impossibile caricare le vie. Modifica la ricerca per riprovare.</p>}
    {selected.map(street=><input key={street.id} type="hidden" name={inputName} value={street.id}/>)}
    {selected.length>0&&<p className="muted">Selezionate: {selected.map(street=>`${street.name}${street.localityName?` (${street.localityName})`:""}`).join(" · ")}</p>}
    <div className="check-grid" role="group" aria-label="Vie del Comune">
      {available.map(street=><label className="check-card" key={street.id}>
        <input type={multiple?"checkbox":"radio"} checked={selected.some(item=>item.id===street.id)} onChange={()=>toggle(street)}/>
        <span><strong>{street.name}</strong><small>{street.localityName??"Località non indicata"} · {street.totalAccesses} accessi · {street.sourceKind==="OFFICIAL_ANNCSU"?`ANNCSU ${street.anncsuProgressivoNazionale}`:"Eccezione manuale"}</small></span>
      </label>)}
    </div>
    {municipalityId&&status==="idle"&&available.length===0&&<p className="muted">Nessuna via trovata per questa ricerca.</p>}
    {available.length===100&&<p className="muted">Mostrate le prime 100 vie. Affina la ricerca per altri risultati.</p>}
  </div>;
}
