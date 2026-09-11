"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Save } from "lucide-react";
import type { Country, Municipality, Operator, Province, Region, Street } from "@/domain/census";
import { createZoneAction } from "./actions";

interface Props { countries:Country[]; regions:Region[]; provinces:Province[]; municipalities:Municipality[]; operators:Operator[]; streets:Street[]; databaseMode:boolean }

function ZoneSubmitButtons({databaseMode}:{databaseMode:boolean}){const {pending}=useFormStatus();return <div className="button-row"><button className="button secondary" name="intent" value="list" disabled={pending||!databaseMode}>Salva e torna all’elenco</button><button className="button primary" name="intent" value="streets" disabled={pending||!databaseMode}><Save size={17}/>{pending?"Salvataggio…":"Salva e definisci le vie"}</button></div>}

export function ZoneForm({countries,regions,provinces,municipalities,operators,streets,databaseMode}:Props){
  const [state,action]=useActionState(createZoneAction,{});const [countryId,setCountryId]=useState("");const [regionId,setRegionId]=useState("");const [provinceId,setProvinceId]=useState("");const [municipalityId,setMunicipalityId]=useState("");
  const allowedRegions=regions.filter((region)=>region.countryId===countryId);const allowedProvinces=provinces.filter((province)=>province.regionId===regionId);const allowedMunicipalities=municipalities.filter((municipality)=>municipality.provinceId===provinceId);const allowedStreets=useMemo(()=>streets.filter((street)=>street.municipalityId===municipalityId),[municipalityId,streets]);
  return <form className="record-form" action={action}>{state.error&&<div className="error-banner" role="alert"><AlertTriangle/>{state.error}</div>}
    <section className="form-section"><div className="section-title"><span>01</span><div><h2>Territorio e assegnazione</h2><p>Selezione gerarchica delle entità persistenti</p></div></div><div className="fields-grid">
      <label>Nazione *<select name="countryId" required value={countryId} onChange={(event)=>{setCountryId(event.target.value);setRegionId("");setProvinceId("");setMunicipalityId("")}}><option value="">Seleziona…</option>{countries.map((country)=><option value={country.id} key={country.id}>{country.name}</option>)}</select></label>
      <label>Regione *<select name="regionId" required value={regionId} disabled={!countryId} onChange={(event)=>{setRegionId(event.target.value);setProvinceId("");setMunicipalityId("")}}><option value="">Seleziona…</option>{allowedRegions.map((region)=><option value={region.id} key={region.id}>{region.name}</option>)}</select></label>
      <label>Provincia *<select name="provinceId" required value={provinceId} disabled={!regionId} onChange={(event)=>{setProvinceId(event.target.value);setMunicipalityId("")}}><option value="">Seleziona…</option>{allowedProvinces.map((province)=><option value={province.id} key={province.id}>{province.name}</option>)}</select></label>
      <label>Comune *<select name="municipalityId" required value={municipalityId} disabled={!provinceId} onChange={(event)=>setMunicipalityId(event.target.value)}><option value="">Seleziona…</option>{allowedMunicipalities.map((municipality)=><option value={municipality.id} key={municipality.id}>{municipality.name}</option>)}</select></label>
      <label>Nome zona *<input name="name" required placeholder="es. Murri"/></label><label>Assegnatario *<select name="operatorId" required defaultValue=""><option value="">Seleziona…</option>{operators.map((operator)=><option value={operator.id} key={operator.id}>{operator.name}</option>)}</select></label>
    </div></section>
    <section className="form-section"><div className="section-title"><span>02</span><div><h2>Vie della zona</h2><p>Seleziona vie esistenti nel Comune oppure creane una nuova</p></div></div>{municipalityId?<><div className="check-grid">{allowedStreets.map((street)=><label className="check-card" key={street.id}><input name="streetIds" value={street.id} type="checkbox"/><span>{street.name}<small>{street.municipality}</small></span></label>)}</div><label className="standalone-field">Nuova Via<input name="newStreetName" placeholder="Inserisci solo se non è già presente"/></label></>:<p className="muted">Seleziona prima il Comune.</p>}</section>
    <div className="form-footer"><span>{databaseMode?"Salvataggio nel database Supabase LAB":"Fallback demo in sola lettura"}</span><ZoneSubmitButtons databaseMode={databaseMode}/></div>
  </form>
}
