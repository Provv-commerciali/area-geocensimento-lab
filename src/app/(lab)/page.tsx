import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, MapPinned, Users } from "lucide-react";
import { DataModeNotice, PageHeader, StatCard } from "@/components/ui";
import { latestInterview } from "@/domain/census";
import { unresolvedRecallDate } from "@/domain/census-operational-status";
import { loadCensusData } from "@/services/census-data";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";

export default async function Dashboard() {
  const { complexes, records, zones, operationalToday } = await loadCensusData();
  const interviewed = records.filter((record) => latestInterview(record)).length;
  const recalls = records.map((record) => ({ record, recallDate: unresolvedRecallDate(record.interviews, operationalToday) })).filter((item) => item.recallDate);
  return <><PageHeader eyebrow="Quadro operativo" title="Censimento LAB" description="Territorio, contatti e attività in un’unica vista di lavoro." action={<Link className="button primary" href="/censimento/contatti/nuovo">Nuovo contatto <ArrowRight size={17}/></Link>}/><DataModeNotice databaseMode={hasSupabaseEnvironment()}/>
    <section className="stats-grid"><StatCard label="Contatti censiti" value={records.length} detail={`${interviewed} con almeno un'intervista`} /><StatCard label="Zone attive" value={zones.length} detail="Comune di Bologna" tone="blue"/><StatCard label="Complessi" value={complexes.length} detail="Tutti con collegamenti multicivico" tone="amber"/><StatCard label="Ricontatti" value={recalls.length} detail="Programmati e ancora da assolvere" tone="green"/></section>
    <section className="dashboard-grid"><article className="panel"><div className="panel-heading"><div><p className="eyebrow">Attività</p><h2>Prossimi ricontatti</h2></div><CalendarClock/></div><div className="activity-list">{recalls.slice(0,5).map(({record,recallDate}) => <div key={record.id}><div className="avatar">{record.firstName?.[0]}{record.lastName[0]}</div><div><strong>{record.lastName} {record.firstName}</strong><span>{record.streetName}, {record.civicNumber}</span></div><time>{recallDate}</time></div>)}</div></article>
    <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Accessi rapidi</p><h2>Continua il lavoro</h2></div></div><div className="quick-links"><Link href="/censimento/zone"><MapPinned/><div><strong>Gestisci zone</strong><span>Vie e perimetri organizzativi</span></div><ArrowRight/></Link><Link href="/censimento/contatti"><Users/><div><strong>Cerca contatti</strong><span>Filtri trasversali completi</span></div><ArrowRight/></Link><Link href="/censimento/complessi"><Building2/><div><strong>Esplora complessi</strong><span>Civici e interni censiti</span></div><ArrowRight/></Link></div></article></section></>;
}
