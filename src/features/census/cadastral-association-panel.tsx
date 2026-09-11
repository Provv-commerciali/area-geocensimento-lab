"use client";

import { useState } from "react";
import type { CadastralFeatureInfo } from "@/services/cadastral-feature";
import type { CensusRecord, Civic } from "@/domain/census";
import { CadastralPicker } from "./cadastral-picker";

export function CadastralAssociationPanel({record,civic,databaseMode}:{record:CensusRecord;civic?:Civic;databaseMode:boolean}){
  const [open,setOpen]=useState(false);const [saved,setSaved]=useState<CadastralFeatureInfo|null>(record.cadastralAssociation?{municipalityCode:record.cadastralAssociation.municipalityCode,municipalityName:record.cadastralAssociation.municipalityName,section:record.cadastralAssociation.section,sheet:record.cadastralAssociation.sheet,parcel:record.cadastralAssociation.parcel,featureType:record.cadastralAssociation.featureType}:null);
  const address=`${record.streetName}, ${record.civicNumber}${record.civicExtension?`/${record.civicExtension}`:""}, ${record.zoneName}, Italia`;
  return <section className="panel cadastral-panel"><div className="panel-heading"><div><p className="eyebrow">Dati catastali</p><h2>{saved?"Particella associata":"Non associati"}</h2></div><button type="button" className="button secondary" onClick={()=>setOpen(true)}>{saved?"Correggi particella sulla mappa":"Individua particella sulla mappa"}</button></div>{saved?<dl><div><dt>Comune catastale</dt><dd>{saved.municipalityName??saved.municipalityCode} ({saved.municipalityCode})</dd></div><div><dt>Sezione</dt><dd>{saved.section??"non restituita"}</dd></div><div><dt>Foglio / particella</dt><dd>{saved.sheet} / {saved.parcel}</dd></div><div><dt>Tipo</dt><dd>{saved.featureType??"non restituito"}</dd></div></dl>:<><p className="muted">Nessuna geometria catastale ufficiale è stata confermata per questo contesto immobile.</p>{(record.sheet||record.parcel)&&<p><strong>Dati manuali attuali:</strong> foglio {record.sheet??"—"}, particella {record.parcel??"—"}. Puoi verificarli o correggerli sulla mappa.</p>}</>}{open&&<CadastralPicker recordId={record.id} civic={civic} address={address} databaseMode={databaseMode} onClose={()=>setOpen(false)} onSaved={setSaved}/>}</section>
}
