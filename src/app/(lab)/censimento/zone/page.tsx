import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { getZoneAccessCounts } from "@/repositories/territory-repository";
import { loadCensusData } from "@/services/census-data";

export default async function ZonesPage({searchParams}:{searchParams:Promise<{created?:string}>}){
  const [{created},{records,zones}]=await Promise.all([searchParams,loadCensusData(["records","zones"])]);
  const counts=await Promise.all(zones.map(zone=>getZoneAccessCounts(zone.id)));
  return <><PageHeader eyebrow="Territorio" title="Zone" description="Organizza le aree di lavoro e gli indirizzi da censire." action={<Link className="button primary" href="/censimento/zone/nuova"><Plus size={17}/> Nuova zona</Link>}/>{created==="1"&&<div className="success-banner">Zona salvata correttamente.</div>}<section className="table-panel zone-list"><div className="table-scroll"><table><thead><tr><th>Zona</th><th>Comune</th><th>Operatore</th><th>Vie / indirizzi</th><th>Civici</th><th>Contatti</th><th aria-label="Azioni"/></tr></thead><tbody>{zones.map((zone,index)=>{const zoneRecords=records.filter(record=>record.zoneId===zone.id),count=counts[index];return <tr key={zone.id}><td><strong>{zone.name}</strong></td><td>{zone.municipality}</td><td>{zone.operator.name}</td><td>{count.streetCount}</td><td>{count.accessCount}</td><td>{zoneRecords.length}</td><td><Link className="row-action" href={`/censimento/zone/${zone.id}`}>Apri <ArrowRight size={14}/></Link></td></tr>})}</tbody></table></div></section></>;
}
