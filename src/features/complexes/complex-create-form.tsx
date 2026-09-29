"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import type { CensusZone } from "@/domain/census";
import { createComplexAction, updateComplexAction, type ComplexCreateResult } from "./actions";

type Selection={id:string;label:string;streetId:string;streetLabel:string};
type Initial={zoneId:string;streetId:string;streetLabel:string;accessId:string;accessLabel:string;id?:string;name?:string;sheet?:string;parcel?:string;units?:number;description?:string;others?:Selection[]};
function SearchResultPicker({label,placeholder,query,onQueryChange,options,onSelect,selectedId,disabled,loading,page,onPageChange,hasMore,summary}:{label:string;placeholder:string;query:string;onQueryChange:(value:string)=>void;options:{id:string;label:string}[];onSelect:(option:{id:string;label:string})=>void;selectedId:string;disabled?:boolean;loading:boolean;page:number;onPageChange:(page:number)=>void;hasMore:boolean;summary?:string}){
  const [open,setOpen]=useState(false);
  return <div className="complex-picker" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}} onKeyDown={event=>{if(event.key==="Escape")setOpen(false)}}>
    <label>{label}<input value={query} onFocus={()=>setOpen(true)} onChange={event=>{onQueryChange(event.target.value);setOpen(true)}} disabled={disabled} placeholder={placeholder} autoComplete="off"/></label>
    {selectedId&&!open&&<small className="complex-picker-selected">✓ Selezionato</small>}
    {open&&!disabled&&<div className="complex-picker-results"><div className="complex-picker-options">{loading?<p>Ricerca in corso…</p>:options.length?options.map(option=><button type="button" key={option.id} className={option.id===selectedId?"is-selected":""} onClick={()=>{onSelect(option);setOpen(false)}}>{option.label}{option.id===selectedId&&<span>✓</span>}</button>):<p>Nessun risultato. Prova un altro termine.</p>}</div><div className="complex-picker-pagination"><span>{summary??""}</span><button type="button" disabled={page===1||loading} onClick={()=>onPageChange(page-1)}>Precedenti</button><button type="button" disabled={!hasMore||loading} onClick={()=>onPageChange(page+1)}>Altri risultati</button></div></div>}
  </div>;
}
const streetResponse=z.object({streets:z.array(z.object({id:z.string(),name:z.string()})),total:z.number()});
const accessResponse=z.object({accesses:z.array(z.object({id:z.string(),number:z.string(),extension:z.string().optional()})),hasMore:z.boolean().optional()});
export function ComplexCreateForm({zones,initial,onCreated,onCancel,databaseMode=true}:{zones:CensusZone[];initial?:Initial;onCreated?:(result:Extract<ComplexCreateResult,{id:string}>)=>void;onCancel?:()=>void;databaseMode?:boolean}){
  const router=useRouter();
  const [zoneId,setZoneId]=useState(initial?.zoneId??"");
  const [streetId,setStreetId]=useState(initial?.streetId??"");
  const [accessId,setAccessId]=useState(initial?.accessId??"");
  const [streetQuery,setStreetQuery]=useState(initial?.streetLabel??"");
  const [accessQuery,setAccessQuery]=useState(initial?.accessLabel??"");
  const [streets,setStreets]=useState<{id:string;name:string}[]>([]);
  const [accesses,setAccesses]=useState<{id:string;number:string;extension?:string}[]>([]);
  const [streetPage,setStreetPage]=useState(1);
  const [accessPage,setAccessPage]=useState(1);
  const [streetTotal,setStreetTotal]=useState(0);
  const [accessMore,setAccessMore]=useState(false);
  const [streetLoading,setStreetLoading]=useState(Boolean(initial?.zoneId));
  const [accessLoading,setAccessLoading]=useState(Boolean(initial?.streetId));
  const [others,setOthers]=useState<Selection[]>(initial?.others??[]);
  const [adding,setAdding]=useState(false);
  const [otherStreetId,setOtherStreetId]=useState("");
  const [otherStreetLabel,setOtherStreetLabel]=useState("");
  const [otherAccessId,setOtherAccessId]=useState("");
  const [otherAccessLabel,setOtherAccessLabel]=useState("");
  const [otherStreetQuery,setOtherStreetQuery]=useState("");
  const [otherAccessQuery,setOtherAccessQuery]=useState("");
  const [otherStreets,setOtherStreets]=useState<{id:string;name:string}[]>([]);
  const [otherAccesses,setOtherAccesses]=useState<{id:string;number:string;extension?:string}[]>([]);
  const [otherStreetPage,setOtherStreetPage]=useState(1);
  const [otherAccessPage,setOtherAccessPage]=useState(1);
  const [otherStreetTotal,setOtherStreetTotal]=useState(0);
  const [otherAccessMore,setOtherAccessMore]=useState(false);
  const [otherStreetLoading,setOtherStreetLoading]=useState(false);
  const [otherAccessLoading,setOtherAccessLoading]=useState(false);
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);
  const [name,setName]=useState(initial?.name??"");const [sheet,setSheet]=useState(initial?.sheet??"");const [parcel,setParcel]=useState(initial?.parcel??"");
  const [units,setUnits]=useState(initial?.units?.toString()??"");const [description,setDescription]=useState(initial?.description??"");

  useEffect(()=>{
    if(!zoneId)return;
    const controller=new AbortController();
    const timer=setTimeout(async()=>{try{
      const response=await fetch(`/api/territory/zone-streets?zoneId=${zoneId}&q=${encodeURIComponent(streetQuery)}&page=${streetPage}`,{signal:controller.signal});
      if(!response.ok)throw new Error();const parsed=streetResponse.parse(await response.json());
      setStreets(parsed.streets);setStreetTotal(parsed.total);
    }catch{if(!controller.signal.aborted)setError("Ricerca vie non disponibile.")}finally{if(!controller.signal.aborted)setStreetLoading(false)}},streetQuery?200:0);
    return()=>{clearTimeout(timer);controller.abort()};
  },[zoneId,streetQuery,streetPage]);
  useEffect(()=>{
    if(!streetId)return;
    const controller=new AbortController();const timer=setTimeout(async()=>{try{
      const response=await fetch(`/api/territory/accesses?zoneId=${zoneId}&streetId=${streetId}&q=${encodeURIComponent(accessQuery)}&page=${accessPage}`,{signal:controller.signal});
      if(!response.ok)throw new Error();const parsed=accessResponse.parse(await response.json());
      setAccesses(parsed.accesses);setAccessMore(parsed.hasMore??false);
    }catch{if(!controller.signal.aborted)setError("Ricerca civici non disponibile.")}finally{if(!controller.signal.aborted)setAccessLoading(false)}},accessQuery?200:0);
    return()=>{clearTimeout(timer);controller.abort()};
  },[zoneId,streetId,accessQuery,accessPage]);
  useEffect(()=>{
    if(!adding||!zoneId)return;
    const controller=new AbortController();const timer=setTimeout(async()=>{try{
      const response=await fetch(`/api/territory/zone-streets?zoneId=${zoneId}&q=${encodeURIComponent(otherStreetQuery)}&page=${otherStreetPage}`,{signal:controller.signal});
      if(!response.ok)throw new Error();const parsed=streetResponse.parse(await response.json());setOtherStreets(parsed.streets);setOtherStreetTotal(parsed.total);
    }catch{if(!controller.signal.aborted)setError("Ricerca vie non disponibile.")}finally{if(!controller.signal.aborted)setOtherStreetLoading(false)}},otherStreetQuery?200:0);
    return()=>{clearTimeout(timer);controller.abort()};
  },[adding,zoneId,otherStreetQuery,otherStreetPage]);
  useEffect(()=>{
    if(!adding||!otherStreetId)return;
    const controller=new AbortController();const timer=setTimeout(async()=>{try{
      const response=await fetch(`/api/territory/accesses?zoneId=${zoneId}&streetId=${otherStreetId}&q=${encodeURIComponent(otherAccessQuery)}&page=${otherAccessPage}`,{signal:controller.signal});
      if(!response.ok)throw new Error();const parsed=accessResponse.parse(await response.json());setOtherAccesses(parsed.accesses);setOtherAccessMore(parsed.hasMore??false);
    }catch{if(!controller.signal.aborted)setError("Ricerca civici non disponibile.")}finally{if(!controller.signal.aborted)setOtherAccessLoading(false)}},otherAccessQuery?200:0);
    return()=>{clearTimeout(timer);controller.abort()};
  },[adding,zoneId,otherStreetId,otherAccessQuery,otherAccessPage]);

  async function save(){
    if(!name.trim()||!zoneId||!streetId||!accessId){setError("Compila nome, Zona, Via e Civico principale.");return}
    setSaving(true);setError("");
    try{const input={name,zoneId,primaryAccessId:accessId,otherAccessIds:others.map(item=>item.id),sheet,parcel,units:units?Number(units):null,description};
      const result=initial?.id?await updateComplexAction({...input,id:initial.id}):await createComplexAction(input);
      if("error" in result){setError(result.error);return}
      if(onCreated)onCreated(result);else router.push(`/censimento/complessi/${result.id}`);
    }catch{setError("Salvataggio non disponibile. Riprova.")}
    finally{setSaving(false)}
  }
  const accessText=(row:{number:string;extension?:string})=>`${row.number}${row.extension?`/${row.extension}`:""}`;
  return <div className="record-form complex-create-form">
    {error&&<div role="alert" className="error-banner">{error}</div>}
    <section className="form-section"><div className="section-title"><span>01</span><div><h2>Dati del complesso</h2><p>Identità e riferimenti generali</p></div></div><div className="fields-grid">
      <label>Nome complesso *<input value={name} onChange={event=>setName(event.target.value)} maxLength={200}/></label>
      <label>Zona di censimento *<select value={zoneId} onChange={event=>{setZoneId(event.target.value);setStreetLoading(Boolean(event.target.value));setStreetId("");setStreetQuery("");setAccessId("");setAccessQuery("");setStreets([]);setAccesses([]);setOthers([]);setAdding(false);setOtherStreetId("");setOtherAccessId("")}} disabled={Boolean(initial?.zoneId)}><option value="">Seleziona…</option>{zones.map(zone=><option key={zone.id} value={zone.id}>{zone.name} · {zone.municipality}</option>)}</select></label>
      <label>Foglio<input value={sheet} onChange={event=>setSheet(event.target.value)}/></label>
      <label>Particella<input value={parcel} onChange={event=>setParcel(event.target.value)}/></label>
      <label>N° unità<input value={units} onChange={event=>setUnits(event.target.value)} type="number" min="1"/></label>
      <label className="wide">Descrizione<textarea rows={3} value={description} onChange={event=>setDescription(event.target.value)}/></label>
    </div></section>
    <section className="form-section"><div className="section-title"><span>02</span><div><h2>Localizzazione</h2><p>Seleziona l’accesso principale; gli altri possono trovarsi anche su vie diverse della stessa Zona.</p></div></div>
      <div className="fields-grid">
        <SearchResultPicker label="Via / indirizzo *" placeholder="Scrivi il nome e scegli la via" query={streetQuery} selectedId={streetId} disabled={!zoneId} loading={streetLoading} options={streets.map(item=>({id:item.id,label:item.name}))} page={streetPage} onPageChange={setStreetPage} hasMore={streetPage*30<streetTotal} summary={`${streetTotal} vie trovate`} onQueryChange={value=>{setStreetQuery(value);setStreetPage(1);setStreets([]);setStreetLoading(true);setStreetId("");setAccessId("");setAccessQuery("");setAccesses([])}} onSelect={option=>{setStreetId(option.id);setStreetQuery(option.label);setAccessLoading(true);setAccessId("");setAccessQuery("");setAccesses([]);setAccessPage(1)}}/>
        <SearchResultPicker label="Civico principale *" placeholder="Scrivi il numero e scegli il civico" query={accessQuery} selectedId={accessId} disabled={!streetId} loading={accessLoading} options={accesses.map(item=>({id:item.id,label:accessText(item)}))} page={accessPage} onPageChange={setAccessPage} hasMore={accessMore} onQueryChange={value=>{setAccessQuery(value);setAccessPage(1);setAccesses([]);setAccessLoading(true);setAccessId("")}} onSelect={option=>{setAccessId(option.id);setAccessQuery(option.label);setOthers(current=>current.filter(item=>item.id!==option.id))}}/>
      </div>
      <div className="complex-extra-accesses"><h3>Altri accessi del complesso</h3>{others.length?others.map(item=><div className="complex-access-row" key={item.id}><span>{item.streetLabel} {item.label}</span><button type="button" className="text-button" onClick={()=>setOthers(current=>current.filter(access=>access.id!==item.id))}>Rimuovi</button></div>):<p className="muted">Nessun altro accesso aggiunto.</p>}
        {adding&&<div className="complex-add-access"><div className="fields-grid">
          <SearchResultPicker label="Via / indirizzo" placeholder="Scrivi il nome e scegli la via" query={otherStreetQuery} selectedId={otherStreetId} loading={otherStreetLoading} options={otherStreets.map(item=>({id:item.id,label:item.name}))} page={otherStreetPage} onPageChange={setOtherStreetPage} hasMore={otherStreetPage*30<otherStreetTotal} summary={`${otherStreetTotal} vie trovate`} onQueryChange={value=>{setOtherStreetQuery(value);setOtherStreetPage(1);setOtherStreets([]);setOtherStreetLoading(true);setOtherStreetId("");setOtherStreetLabel("");setOtherAccessId("");setOtherAccessLabel("");setOtherAccessQuery("");setOtherAccesses([])}} onSelect={option=>{setOtherStreetId(option.id);setOtherStreetLabel(option.label);setOtherStreetQuery(option.label);setOtherAccessLoading(true);setOtherAccessId("");setOtherAccessLabel("");setOtherAccessQuery("");setOtherAccesses([]);setOtherAccessPage(1)}}/>
          <SearchResultPicker label="Civico" placeholder="Scrivi il numero e scegli il civico" query={otherAccessQuery} selectedId={otherAccessId} disabled={!otherStreetId} loading={otherAccessLoading} options={otherAccesses.map(item=>({id:item.id,label:accessText(item)}))} page={otherAccessPage} onPageChange={setOtherAccessPage} hasMore={otherAccessMore} onQueryChange={value=>{setOtherAccessQuery(value);setOtherAccessPage(1);setOtherAccesses([]);setOtherAccessLoading(true);setOtherAccessId("");setOtherAccessLabel("")}} onSelect={option=>{setOtherAccessId(option.id);setOtherAccessLabel(option.label);setOtherAccessQuery(option.label)}}/>
        </div><div className="button-row"><button type="button" className="button primary" disabled={!otherAccessId||otherAccessId===accessId||others.some(item=>item.id===otherAccessId)} onClick={()=>{setOthers(current=>[...current,{id:otherAccessId,label:otherAccessLabel,streetId:otherStreetId,streetLabel:otherStreetLabel}]);setAdding(false);setOtherAccessId("")}}>Aggiungi accesso</button><button type="button" className="button secondary" onClick={()=>setAdding(false)}>Annulla</button></div></div>}
        {!adding&&<button type="button" className="button secondary" disabled={!zoneId} onClick={()=>{setOtherStreetLoading(true);setAdding(true)}}>+ Aggiungi civico / accesso</button>}
      </div>
    </section>
    <div className="form-footer"><span>{databaseMode?"Salvataggio nel database LAB":"Dimostrazione in sola lettura"}</span><div className="button-row">{onCancel&&<button type="button" className="button secondary" onClick={onCancel}>Annulla</button>}<button type="button" className="button primary" disabled={saving||!databaseMode} onClick={()=>void save()}>{saving?"Salvataggio…":initial?.id?"Salva modifiche":"Salva complesso"}</button></div></div>
  </div>;
}
