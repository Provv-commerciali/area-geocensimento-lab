"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import type { CensusZone } from "@/domain/census";
import { createComplexAction, updateComplexAction, type ComplexCreateResult } from "./actions";

type Selection={id:string;label:string;streetId:string;streetLabel:string};
type Initial={zoneId:string;streetId:string;streetLabel:string;accessId:string;accessLabel:string;id?:string;name?:string;sheet?:string;parcel?:string;units?:number;description?:string;others?:Selection[]};
const streetResponse=z.object({streets:z.array(z.object({id:z.string(),name:z.string()})),total:z.number()});
const accessResponse=z.object({accesses:z.array(z.object({id:z.string(),number:z.string(),extension:z.string().optional()})),hasMore:z.boolean().optional()});
export function ComplexCreateForm({zones,initial,onCreated,onCancel,databaseMode=true}:{zones:CensusZone[];initial?:Initial;onCreated?:(result:Extract<ComplexCreateResult,{id:string}>)=>void;onCancel?:()=>void;databaseMode?:boolean}){
  const router=useRouter();
  const [zoneId,setZoneId]=useState(initial?.zoneId??"");
  const [streetId,setStreetId]=useState(initial?.streetId??"");
  const [streetLabel,setStreetLabel]=useState(initial?.streetLabel??"");
  const [accessId,setAccessId]=useState(initial?.accessId??"");
  const [accessLabel,setAccessLabel]=useState(initial?.accessLabel??"");
  const [streetQuery,setStreetQuery]=useState("");
  const [accessQuery,setAccessQuery]=useState("");
  const [streets,setStreets]=useState<{id:string;name:string}[]>([]);
  const [accesses,setAccesses]=useState<{id:string;number:string;extension?:string}[]>([]);
  const [streetPage,setStreetPage]=useState(1);
  const [accessPage,setAccessPage]=useState(1);
  const [streetTotal,setStreetTotal]=useState(0);
  const [accessMore,setAccessMore]=useState(false);
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
    }catch{if(!controller.signal.aborted)setError("Ricerca vie non disponibile.")}},streetQuery?200:0);
    return()=>{clearTimeout(timer);controller.abort()};
  },[zoneId,streetQuery,streetPage]);
  useEffect(()=>{
    if(!streetId)return;
    const controller=new AbortController();const timer=setTimeout(async()=>{try{
      const response=await fetch(`/api/territory/accesses?zoneId=${zoneId}&streetId=${streetId}&q=${encodeURIComponent(accessQuery)}&page=${accessPage}`,{signal:controller.signal});
      if(!response.ok)throw new Error();const parsed=accessResponse.parse(await response.json());
      setAccesses(parsed.accesses);setAccessMore(parsed.hasMore??false);
    }catch{if(!controller.signal.aborted)setError("Ricerca civici non disponibile.")}},accessQuery?200:0);
    return()=>{clearTimeout(timer);controller.abort()};
  },[zoneId,streetId,accessQuery,accessPage]);
  useEffect(()=>{
    if(!adding||!zoneId)return;
    const controller=new AbortController();const timer=setTimeout(async()=>{try{
      const response=await fetch(`/api/territory/zone-streets?zoneId=${zoneId}&q=${encodeURIComponent(otherStreetQuery)}&page=${otherStreetPage}`,{signal:controller.signal});
      if(!response.ok)throw new Error();const parsed=streetResponse.parse(await response.json());setOtherStreets(parsed.streets);setOtherStreetTotal(parsed.total);
    }catch{if(!controller.signal.aborted)setError("Ricerca vie non disponibile.")}},otherStreetQuery?200:0);
    return()=>{clearTimeout(timer);controller.abort()};
  },[adding,zoneId,otherStreetQuery,otherStreetPage]);
  useEffect(()=>{
    if(!adding||!otherStreetId)return;
    const controller=new AbortController();const timer=setTimeout(async()=>{try{
      const response=await fetch(`/api/territory/accesses?zoneId=${zoneId}&streetId=${otherStreetId}&q=${encodeURIComponent(otherAccessQuery)}&page=${otherAccessPage}`,{signal:controller.signal});
      if(!response.ok)throw new Error();const parsed=accessResponse.parse(await response.json());setOtherAccesses(parsed.accesses);setOtherAccessMore(parsed.hasMore??false);
    }catch{if(!controller.signal.aborted)setError("Ricerca civici non disponibile.")}},otherAccessQuery?200:0);
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
  const streetOptions=streetId&&!streets.some(item=>item.id===streetId)?[{id:streetId,name:streetLabel},...streets]:streets;
  const accessOptions=accessId&&!accesses.some(item=>item.id===accessId)?[{id:accessId,number:accessLabel},...accesses]:accesses;
  return <div className="record-form complex-create-form">
    {error&&<div role="alert" className="error-banner">{error}</div>}
    <section className="form-section"><div className="section-title"><span>01</span><div><h2>Dati del complesso</h2><p>Identità e riferimenti generali</p></div></div><div className="fields-grid">
      <label>Nome complesso *<input value={name} onChange={event=>setName(event.target.value)} maxLength={200}/></label>
      <label>Zona di censimento *<select value={zoneId} onChange={event=>{setZoneId(event.target.value);setStreetId("");setStreetLabel("");setAccessId("");setAccessLabel("");setStreets([]);setAccesses([]);setOthers([]);setAdding(false);setOtherStreetId("");setOtherAccessId("")}} disabled={Boolean(initial?.zoneId)}><option value="">Seleziona…</option>{zones.map(zone=><option key={zone.id} value={zone.id}>{zone.name} · {zone.municipality}</option>)}</select></label>
      <label>Foglio<input value={sheet} onChange={event=>setSheet(event.target.value)}/></label>
      <label>Particella<input value={parcel} onChange={event=>setParcel(event.target.value)}/></label>
      <label>N° unità<input value={units} onChange={event=>setUnits(event.target.value)} type="number" min="1"/></label>
      <label className="wide">Descrizione<textarea rows={3} value={description} onChange={event=>setDescription(event.target.value)}/></label>
    </div></section>
    <section className="form-section"><div className="section-title"><span>02</span><div><h2>Localizzazione</h2><p>Seleziona l’accesso principale; gli altri possono trovarsi anche su vie diverse della stessa Zona.</p></div></div>
      <div className="fields-grid">
        <label>Cerca via / indirizzo<input value={streetQuery} onChange={event=>{setStreetQuery(event.target.value);setStreetPage(1)}} disabled={!zoneId} placeholder="Nome via"/></label>
        <label>Via / indirizzo *<select value={streetId} disabled={!zoneId} onChange={event=>{const id=event.target.value;setStreetId(id);setStreetLabel(streetOptions.find(item=>item.id===id)?.name??"");setAccessId("");setAccesses([]);setAccessQuery("");setAccessPage(1)}}><option value="">Seleziona…</option>{streetOptions.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <div className="complex-page-controls"><button type="button" className="button secondary" disabled={streetPage===1} onClick={()=>setStreetPage(page=>page-1)}>Precedenti</button><span>{streetTotal} vie</span><button type="button" className="button secondary" disabled={streetPage*30>=streetTotal} onClick={()=>setStreetPage(page=>page+1)}>Altre</button></div>
        <label>Cerca civico<input value={accessQuery} onChange={event=>{setAccessQuery(event.target.value);setAccessPage(1)}} disabled={!streetId} placeholder="Numero o SNC"/></label>
        <label>Civico principale *<select value={accessId} disabled={!streetId} onChange={event=>{const id=event.target.value;setAccessId(id);setAccessLabel(accessText(accessOptions.find(item=>item.id===id)??{number:""}));setOthers(current=>current.filter(item=>item.id!==id))}}><option value="">Seleziona…</option>{accessOptions.map(item=><option key={item.id} value={item.id}>{accessText(item)}</option>)}</select></label>
        <div className="complex-page-controls"><button type="button" className="button secondary" disabled={accessPage===1} onClick={()=>setAccessPage(page=>page-1)}>Precedenti</button><button type="button" className="button secondary" disabled={!accessMore} onClick={()=>setAccessPage(page=>page+1)}>Altri civici</button></div>
      </div>
      <div className="complex-extra-accesses"><h3>Altri accessi del complesso</h3>{others.length?others.map(item=><div className="complex-access-row" key={item.id}><span>{item.streetLabel} {item.label}</span><button type="button" className="text-button" onClick={()=>setOthers(current=>current.filter(access=>access.id!==item.id))}>Rimuovi</button></div>):<p className="muted">Nessun altro accesso aggiunto.</p>}
        {adding&&<div className="complex-add-access"><div className="fields-grid"><label>Cerca via<input value={otherStreetQuery} onChange={event=>{setOtherStreetQuery(event.target.value);setOtherStreetPage(1)}} placeholder="Nome via"/></label><label>Via / indirizzo<select value={otherStreetId} onChange={event=>{const id=event.target.value;setOtherStreetId(id);setOtherStreetLabel(otherStreets.find(item=>item.id===id)?.name??"");setOtherAccessId("")}}><option value="">Seleziona…</option>{otherStreets.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="complex-page-controls"><button type="button" className="button secondary" disabled={otherStreetPage===1} onClick={()=>setOtherStreetPage(page=>page-1)}>Precedenti</button><span>{otherStreetTotal} vie</span><button type="button" className="button secondary" disabled={otherStreetPage*30>=otherStreetTotal} onClick={()=>setOtherStreetPage(page=>page+1)}>Altre</button></div><label>Cerca civico<input value={otherAccessQuery} onChange={event=>{setOtherAccessQuery(event.target.value);setOtherAccessPage(1)}} disabled={!otherStreetId} placeholder="Numero o SNC"/></label><label>Civico<select value={otherAccessId} disabled={!otherStreetId} onChange={event=>{const id=event.target.value;setOtherAccessId(id);setOtherAccessLabel(accessText(otherAccesses.find(item=>item.id===id)??{number:""}))}}><option value="">Seleziona…</option>{otherAccesses.map(item=><option key={item.id} value={item.id}>{accessText(item)}</option>)}</select></label><div className="complex-page-controls"><button type="button" className="button secondary" disabled={otherAccessPage===1} onClick={()=>setOtherAccessPage(page=>page-1)}>Precedenti</button><button type="button" className="button secondary" disabled={!otherAccessMore} onClick={()=>setOtherAccessPage(page=>page+1)}>Altri civici</button></div></div><div className="button-row"><button type="button" className="button primary" disabled={!otherAccessId||otherAccessId===accessId||others.some(item=>item.id===otherAccessId)} onClick={()=>{setOthers(current=>[...current,{id:otherAccessId,label:otherAccessLabel,streetId:otherStreetId,streetLabel:otherStreetLabel}]);setAdding(false);setOtherAccessId("")}}>Aggiungi accesso</button><button type="button" className="button secondary" onClick={()=>setAdding(false)}>Annulla</button></div></div>}
        {!adding&&<button type="button" className="button secondary" disabled={!zoneId} onClick={()=>setAdding(true)}>+ Aggiungi civico / accesso</button>}
      </div>
    </section>
    <div className="form-footer"><span>{databaseMode?"Salvataggio nel database LAB":"Dimostrazione in sola lettura"}</span><div className="button-row">{onCancel&&<button type="button" className="button secondary" onClick={onCancel}>Annulla</button>}<button type="button" className="button primary" disabled={saving||!databaseMode} onClick={()=>void save()}>{saving?"Salvataggio…":initial?.id?"Salva modifiche":"Salva complesso"}</button></div></div>
  </div>;
}
