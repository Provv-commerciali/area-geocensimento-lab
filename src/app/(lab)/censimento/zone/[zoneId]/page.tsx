import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { loadCensusData } from "@/services/census-data";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";
import { ZoneTerritoryManager } from "@/features/zones/zone-territory-manager";

export default async function ZoneDetail({ params }: { params: Promise<{ zoneId: string }> }) { const {zoneId}=await params;const {records,streets,zones,civics}=await loadCensusData(["records","streets","zones","civics"],{records:{zoneId}}); const zone=zones.find(z=>z.id===zoneId); if(!zone)notFound(); return <><PageHeader eyebrow="Zona di censimento" title={zone.name} description={`${zone.municipality} · Assegnata a ${zone.operator.name}`} action={<Link className="button primary" href={`/geocensimento?zone=${zone.id}`}>Visualizza in GeoCensimento</Link>}/><ZoneTerritoryManager {...{zone,streets,civics}} databaseMode={hasSupabaseEnvironment()}/><section className="cards-list spaced">{streets.filter(s=>zone.streetIds.includes(s.id)).map(s=><article className="street-card" key={s.id}><div><strong>{s.name}</strong><span>{records.filter(r=>r.streetId===s.id).length} contatti censiti</span></div><Link className="button secondary" href={`/censimento/zone/${zone.id}/vie/${s.id}`}>Apri contatti <ArrowRight size={16}/></Link></article>)}</section></> }
