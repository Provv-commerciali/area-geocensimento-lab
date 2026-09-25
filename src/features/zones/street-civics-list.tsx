"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { accessLabel, type AddressAccess } from "@/domain/territory";

interface Props { zoneId:string; accesses:AddressAccess[]; contactCounts:Record<string,number>; contactRecordIds:Record<string,string|undefined> }
export function StreetCivicsList({zoneId,accesses,contactCounts,contactRecordIds}:Props){
  const [query,setQuery]=useState("");const filtered=useMemo(()=>{const needle=query.trim().toLocaleLowerCase("it");return needle?accesses.filter(access=>accessLabel(access).toLocaleLowerCase("it").includes(needle)):accesses},[accesses,query]);
  return <><label className="standalone-field">Cerca civico<input aria-label="Cerca civico" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Numero, esponente o SNC..."/></label><div className="civics-list">{filtered.map(access=>{const contacts=contactCounts[access.id]??0,recordId=contactRecordIds[access.id];return <article key={access.id}><div><strong>{accessLabel(access)}</strong><span>{contacts===0?"Nessun contatto":`${contacts} ${contacts===1?"contatto":"contatti"}`}{access.sourceKind==="MANUAL"&&<em>Inserito manualmente</em>}</span></div><div>{recordId?<Link href={`/censimento/contatti/${recordId}`}>Apri</Link>:<Link href={`/censimento/contatti/nuovo?zoneId=${zoneId}&streetId=${access.streetId}&civicId=${access.id}`}>Apri</Link>}</div></article>})}</div>{!filtered.length&&<p className="muted">Nessun civico corrisponde alla ricerca.</p>}</>;
}
