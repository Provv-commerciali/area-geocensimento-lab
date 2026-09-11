import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, MapPinned, Users } from "lucide-react";
import { DemoNotice, PageHeader, StatCard } from "@/components/ui";
import { complexes, records, zones } from "@/lib/demo-data";
import { latestInterview, nextRecall } from "@/domain/census";

export default function Dashboard() {
  const interviewed = records.filter((r) => latestInterview(r)).length; const recalls = records.filter((r) => nextRecall(r)).length;
  return <><PageHeader eyebrow="Quadro operativo" title="Censimento LAB" description="Territorio, contatti e attività in un’unica vista di lavoro." action={<Link className="button primary" href="/censimento/contatti/nuovo">Nuovo contatto <ArrowRight size={17}/></Link>}/><DemoNotice/>
    <section className="stats-grid"><StatCard label="Contatti censiti" value={records.length} detail={`${interviewed} con almeno un'intervista`} /><StatCard label="Zone attive" value={zones.length} detail="Comune di Bologna" tone="blue"/><StatCard label="Complessi" value={complexes.length} detail="Tutti con collegamenti multicivico" tone="amber"/><StatCard label="Ricontatti" value={recalls} detail="Programmati nel dataset" tone="green"/></section>
    <section className="dashboard-grid"><article className="panel"><div className="panel-heading"><div><p className="eyebrow">Attività</p><h2>Prossimi ricontatti</h2></div><CalendarClock/></div><div className="activity-list">{records.filter((r) => nextRecall(r)).slice(0,5).map((r) => <div key={r.id}><div className="avatar">{r.firstName?.[0]}{r.lastName[0]}</div><div><strong>{r.lastName} {r.firstName}</strong><span>{r.streetName}, {r.civicNumber}</span></div><time>{nextRecall(r)}</time></div>)}</div></article>
    <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Accessi rapidi</p><h2>Continua il lavoro</h2></div></div><div className="quick-links"><Link href="/censimento/zone"><MapPinned/><div><strong>Gestisci zone</strong><span>Vie e perimetri organizzativi</span></div><ArrowRight/></Link><Link href="/censimento/contatti"><Users/><div><strong>Cerca contatti</strong><span>Filtri trasversali completi</span></div><ArrowRight/></Link><Link href="/censimento/complessi"><Building2/><div><strong>Esplora complessi</strong><span>Civici e interni censiti</span></div><ArrowRight/></Link></div></article></section></>;
}
