"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { CanonicalStreet } from "@/domain/territory";
import type { CensusRecord } from "@/domain/census";
import { metrics } from "./operational-metrics";

interface Props { zoneId:string; streets:CanonicalStreet[]; records:CensusRecord[] }
export function ZoneStreetList({zoneId,streets,records}:Props){
  const [query,setQuery]=useState("");const filtered=useMemo(()=>{const needle=query.trim().toLocaleLowerCase("it");return needle?streets.filter(street=>`${street.name} ${street.localityName??""}`.toLocaleLowerCase("it").includes(needle)):streets},[query,streets]);
  return <><form className="filter-panel filter-primary"><label className="search-field">Cerca via, civico o contatto<input aria-label="Cerca via, civico o contatto" value={query} onChange={event=>setQuery(event.target.value)} placeholder="es. Corte Adami, 102, Rossi"/></label><button className="button secondary">Cerca</button></form><div className="table-panel"><div className="table-scroll"><table><thead><tr><th>Via / indirizzo</th><th>Area / località</th><th>Civici</th><th>Censiti</th><th>Notizie</th><th>In valutazione</th><th>Altre agenzie</th><th>Esclusive</th><th>Ultima attività</th><th>Azioni</th></tr></thead><tbody>{filtered.map(street=>{const m=metrics(records.filter(r=>r.streetId===street.id));return <tr key={street.id}><td><strong>{street.name}</strong>{street.sourceKind==="MANUAL"&&<small>Inserito manualmente</small>}</td><td>{street.localityName??"—"}</td><td>{street.totalAccesses}</td><td>{m.censiti}</td><td>{m.notizie}</td><td>{m.valutazione}</td><td>{m.altreAgenzie}</td><td>{m.esclusive}</td><td>{m.latest?<><strong>{m.latest.name}</strong><small>{new Intl.DateTimeFormat("it-IT",{dateStyle:"short",timeStyle:"short"}).format(new Date(m.latest.at))}</small></>:"—"}</td><td><Link className="row-action" href={`/censimento/zone/${zoneId}/vie/${street.id}`}>Apri <ArrowRight size={15}/></Link></td></tr>})}</tbody></table></div></div>{!filtered.length&&<p className="muted">Nessuna via o indirizzo corrisponde alla ricerca.</p>}</>;
}
