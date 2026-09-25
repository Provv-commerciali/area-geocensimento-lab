"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import type { CanonicalStreet } from "@/domain/territory";

const streetSchema=z.object({id:z.string(),municipalityId:z.string(),name:z.string(),localityName:z.string().optional(),localityId:z.string().optional(),totalAccesses:z.number(),sourceKind:z.enum(["OFFICIAL_ANNCSU","MANUAL"]),anncsuProgressivoNazionale:z.string().optional(),isPresentInLatestSnapshot:z.boolean(),manualReviewState:z.enum(["PROPOSED","APPROVED","RETIRED"]).optional()});
const streetResponseSchema=z.object({streets:z.array(streetSchema)});
const localityResponseSchema=z.object({localities:z.array(z.object({id:z.string(),name:z.string()}))});
interface Props { municipalityId:string; inputName:string; multiple?:boolean; excludedIds?:string[] }

export function StreetCatalogPicker({municipalityId,inputName,multiple=true,excludedIds=[]}:Props){
  const [query,setQuery]=useState("");const [locality,setLocality]=useState("");const [showAll,setShowAll]=useState(false);
  const [results,setResults]=useState<CanonicalStreet[]>([]);const [selected,setSelected]=useState<CanonicalStreet[]>([]);const [localities,setLocalities]=useState<{id:string;name:string}[]>([]);
  const [status,setStatus]=useState<"idle"|"loading"|"error">("idle");const [offset,setOffset]=useState(0);
  const active=Boolean(query.trim()||locality||showAll);
  useEffect(()=>{if(!municipalityId)return;const controller=new AbortController();void fetch(`/api/territory/localities?municipalityId=${encodeURIComponent(municipalityId)}`,{signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error();return localityResponseSchema.parse(await response.json())}).then(({localities})=>setLocalities(localities)).catch(()=>{if(!controller.signal.aborted)setLocalities([])});return()=>controller.abort()},[municipalityId]);
  useEffect(()=>{if(!municipalityId||!active)return;const controller=new AbortController();const timeout=setTimeout(()=>{setStatus("loading");const params=new URLSearchParams({municipalityId,q:query,locality,limit:"100",offset:"0"});void fetch(`/api/territory/streets?${params}`,{signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error();return streetResponseSchema.parse(await response.json())}).then(({streets})=>{setResults(streets);setOffset(streets.length);setStatus("idle")}).catch(error=>{if(!controller.signal.aborted){setStatus("error");console.error(error)}})},200);return()=>{clearTimeout(timeout);controller.abort()}},[municipalityId,query,locality,active]);
  const available=useMemo(()=>results.filter(street=>!excludedIds.includes(street.id)),[results,excludedIds]);
  const visible=active?available:[];const allVisibleSelected=visible.length>0&&visible.every(street=>selected.some(item=>item.id===street.id));
  function toggle(street:CanonicalStreet){setSelected(current=>current.some(item=>item.id===street.id)?current.filter(item=>item.id!==street.id):multiple?[...current,street]:[street])}
  function toggleAll(){setSelected(current=>allVisibleSelected?current.filter(item=>!visible.some(street=>street.id===item.id)):[...current,...visible.filter(street=>!current.some(item=>item.id===street.id))])}
  async function loadMore(){setStatus("loading");try{const params=new URLSearchParams({municipalityId,q:query,locality,limit:"100",offset:String(offset)});const response=await fetch(`/api/territory/streets?${params}`);if(!response.ok)throw new Error();const {streets}=streetResponseSchema.parse(await response.json());setResults(current=>[...current,...streets]);setOffset(current=>current+streets.length);setStatus("idle")}catch{setStatus("error")}}
  return <div className="street-catalog-picker">
    <div className="catalog-intro"><h3>Trova vie e indirizzi da aggiungere</h3><p>Cerca per nome oppure scegli prima un’area/località.</p></div>
    <div className="catalog-controls"><label>Area / località<select aria-label="Area / località" value={locality} onChange={event=>setLocality(event.target.value)} disabled={!municipalityId}><option value="">Tutte le aree / località</option>{localities.map(item=><option value={item.name} key={item.id}>{item.name}</option>)}</select></label><label>Cerca via o indirizzo<input aria-label="Cerca via o indirizzo" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Cerca per nome..." disabled={!municipalityId}/></label><button type="button" className="button secondary" onClick={()=>setShowAll(true)} disabled={!municipalityId||showAll}>Mostra tutti</button></div>
    {!active&&<p className="catalog-empty">Cerca una via/indirizzo oppure scegli un’area/località per iniziare.</p>}
    {status==="loading"&&<p className="muted">Ricerca in corso…</p>}{status==="error"&&<p className="form-error">Impossibile caricare le vie. Modifica la ricerca per riprovare.</p>}
    {selected.map(street=><input key={street.id} type="hidden" name={inputName} value={street.id}/>)}
    {selected.length>0&&<p className="catalog-selection">Selezionati: {selected.length}</p>}
    {visible.length>0&&<div className="catalog-results"><div className="catalog-results-header"><strong>{visible.length} risultati</strong><label className="checkbox"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll}/>Seleziona tutti i risultati</label></div><div className="catalog-list">{visible.map(street=><label className="catalog-result" key={street.id}><input type={multiple?"checkbox":"radio"} checked={selected.some(item=>item.id===street.id)} onChange={()=>toggle(street)}/><span><strong>{street.name}</strong>{street.localityName&&<small>{street.localityName}</small>}</span><em>{street.totalAccesses} {street.totalAccesses===1?"civico":"civici"}</em></label>)}</div>{results.length>0&&results.length%100===0&&<button type="button" className="text-button" onClick={loadMore} disabled={status==="loading"}>Mostra altri risultati</button>}</div>}
    {active&&status==="idle"&&visible.length===0&&<p className="muted">Nessuna via o indirizzo trovato.</p>}
  </div>;
}
