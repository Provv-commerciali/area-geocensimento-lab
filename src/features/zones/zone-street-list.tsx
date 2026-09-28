import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CanonicalStreet } from "@/domain/territory";
import type { CensusRecord } from "@/domain/census";
import { metrics } from "./operational-metrics";

interface Props { zoneId:string;streets:CanonicalStreet[];records:CensusRecord[];total:number;page:number;query:string }
export function ZoneStreetList({zoneId,streets,records,total,page,query}:Props){
  const path=`/censimento/zone/${zoneId}`,href=(next:number)=>`${path}?${new URLSearchParams({...(query?{q:query}:{}),page:String(next)})}`;
  const grouped=new Map<string,CensusRecord[]>();records.forEach(record=>grouped.set(record.streetId,[...(grouped.get(record.streetId)??[]),record]));
  return <><form className="filter-panel filter-primary" action={path}><label className="search-field">Cerca via, civico o contatto<input aria-label="Cerca via, civico o contatto" name="q" defaultValue={query} placeholder="es. Corte Adami, 102, Rossi"/></label><button className="button secondary">Cerca</button></form>
    <div className="table-toolbar"><span>{total?`${(page-1)*30+1}–${Math.min(page*30,total)} di ${total} vie / indirizzi`:"Nessuna via trovata"}</span></div>
    <div className="table-panel"><div className="table-scroll"><table><thead><tr><th>Via / indirizzo</th><th>Area / località</th><th>Civici</th><th>Censiti</th><th>Notizie</th><th>In valutazione</th><th>Altre agenzie</th><th>Esclusive</th><th>Ultima attività</th><th>Azioni</th></tr></thead><tbody>{streets.map(street=>{const m=metrics(grouped.get(street.id)??[]);return <tr key={street.id}><td><strong>{street.name}</strong>{street.sourceKind==="MANUAL"&&<small>Inserito manualmente</small>}</td><td>{street.localityName??"—"}</td><td>{street.totalAccesses}</td><td>{m.censiti}</td><td>{m.notizie}</td><td>{m.valutazione}</td><td>{m.altreAgenzie}</td><td>{m.esclusive}</td><td>{m.latest?<><strong>{m.latest.name}</strong><small>{new Intl.DateTimeFormat("it-IT",m.latest.at.length===10?{dateStyle:"short"}:{dateStyle:"short",timeStyle:"short"}).format(new Date(m.latest.at))}</small></>:"—"}</td><td><Link className="row-action" href={`${path}/vie/${street.id}`}>Apri <ArrowRight size={15}/></Link></td></tr>})}</tbody></table></div></div>
    {!streets.length&&<p className="muted">Nessuna via o indirizzo corrisponde alla ricerca.</p>}
    {total>30&&<nav className="street-pager" aria-label="Pagine vie">{page>1&&<Link className="button secondary" href={href(page-1)}>Precedente</Link>}<span>Pagina {page} di {Math.ceil(total/30)}</span>{page*30<total&&<Link className="button secondary" href={href(page+1)}>Successiva</Link>}</nav>}
  </>;
}
