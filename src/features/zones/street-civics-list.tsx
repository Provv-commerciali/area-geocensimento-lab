"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { accessLabel, type AddressAccess } from "@/domain/territory";
import type { CensusRecord } from "@/domain/census";
import { metrics } from "./operational-metrics";

interface Props { zoneId:string; accesses:AddressAccess[]; records:CensusRecord[] }
export function StreetCivicsList({zoneId,accesses,records}:Props){
  const [query,setQuery]=useState("");const filtered=useMemo(()=>{const needle=query.trim().toLocaleLowerCase("it");return needle?accesses.filter(access=>accessLabel(access).toLocaleLowerCase("it").includes(needle)):accesses},[accesses,query]);
  return <><form className="filter-panel filter-primary"><label className="search-field">Cerca civico o contatto<input aria-label="Cerca civico o contatto" value={query} onChange={event=>setQuery(event.target.value)} placeholder="es. 102, 106/A, Rossi"/></label><button className="button secondary">Cerca</button></form><div className="table-panel"><div className="table-scroll"><table><thead><tr><th>Civico</th><th>Censiti</th><th>Notizie</th><th>In valutazione</th><th>Altre agenzie</th><th>Esclusive</th><th>Ultima attività</th><th>Azioni</th></tr></thead><tbody>{filtered.map(access=>{const m=metrics(records.filter(r=>r.civicId===access.id));return <tr key={access.id}><td><strong>{accessLabel(access)}</strong>{access.sourceKind==="MANUAL"&&<small>Inserito manualmente</small>}</td><td>{m.censiti}</td><td>{m.notizie}</td><td>{m.valutazione}</td><td>{m.altreAgenzie}</td><td>{m.esclusive}</td><td>{m.latest?<><strong>{m.latest.name}</strong><small>{new Intl.DateTimeFormat("it-IT",{dateStyle:"short",timeStyle:"short"}).format(new Date(m.latest.at))}</small></>:"—"}</td><td><Link className="row-action" href={`/censimento/zone/${zoneId}/vie/${access.streetId}/civici/${access.id}`}>Apri</Link></td></tr>})}</tbody></table></div></div>{!filtered.length&&<p className="muted">Nessun civico corrisponde alla ricerca.</p>}</>;
}
