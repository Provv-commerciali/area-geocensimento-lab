"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Database, Save } from "lucide-react";
import {
  canShowAppraisal, floorCodes, occupancies, qualifications,
  type BuildingScope, type CensusZone, type Civic, type Complex, type ContactType, type Operator, type Street,
} from "@/domain/census";
import { civics as demoCivics, complexes as demoComplexes, operators as demoOperators, streets as demoStreets, zones as demoZones } from "@/lib/demo-data";
import { createCensusRecordAction, type FormActionState } from "./actions";

interface ContactFormProps { zones?: CensusZone[]; streets?: Street[]; civics?: Civic[]; complexes?: Complex[]; operators?: Operator[]; databaseMode?: boolean; formAction?: (state:FormActionState,data:FormData)=>Promise<FormActionState> }

function SubmitButton({databaseMode}:{databaseMode:boolean}) { const {pending}=useFormStatus(); return <button className="button primary" type="submit" disabled={pending||!databaseMode}><Save size={17}/>{pending?"Salvataggio…":"Salva contatto"}</button> }

export function ContactForm({zones=demoZones,streets=demoStreets,civics=demoCivics,complexes=demoComplexes,operators=demoOperators,databaseMode=false,formAction=createCensusRecordAction}:ContactFormProps) {
  const [state,action]=useActionState(formAction,{}); const [zoneId,setZoneId]=useState(""); const [streetId,setStreetId]=useState(""); const [civicId,setCivicId]=useState(""); const [contactType,setContactType]=useState<ContactType>("Generico"); const [buildingScope,setBuildingScope]=useState<BuildingScope>("Intero edificio");
  const allowedStreets=useMemo(()=>streets.filter((street)=>zones.find((zone)=>zone.id===zoneId)?.streetIds.includes(street.id)),[streets,zoneId,zones]);
  const allowedCivics=useMemo(()=>civics.filter((civic)=>civic.streetId===streetId),[civics,streetId]); const selectedCivic=civics.find((civic)=>civic.id===civicId); const allowedComplexes=complexes.filter((complex)=>complex.civicIds.includes(civicId));
  return <form className="record-form" action={action}>
    {state.error&&<div className="error-banner" role="alert"><AlertTriangle/>{state.error}</div>}
    <div className="form-grid">
      <section className="form-section"><div className="section-title"><span>01</span><div><h2>Indirizzo e immobile</h2><p>Via e civico devono essere già censiti nel territorio</p></div></div><div className="fields-grid">
        <label>Zona di censimento *<select name="zoneId" required value={zoneId} onChange={(event)=>{setZoneId(event.target.value);setStreetId("");setCivicId("")}}><option value="">Seleziona…</option>{zones.map((zone)=><option value={zone.id} key={zone.id}>{zone.name}</option>)}</select></label>
        <label>Via *<select name="streetId" required value={streetId} onChange={(event)=>{setStreetId(event.target.value);setCivicId("")}} disabled={!zoneId}><option value="">Seleziona…</option>{allowedStreets.map((street)=><option value={street.id} key={street.id}>{street.name}</option>)}</select></label>
        <label>Civico *<select name="civicId" required value={civicId} onChange={(event)=>setCivicId(event.target.value)} disabled={!streetId}><option value="">Seleziona…</option>{allowedCivics.map((civic)=><option value={civic.id} key={civic.id}>{civic.number}{civic.extension?`/${civic.extension}`:""}</option>)}</select></label>
        <label>Estensione<input value={selectedCivic?.extension??""} readOnly aria-describedby="extension-help"/><small id="extension-help">Definita separatamente nel civico</small></label>
        <label>Complesso<select name="complexId" disabled={!civicId}><option value="">Nessuno</option>{allowedComplexes.map((complex)=><option value={complex.id} key={complex.id}>{complex.name}</option>)}</select></label>
        <fieldset className="choice-field"><legend>Porzione censita</legend><label><input type="radio" name="buildingScope" value="Intero edificio" checked={buildingScope==="Intero edificio"} onChange={()=>setBuildingScope("Intero edificio")}/> Intero edificio</label><label><input type="radio" name="buildingScope" value="Parte di edificio" checked={buildingScope==="Parte di edificio"} onChange={()=>setBuildingScope("Parte di edificio")}/> Parte di edificio</label></fieldset>
        {buildingScope==="Intero edificio"?<label>Numero di livelli<input name="levels" type="number" min="1"/></label>:<><label>Piano *<select name="floorCode" required><option value="">Seleziona…</option>{floorCodes.map((floor)=><option value={floor} key={floor}>{floor}</option>)}</select></label><label>Numero totale piani<input name="totalFloors" type="number" min="1" placeholder="es. 10"/></label><label className="checkbox"><input name="isTopFloor" type="checkbox"/> Ultimo piano</label></>}
        <label>Numero locali<input name="rooms" type="number" min="0" step="0.5"/></label><label>Superficie (m²)<input name="surface" type="number" min="0" step="0.01"/></label><label>Occupazione<select name="occupancy"><option value="">Non indicata</option>{occupancies.map((occupancy)=><option value={occupancy} key={occupancy}>{occupancy}</option>)}</select></label><label className="checkbox"><input name="elevator" type="checkbox"/> Ascensore</label>
      </div></section>
      <section className="form-section"><div className="section-title"><span>02</span><div><h2>Anagrafica</h2><p>Persona e qualificazione del contatto</p></div></div><div className="fields-grid">
        <label>Nome<input name="firstName"/></label><label>Cognome *<input name="lastName" required/></label><label>Telefono<input name="phone" type="tel"/></label><label>E-mail<input name="email" type="email"/></label><label>Codice fiscale<input name="taxCode"/></label><label>Tipologia contatto<select name="contactType" value={contactType} onChange={(event)=>setContactType(event.target.value as ContactType)}>{["Generico","Informatore","Informazione","Notizia"].map((type)=><option value={type} key={type}>{type}</option>)}</select></label>
        <label>Qualifica<select name="qualification"><option value="">Non indicata</option>{qualifications.map((qualification)=><option value={qualification} key={qualification}>{qualification}</option>)}</select></label><label>Data di nascita<input name="birthDate" type="date"/></label><label>Operatore responsabile<select name="responsibleOperatorId"><option value="">Non assegnato</option>{operators.map((operator)=><option value={operator.id} key={operator.id}>{operator.name}</option>)}</select></label><label className="checkbox"><input name="inherited" type="checkbox"/> Immobile ereditato</label>
        {canShowAppraisal(contactType)&&<label className="checkbox appraisal"><input name="isAppraised" type="checkbox"/> Perizia Immobiliare <small>Flag manuale: Notizia non lo attiva automaticamente.</small></label>}<label className="wide">Annotazioni anagrafiche<textarea name="notes" rows={3}/></label>
      </div></section>
      <section className="form-section"><div className="section-title"><span>03</span><div><h2>Dati catastali manuali</h2><p>Dato operativo, non fonte catastale definitiva</p></div></div><div className="fields-grid four"><label>Foglio<input name="sheet"/></label><label>Particella<input name="parcel"/></label><label>Subalterno<input name="subaltern"/></label><label>Categoria catastale<input name="cadastralCategory" placeholder="es. A/2"/></label></div></section>
    </div>
    <div className="form-footer"><span><Database size={16}/>{databaseMode?"Salvataggio nel database Supabase LAB":"Fallback demo in sola lettura"}</span><SubmitButton databaseMode={databaseMode}/></div>
  </form>;
}
