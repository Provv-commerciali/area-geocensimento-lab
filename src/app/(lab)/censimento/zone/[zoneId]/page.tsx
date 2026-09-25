import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { ZoneStreetList } from "@/features/zones/zone-street-list";
import { getZoneAccessCounts, listZoneStreets } from "@/repositories/territory-repository";
import { loadCensusData } from "@/services/census-data";

export default async function ZoneDetail({params}:{params:Promise<{zoneId:string}>}){
  const {zoneId}=await params;const [{records,zones},streets,counts]=await Promise.all([loadCensusData(["records","zones"],{records:{zoneId}}),listZoneStreets(zoneId),getZoneAccessCounts(zoneId)]);
  const zone=zones.find(item=>item.id===zoneId);if(!zone)notFound();const contactCounts=Object.fromEntries(streets.map(street=>[street.id,records.filter(record=>record.streetId===street.id).length]));
  return <><PageHeader eyebrow="Zona" title={zone.name} description={`${zone.municipality} · ${zone.operator.name}`} action={<div className="button-row"><Link className="button secondary" href={`/censimento/zone/${zone.id}/modifica`}><Pencil size={16}/> Modifica zona</Link><Link className="button primary" href={`/geocensimento?zone=${zone.id}`}>Apri in GeoCensimento</Link></div>}/><section className="zone-kpis" aria-label="Riepilogo zona"><div><strong>{counts.streetCount}</strong><span>Vie / indirizzi</span></div><div><strong>{counts.accessCount}</strong><span>Civici</span></div><div><strong>{records.length}</strong><span>Contatti</span></div></section><section className="panel"><div className="panel-heading"><div><h2>Vie e indirizzi della zona</h2><p className="muted">Apri una via o un indirizzo per consultare i civici disponibili.</p></div></div><ZoneStreetList zoneId={zone.id} streets={streets} contactCounts={contactCounts}/></section></>;
}
