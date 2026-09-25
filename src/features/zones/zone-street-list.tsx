"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { CanonicalStreet } from "@/domain/territory";

interface Props { zoneId:string; streets:CanonicalStreet[]; contactCounts:Record<string,number> }
export function ZoneStreetList({zoneId,streets,contactCounts}:Props){
  const [query,setQuery]=useState("");const filtered=useMemo(()=>{const needle=query.trim().toLocaleLowerCase("it");return needle?streets.filter(street=>`${street.name} ${street.localityName??""}`.toLocaleLowerCase("it").includes(needle)):streets},[query,streets]);
  return <><label className="standalone-field">Cerca nelle vie e indirizzi<input aria-label="Cerca nelle vie e indirizzi" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Cerca per nome..."/></label><div className="zone-street-list detail-list">{filtered.map(street=><article key={street.id}><div><strong>{street.name}</strong>{street.localityName&&<small>{street.localityName}</small>}</div><span>{street.totalAccesses} {street.totalAccesses===1?"civico":"civici"} · {contactCounts[street.id]??0} {(contactCounts[street.id]??0)===1?"contatto":"contatti"}{street.sourceKind==="MANUAL"&&<em>Inserito manualmente</em>}</span><Link className="row-action" href={`/censimento/zone/${zoneId}/vie/${street.id}`}>Apri <ArrowRight size={15}/></Link></article>)}</div>{!filtered.length&&<p className="muted">Nessuna via o indirizzo corrisponde alla ricerca.</p>}</>;
}
