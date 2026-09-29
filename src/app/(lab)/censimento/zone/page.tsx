import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { listZoneOverview } from "@/repositories/territory-repository";
import { loadCensusData } from "@/services/census-data";
import { ZoneDeleteButton } from "@/features/zones/zone-delete-button";

export default async function ZonesPage({searchParams}:{searchParams:Promise<{created?:string;q?:string;municipality?:string;operator?:string}>}){
  const params=await searchParams;
  const [{zones},overview]=await Promise.all([loadCensusData(["zones"]),listZoneOverview(params.q??"")]);
  const counts=new Map(overview.map(row=>[row.zoneId,row]));
  const visible=zones.filter(zone=>counts.has(zone.id)&&(!params.municipality||zone.municipalityId===params.municipality)&&(!params.operator||zone.operator.id===params.operator));
  const municipalities=[...new Map(zones.map(zone=>[zone.municipalityId,zone.municipality])).entries()].sort((a,b)=>a[1].localeCompare(b[1],"it"));
  const operators=[...new Map(zones.map(zone=>[zone.operator.id,zone.operator.name])).entries()].sort((a,b)=>a[1].localeCompare(b[1],"it"));
  return <><PageHeader eyebrow="Territorio" title="Zone" description="Organizza le aree di lavoro e gli indirizzi da censire." action={<Link className="button primary" href="/censimento/zone/nuova"><Plus size={17}/> Nuova zona</Link>}/>
    {params.created==="1"&&<div className="success-banner">Zona salvata correttamente.</div>}
    <form className="filter-panel filter-primary" action="/censimento/zone"><label className="search-field">Cerca zona, via o civico<input name="q" defaultValue={params.q} placeholder="es. Piano di Mommio, Alceste Cima, 106/A"/></label><label>Comune<select name="municipality" defaultValue={params.municipality??""}><option value="">Tutti</option>{municipalities.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>Operatore<select name="operator" defaultValue={params.operator??""}><option value="">Tutti</option>{operators.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><button className="button secondary">Cerca</button></form>
    <section className="table-panel zone-list"><div className="table-scroll"><table><thead><tr><th>Zona</th><th>Comune</th><th>Operatore</th><th>Vie / indirizzi</th><th>Civici</th><th>Contatti</th><th>Azioni</th></tr></thead><tbody>{visible.map(zone=>{const count=counts.get(zone.id)!;return <tr key={zone.id}><td><strong>{zone.name}</strong></td><td>{zone.municipality}</td><td>{zone.operator.name}</td><td>{count.streetCount}</td><td>{count.accessCount}</td><td>{count.recordCount}</td><td><div className="button-row"><Link className="row-action" prefetch={false} href={`/censimento/zone/${zone.id}`}>Apri <ArrowRight size={14}/></Link><Link className="row-action" prefetch={false} href={`/censimento/zone/${zone.id}/modifica`}>Modifica</Link><ZoneDeleteButton zoneId={zone.id}/></div></td></tr>})}</tbody></table></div>{!visible.length&&<p className="muted">Nessuna zona corrisponde alla ricerca.</p>}</section>
  </>;
}
