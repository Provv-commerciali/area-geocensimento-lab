import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { ZoneStreetList } from "@/features/zones/zone-street-list";
import { TerritoryKpis } from "@/features/zones/territory-kpis";
import { ZoneDeleteButton } from "@/features/zones/zone-delete-button";
import { listZoneOverview, pageZoneStreets } from "@/repositories/territory-repository";
import { loadCensusData } from "@/services/census-data";

export default async function ZoneDetail({params,searchParams}:{params:Promise<{zoneId:string}>;searchParams:Promise<{q?:string;page?:string}>}){
  const [{zoneId},query]=await Promise.all([params,searchParams]);const page=Math.max(1,Number(query.page)||1);
  const [{records,zones},streetsPage,overview]=await Promise.all([loadCensusData(["records","zones"],{records:{zoneId}}),pageZoneStreets(zoneId,query.q??"",page),listZoneOverview()]);
  const zone=zones.find(item=>item.id===zoneId);if(!zone)notFound();const counts=overview.find(item=>item.zoneId===zoneId);if(!counts)notFound();
  return <><PageHeader eyebrow="Zona" title={zone.name} description={`${zone.municipality} · ${zone.operator.name}`} action={<div className="button-row"><Link className="button secondary" href={`/censimento/zone/${zone.id}/modifica`}><Pencil size={16}/> Modifica zona</Link><Link className="button primary" href={`/geocensimento?zone=${zone.id}`}>Apri in GeoCensimento</Link><ZoneDeleteButton zoneId={zone.id}/></div>}/><TerritoryKpis streetCount={counts.streetCount} accessCount={counts.accessCount} records={records}/><section className="panel"><div className="panel-heading"><div><h2>Vie e indirizzi della zona</h2><p className="muted">Apri una via o un indirizzo per consultare i civici disponibili.</p></div></div><ZoneStreetList zoneId={zone.id} streets={streetsPage.streets} records={records} total={streetsPage.total} page={page} query={query.q??""}/></section></>;
}
