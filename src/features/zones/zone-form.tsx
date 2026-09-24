"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Save } from "lucide-react";
import { z } from "zod";
import type { Country, Municipality, Operator, Province, Region } from "@/domain/census";
import { createZoneAction } from "./actions";
import { StreetCatalogPicker } from "./street-catalog-picker";

interface Props { countries:Country[]; regions:Region[]; provinces:Province[]; municipalities?:Municipality[]; operators:Operator[]; databaseMode:boolean }
const municipalitiesResponseSchema=z.object({municipalities:z.array(z.object({id:z.string(),provinceId:z.string(),name:z.string(),istatCode:z.string().optional(),cadastralCode:z.string().optional()}))});
function ZoneSubmitButtons({databaseMode}:{databaseMode:boolean}){const{pending}=useFormStatus();return <div className="button-row"><button className="button secondary" name="intent" value="list" disabled={pending||!databaseMode}>Salva e torna all’elenco</button><button className="button primary" name="intent" value="streets" disabled={pending||!databaseMode}><Save size={17}/>{pending?"Salvataggio…":"Salva e gestisci le vie"}</button></div>}

export function ZoneForm({countries,regions,provinces,municipalities=[],operators,databaseMode}:Props){
  const[state,action]=useActionState(createZoneAction,{});
  const[countryId,setCountryId]=useState("");const[regionId,setRegionId]=useState("");
  const[provinceId,setProvinceId]=useState("");const[municipalityId,setMunicipalityId]=useState("");
  const[availableMunicipalities,setAvailableMunicipalities]=useState<Municipality[]>([]);
  const[municipalitiesState,setMunicipalitiesState]=useState<"idle"|"loading"|"error">("idle");
  const municipalitiesRequest=useRef(0);
  const allowedRegions=regions.filter(region=>region.countryId===countryId);
  const allowedProvinces=provinces.filter(province=>province.regionId===regionId);
  function selectProvince(nextId:string){
    const requestId=++municipalitiesRequest.current;setProvinceId(nextId);setMunicipalityId("");
    const embedded=municipalities.filter(municipality=>municipality.provinceId===nextId);
    if(!nextId){setAvailableMunicipalities([]);setMunicipalitiesState("idle");return;}
    if(embedded.length){setAvailableMunicipalities(embedded);setMunicipalitiesState("idle");return;}
    setAvailableMunicipalities([]);setMunicipalitiesState("loading");
    void fetch(`/api/territory/municipalities?provinceId=${encodeURIComponent(nextId)}`)
      .then(async response=>{if(!response.ok)throw new Error();return municipalitiesResponseSchema.parse(await response.json())})
      .then(({municipalities:loaded})=>{if(requestId!==municipalitiesRequest.current)return;setAvailableMunicipalities(loaded);setMunicipalitiesState("idle")})
      .catch(()=>{if(requestId===municipalitiesRequest.current)setMunicipalitiesState("error")});
  }
  return <form className="record-form" action={action}>
    {state.error&&<div className="error-banner" role="alert"><AlertTriangle/>{state.error}</div>}
    <section className="form-section"><div className="section-title"><span>01</span><div><h2>Territorio e assegnazione</h2><p>Selezione gerarchica delle entità persistenti</p></div></div><div className="fields-grid">
      <label>Nazione *<select name="countryId" required value={countryId} onChange={event=>{setCountryId(event.target.value);setRegionId("");selectProvince("")}}><option value="">Seleziona…</option>{countries.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label>Regione *<select name="regionId" required value={regionId} disabled={!countryId} onChange={event=>{setRegionId(event.target.value);selectProvince("")}}><option value="">Seleziona…</option>{allowedRegions.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label>Provincia *<select name="provinceId" required value={provinceId} disabled={!regionId} onChange={event=>selectProvince(event.target.value)}><option value="">Seleziona…</option>{allowedProvinces.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label>Comune *<select name="municipalityId" required value={municipalityId} disabled={!provinceId||municipalitiesState==="loading"} onChange={event=>setMunicipalityId(event.target.value)}><option value="">{municipalitiesState==="loading"?"Caricamento comuni…":"Seleziona…"}</option>{availableMunicipalities.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select>{municipalitiesState==="error"&&<small className="form-error">Impossibile caricare i comuni. Riseleziona la provincia.</small>}</label>
      <label>Nome zona *<input name="name" required placeholder="es. Centro"/></label>
      <label>Assegnatario *<select name="operatorId" required defaultValue=""><option value="">Seleziona…</option>{operators.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
    </div></section>
    <section className="form-section"><div className="section-title"><span>02</span><div><h2>Vie ANNCSU della zona</h2><p>Cerca per odonimo o località e seleziona più vie. Gli omonimi restano distinti per progressivo.</p></div></div>
      {municipalityId?<StreetCatalogPicker key={municipalityId} municipalityId={municipalityId} inputName="streetIds" multiple/>:<p className="muted">Seleziona prima il Comune.</p>}
      <p className="muted">Non trovi la via? Dopo il salvataggio apri “Modifica zona” e crea un’eccezione manuale motivata.</p>
    </section>
    <div className="form-footer"><span>{databaseMode?"Salvataggio nel database Supabase LAB":"Fallback demo in sola lettura"}</span><ZoneSubmitButtons databaseMode={databaseMode}/></div>
  </form>;
}
