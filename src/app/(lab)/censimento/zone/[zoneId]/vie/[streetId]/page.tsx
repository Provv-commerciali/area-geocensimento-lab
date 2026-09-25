import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { StreetCivicsList } from "@/features/zones/street-civics-list";
import { TerritoryKpis } from "@/features/zones/territory-kpis";
import { listStreetAddressAccesses, listZoneStreets } from "@/repositories/territory-repository";
import { loadCensusData } from "@/services/census-data";

export default async function StreetPage({params}:{params:Promise<{zoneId:string;streetId:string}>}){
  const {zoneId,streetId}=await params;const [{records,zones},accesses,zoneStreets]=await Promise.all([loadCensusData(["records","zones"],{records:{zoneId,streetId}}),listStreetAddressAccesses(streetId),listZoneStreets(zoneId)]);
  const zone=zones.find(item=>item.id===zoneId),street=zoneStreets.find(item=>item.id===streetId);if(!zone||!street)notFound();const contactCounts=Object.fromEntries(accesses.map(access=>[access.id,records.filter(record=>record.civicId===access.id).length]));const contactRecordIds=Object.fromEntries(accesses.map(access=>[access.id,records.find(record=>record.civicId===access.id)?.id]));
  return <><PageHeader eyebrow="Zona / Via o indirizzo" title={street.name} description={[street.localityName,zone.municipality].filter(Boolean).join(" · ")} action={<div className="button-row"><Link className="button secondary" href={`/censimento/zone/${zone.id}`}>Torna alla zona</Link><Link className="button primary" href={`/censimento/contatti/nuovo?zoneId=${zone.id}&streetId=${street.id}`}>+ Nuovo contatto</Link><Link className="button secondary" href={`/geocensimento?zone=${zone.id}&street=${street.id}`}>Apri in GeoCensimento</Link></div>}/><TerritoryKpis accessCount={street.totalAccesses} records={records}/><section className="panel"><h2>Civici</h2><p className="muted">Consulta i civici disponibili e i relativi contatti.</p><StreetCivicsList zoneId={zone.id} accesses={accesses} contactCounts={contactCounts} contactRecordIds={contactRecordIds}/>{street.totalAccesses>accesses.length&&<p className="muted">Affina la ricerca per consultare altri civici.</p>}</section></>;
}
