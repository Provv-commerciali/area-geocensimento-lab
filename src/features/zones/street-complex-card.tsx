"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Building2, ChevronDown, ChevronUp } from "lucide-react";
import { latestInterview, type CensusRecord, type Complex } from "@/domain/census";
import type { StreetComplexSummary } from "@/services/street-complex-summaries";
import { closestRecall } from "./street-operations";

const formatDate=(value?:string)=>value?new Intl.DateTimeFormat("it-IT",{dateStyle:"short"}).format(new Date(value)):"—";

export function StreetComplexCard({complex,summary,records,streetId,fallbackAddress}:{complex:Complex;summary?:StreetComplexSummary;records:CensusRecord[];streetId:string;fallbackAddress:string}){
  const [open,setOpen]=useState(false);
  const accesses=summary?.accesses??[];
  const grouped=new Map<string,CensusRecord[]>();
  for(const record of records)grouped.set(record.civicId,[...(grouped.get(record.civicId)??[]),record]);
  const linkedIds=new Set(accesses.map(access=>access.id));
  const accessGroups=[...accesses];
  for(const record of records)if(!linkedIds.has(record.civicId)){
    accessGroups.push({id:record.civicId,streetId:record.streetId,label:`${record.streetName} ${record.civicNumber}${record.civicExtension?`/${record.civicExtension}`:""}`});
    linkedIds.add(record.civicId);
  }
  const address=summary?.primaryAddress??fallbackAddress;
  return <article className="street-complex-card" aria-label={`Complesso ${complex.name}`}>
    <div className="street-complex-heading">
      {summary?.photoUrl?<Image unoptimized width={72} height={72} className="street-complex-photo" src={summary.photoUrl} alt={`Foto del complesso ${complex.name}`}/>:<div className="street-complex-placeholder" aria-label="Nessuna foto del complesso"><Building2 size={24}/></div>}
      <div className="street-complex-main"><strong>{complex.name}</strong><span>{address}</span>{complex.civicIds.length>1&&<small>+ {complex.civicIds.length-1} {complex.civicIds.length===2?"altro accesso":"altri accessi"}</small>}
        <div className="street-complex-stats">{complex.units!==undefined&&<span>{complex.units} unità dichiarate</span>}<span>{records.length?`${records.length} ${records.length===1?"contatto censito":"contatti censiti"}`:"Nessun censimento"}</span></div>
      </div>
      <div className="street-complex-actions"><Link prefetch={false} className="button secondary" href={`/censimento/complessi/${complex.id}`}>Apri complesso</Link><button className="button secondary" type="button" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{open?<>Nascondi interni <ChevronUp size={15}/></>:<>Mostra interni <ChevronDown size={15}/></>}</button></div>
    </div>
    {open&&<div className="street-complex-internals">
      <p className="street-complex-note">“Interni” mostra soltanto accessi e Contatti realmente registrati; non rappresenta le unità dichiarate.</p>
      {accessGroups.length?accessGroups.map(access=><div className="street-complex-access" key={access.id}><strong>{access.label}</strong>{(grouped.get(access.id)??[]).map(record=><div className="street-complex-contact" key={record.id}><div><b>{record.lastName} {record.firstName}</b><small>{[record.qualification,record.contactType,record.staircase&&`Scala ${record.staircase}`,record.unitIdentifier&&`Interno ${record.unitIdentifier}`,record.floorLabel].filter(Boolean).join(" · ")}</small>{record.subjectLinks.filter(link=>!link.isPrimary&&link.subjectName).length>0&&<small>Altri soggetti: {record.subjectLinks.filter(link=>!link.isPrimary&&link.subjectName).map(link=>link.subjectName).join(", ")}</small>}<small>{latestInterview(record)?.response??"Nessuna intervista"}{closestRecall(record)?` · ricontatto ${formatDate(closestRecall(record))}`:""}</small></div><Link prefetch={false} className="row-action" href={`/censimento/contatti/${record.id}`}>Apri contatto</Link></div>)}{!grouped.has(access.id)&&<small className="muted">Nessun contatto registrato</small>}</div>):<p className="muted">Nessun accesso o Contatto registrato.</p>}
      {accesses.some(access=>access.streetId!==streetId)&&<small className="muted">Il Complesso comprende anche accessi su altre vie della Zona.</small>}
    </div>}
  </article>;
}
