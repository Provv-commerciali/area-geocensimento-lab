"use client";

import Link from "next/link";
import { BarChart3, Building2, CalendarClock, CheckCircle2, CircleAlert, Clock3, Contact, RotateCcw, Target, TrendingUp, UserRoundCheck, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { CensusRecord, CensusZone, Operator } from "@/domain/census";
import { deriveNewsManagementStatus, type NewsManagementStatus } from "@/domain/census-operational-status";
import { buildDashboardSnapshot, type DashboardFilters } from "./dashboard-analytics";

const statusMeta:Record<NewsManagementStatus,{label:string;detail:string;className:string;icon:typeof CircleAlert}>={
  SCADUTA:{label:"Scadute",detail:"Data superata e ricontatto non assolto",className:"danger",icon:CircleAlert},
  IN_SCADENZA:{label:"In scadenza",detail:"Da ricontattare tra oggi e 7 giorni",className:"warning",icon:Clock3},
  GESTITA_CORRETTAMENTE:{label:"Gestite correttamente",detail:"Ricontatto pianificato oltre 7 giorni",className:"success",icon:CheckCircle2},
  SENZA_RICONTATTO:{label:"Senza ricontatto",detail:"Nessuna data di ricontatto attiva",className:"neutral",icon:CalendarClock},
};

function Kpi({label,value,detail,icon:Icon,tone="cyan"}:{label:string;value:number|string;detail:string;icon:typeof Contact;tone?:string}){return <article className={`dashboard-kpi ${tone}`}><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><Icon size={22}/></article>}

function Bars({items}:{items:{type:string;value:number}[]}){const max=Math.max(1,...items.map(item=>item.value));return <div className="metric-bars">{items.map(item=><div key={item.type}><div><span>{item.type}</span><strong>{item.value}</strong></div><span className="metric-track"><span style={{width:`${item.value/max*100}%`}}/></span></div>)}</div>}

export function PerformanceDashboard({records,zones,operators,today}:{records:CensusRecord[];zones:CensusZone[];operators:Operator[];today:string}){
  const[filters,setFilters]=useState<DashboardFilters>({months:12});
  const snapshot=useMemo(()=>buildDashboardSnapshot(records,zones,operators,today,filters),[records,zones,operators,today,filters]);
  const maxMonth=Math.max(1,...snapshot.monthly.flatMap(item=>[item.contacts,item.news,item.appraisals,item.assignments]));
  const update=(key:"zoneId"|"operatorId",value:string)=>setFilters(current=>({...current,[key]:value||undefined}));
  return <div className="performance-dashboard">
    <section className="dashboard-filters" aria-label="Filtri dashboard"><div><label>Zona<select value={filters.zoneId??""} onChange={event=>update("zoneId",event.target.value)}><option value="">Tutte le zone</option>{zones.map(zone=><option value={zone.id} key={zone.id}>{zone.name}</option>)}</select></label><label>Operatore<select value={filters.operatorId??""} onChange={event=>update("operatorId",event.target.value)}><option value="">Tutti gli operatori</option>{operators.map(operator=><option value={operator.id} key={operator.id}>{operator.name}</option>)}</select></label><label>Periodo performance<select value={filters.months} onChange={event=>setFilters(current=>({...current,months:Number(event.target.value) as 3|6|12}))}><option value="3">Ultimi 3 mesi</option><option value="6">Ultimi 6 mesi</option><option value="12">Ultimi 12 mesi</option></select></label></div><button className="text-button" onClick={()=>setFilters({months:12})}><RotateCcw size={15}/> Reimposta</button></section>

    <section className="dashboard-kpi-grid">
      <Kpi label="Contatti censiti" value={snapshot.totals.contacts} detail={`${snapshot.rates.news}% diventano Notizia`} icon={Contact}/>
      <Kpi label="Notizie trovate" value={snapshot.totals.news} detail={`${snapshot.rates.appraisal}% con perizia`} icon={TrendingUp} tone="blue"/>
      <Kpi label="Incarichi acquisiti" value={snapshot.totals.acquired} detail={`${snapshot.totals.exclusive} in esclusiva · ${snapshot.rates.assignment}% Notizie`} icon={Target} tone="green"/>
      <Kpi label="Altre agenzie" value={snapshot.totals.external} detail="Incarichi in concorrenza" icon={UsersRound} tone="amber"/>
      <Kpi label="Immobili liberi" value={snapshot.totals.vacant} detail="Solo occupazione Libero" icon={Building2} tone="purple"/>
      <Kpi label="Immobili ereditati" value={snapshot.totals.inherited} detail="Contesti immobiliari distinti" icon={UserRoundCheck} tone="slate"/>
    </section>

    <section className="news-status-grid">{Object.entries(statusMeta).map(([status,meta])=>{const Icon=meta.icon;const count=snapshot.newsByStatus[status as NewsManagementStatus].length;return <article className={`news-status-card ${meta.className}`} key={status}><Icon/><div><span>{meta.label}</span><strong>{count}</strong><small>{meta.detail}</small></div></article>})}</section>

    <section className="dashboard-layout wide-left">
      <article className="panel dashboard-chart"><div className="panel-heading"><div><p className="eyebrow">Andamento mensile</p><h2>Censimenti e risultati</h2></div><BarChart3/></div><div className="monthly-chart" aria-label="Andamento mensile di contatti, Notizie, perizie e incarichi">{snapshot.monthly.map(month=><div className="month-column" key={month.key}><div className="month-bars"><i className="contacts" title={`${month.contacts} contatti`} style={{height:`${month.contacts/maxMonth*100}%`}}/><i className="news" title={`${month.news} Notizie`} style={{height:`${month.news/maxMonth*100}%`}}/><i className="appraisals" title={`${month.appraisals} perizie`} style={{height:`${month.appraisals/maxMonth*100}%`}}/><i className="assignments" title={`${month.assignments} incarichi`} style={{height:`${month.assignments/maxMonth*100}%`}}/></div><span>{month.label}</span></div>)}</div><div className="chart-legend"><span className="contacts">Contatti</span><span className="news">Notizie</span><span className="appraisals">Perizie</span><span className="assignments">Incarichi</span></div></article>
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Stato commerciale</p><h2>Tipi di incarico</h2></div></div><Bars items={snapshot.engagementBreakdown}/></article>
    </section>

    <section className="dashboard-layout quarters">
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Soggetti collegati</p><h2>Qualifiche</h2></div></div><Bars items={snapshot.qualificationBreakdown}/><small className="dashboard-note">Uno stesso immobile può comparire in più qualifiche, ma una sola volta per qualifica.</small></article>
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Immobile</p><h2>Occupazione</h2></div></div><Bars items={snapshot.occupancies}/></article>
      <article className="panel work-queue"><div className="panel-heading"><div><p className="eyebrow">Priorità</p><h2>Notizie da lavorare</h2></div><span>{snapshot.actionable.length}</span></div>{snapshot.actionable.slice(0,6).map(record=>{const state=deriveNewsManagementStatus(record.interviews,today),meta=statusMeta[state.status];return <Link href={`/censimento/contatti/${record.id}`} key={record.id}><span className={`queue-dot ${meta.className}`}/><div><strong>{record.lastName} {record.firstName}</strong><small>{record.zoneName} · {record.responsibleOperatorName??"Non assegnato"}</small></div><time>{state.recallDate??"Nessuna data"}</time></Link>})}{!snapshot.actionable.length&&<p className="muted">Nessuna Notizia nel perimetro selezionato.</p>}</article>
      <article className="panel work-queue"><div className="panel-heading"><div><p className="eyebrow">Opportunità</p><h2>Scadenze incarichi</h2></div><span>{snapshot.engagementExpiries.length}</span></div>{snapshot.engagementExpiries.slice(0,6).map(({record,daysUntilExpiry})=><Link href={`/censimento/contatti/${record.id}`} key={record.id}><span className={`queue-dot ${daysUntilExpiry<0?"danger":daysUntilExpiry<=7?"warning":"success"}`}/><div><strong>{record.lastName} {record.firstName}</strong><small>{record.engagementType} · {record.zoneName}</small></div><time>{daysUntilExpiry<0?`${Math.abs(daysUntilExpiry)} gg di ritardo`:daysUntilExpiry===0?"Scade oggi":`tra ${daysUntilExpiry} gg`}</time></Link>)}{!snapshot.engagementExpiries.length&&<p className="muted">Nessuna scadenza incarico nel perimetro selezionato.</p>}</article>
    </section>

    <section className="table-panel dashboard-table"><div className="table-toolbar"><div><p className="eyebrow">Performance</p><strong>Operatori · ultimi {filters.months} mesi</strong></div></div><div className="table-scroll"><table><thead><tr><th>Operatore</th><th>Censiti</th><th>Notizie</th><th>% Notizie</th><th>Perizie</th><th>% Perizie</th><th>Incarichi</th><th>% acquisizione</th><th>Scadute</th><th>In scadenza</th><th>Senza ricontatto</th></tr></thead><tbody>{snapshot.operatorPerformance.map(row=><tr key={row.operator.id}><td><strong>{row.operator.name}</strong></td><td>{row.contacts}</td><td>{row.news}</td><td>{row.newsRate}%</td><td>{row.appraisals}</td><td>{row.appraisalRate}%</td><td>{row.assignments}</td><td>{row.assignmentRate}%</td><td className={row.overdue?"cell-danger":""}>{row.overdue}</td><td>{row.expiring}</td><td>{row.withoutRecall}</td></tr>)}</tbody></table></div></section>

    <section className="table-panel dashboard-table"><div className="table-toolbar"><div><p className="eyebrow">Territorio</p><strong>Distribuzione per zona</strong></div></div><div className="table-scroll"><table><thead><tr><th>Zona</th><th>Responsabile zona</th><th>Contatti</th><th>Notizie</th><th>Proprietari</th><th>Inquilini</th><th>Liberi</th><th>Ereditati</th><th>Incarichi</th></tr></thead><tbody>{snapshot.zonePerformance.map(row=><tr key={row.zone.id}><td><strong>{row.zone.name}</strong><small>{row.zone.municipality}</small></td><td>{row.zone.operator.name}</td><td>{row.contacts}</td><td>{row.news}</td><td>{row.owners}</td><td>{row.tenants}</td><td>{row.vacant}</td><td>{row.inherited}</td><td>{row.assignments}</td></tr>)}</tbody></table></div></section>
  </div>;
}
