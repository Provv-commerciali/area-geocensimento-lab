/* eslint-disable react/no-unescaped-entities */
"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, Filter, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { engagementTypes, occupancies, qualifications, type CensusRecord, type CensusZone, type Complex, type Operator, type Street } from "@/domain/census";
import { deriveCensusOperationalStatus, unresolvedRecallDate, type CensusOperationalSettings } from "@/domain/census-operational-status";
import { OperationalStatusBadge } from "./operational-status-badge";
import { filterCensusRecords, type CensusFilters } from "./filters";
import { geoCensusHref } from "@/domain/geocensus";

type Props = {
  records: CensusRecord[]; zones: CensusZone[]; streets: Street[]; complexes: Complex[]; operators: Operator[];
  operationalSettings: CensusOperationalSettings; operationalToday: string; fixedZoneId?: string; fixedStreetId?: string;
  initialFilters?: CensusFilters;
};

export function ContactsTable({ records, zones, streets, complexes, operators, operationalSettings, operationalToday, fixedZoneId, fixedStreetId, initialFilters }: Props) {
  const [filters, setFilters] = useState<CensusFilters>({ ...initialFilters, zoneId: fixedZoneId ?? initialFilters?.zoneId, streetId: fixedStreetId ?? initialFilters?.streetId });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [sort, setSort] = useState<"name" | "created">("name");
  const [page, setPage] = useState(1);
  const filtered = useMemo(
    () => filterCensusRecords(records, filters, { ...operationalSettings, today: operationalToday }).sort((a, b) => sort === "name" ? `${a.lastName} ${a.firstName??""} ${a.streetName}`.localeCompare(`${b.lastName} ${b.firstName??""} ${b.streetName}`,"it") : b.createdAt.localeCompare(a.createdAt)),
    [records, filters, operationalSettings, operationalToday, sort],
  );
  const subjectContextCounts=useMemo(()=>{const counts=new Map<string,number>();for(const record of records){for(const subjectId of new Set(record.subjectLinks.map(link=>link.subjectId)))counts.set(subjectId,(counts.get(subjectId)??0)+1)}return counts},[records]);
  const pageSize = 50; const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const visibleContacts = visible.map((record) => ({
    record,
    status: deriveCensusOperationalStatus({ contactType: record.contactType, interviews: record.interviews, staleNewsDays: operationalSettings.staleNewsDays, today: operationalToday }),
    pendingRecall: unresolvedRecallDate(record.interviews, operationalToday),contextCount:subjectContextCounts.get((record.subjectLinks.find(link=>link.isPrimary)??record.subjectLinks[0])?.subjectId??"")??1,linkedNames:record.subjectLinks.filter(link=>!link.isPrimary&&link.subjectName).map(link=>`${link.subjectName} (${subjectContextCounts.get(link.subjectId)??1} ${(subjectContextCounts.get(link.subjectId)??1)===1?"immobile":"immobili"})`),
  }));
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => value && !((key === "zoneId" && fixedZoneId) || (key === "streetId" && fixedStreetId))).length;
  const update = (key: keyof CensusFilters, value: string) => { setPage(1); setFilters((current) => ({ ...current, [key]: value || undefined })); };
  const reset = () => { setPage(1); setFilters({ zoneId: fixedZoneId, streetId: fixedStreetId }); };

  return <>
    <section className={`filter-panel${filtersOpen ? "" : " is-collapsed"}`}>
      <div className="filter-summary"><span><Filter size={17}/><strong>Filtri</strong><small>{filtered.length} risultati{activeFilterCount ? ` · ${activeFilterCount} ${activeFilterCount === 1 ? "filtro attivo" : "filtri attivi"}` : ""}</small></span><button className="button secondary" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((current) => !current)}>{filtersOpen ? "Nascondi filtri" : "Mostra filtri"}{filtersOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button></div>
      {filtersOpen && <div className="filter-content">
      <div className="filter-primary">
        <label className="search-field"><Search size={18}/><input aria-label="Ricerca rapida" placeholder="Cerca nome, via o civico…" value={filters.query ?? ""} onChange={(event) => update("query", event.target.value)}/></label>
        <label>Attività operativa<select aria-label="Attività operativa" value={filters.operationalStatus ?? ""} onChange={(event) => update("operationalStatus", event.target.value)}><option value="">Tutte</option><option value="never">Mai contattati</option><option value="recallOverdue">Ricontatti scaduti</option><option value="staleNews">Notizie non aggiornate</option><option value="actionRequired">Attività da fare</option></select></label>
        {!fixedZoneId && <label>Zona<select aria-label="Zona" value={filters.zoneId ?? ""} onChange={(event) => update("zoneId", event.target.value)}><option value="">Tutte</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>}
        {!fixedStreetId && <label>Via<select aria-label="Via" value={filters.streetId ?? ""} onChange={(event) => update("streetId", event.target.value)}><option value="">Tutte</option>{streets.filter((street) => !filters.zoneId || zones.find((zone) => zone.id === filters.zoneId)?.streetIds.includes(street.id)).map((street) => <option key={street.id} value={street.id}>{street.name}</option>)}</select></label>}
        <button className="button secondary" onClick={() => setAdvanced(!advanced)}><SlidersHorizontal size={17}/> Altri filtri {advanced ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>
      </div>
      {advanced && <div className="advanced-filters">
        <fieldset><legend>Contatto</legend><label>Cognome<input value={filters.lastName ?? ""} onChange={(event) => update("lastName", event.target.value)}/></label><label>Nome<input value={filters.firstName ?? ""} onChange={(event) => update("firstName", event.target.value)}/></label><label>Tipologia<select value={filters.contactType ?? ""} onChange={(event) => update("contactType", event.target.value)}><option value="">Tutte</option>{["Generico", "Informatore", "Informazione", "Notizia"].map((value) => <option key={value}>{value}</option>)}</select></label></fieldset>
        <fieldset><legend>Immobile</legend><label>Complesso<select value={filters.complexId ?? ""} onChange={(event) => update("complexId", event.target.value)}><option value="">Tutti</option>{complexes.map((complex) => <option value={complex.id} key={complex.id}>{complex.name}</option>)}</select></label><label>Piano<input value={filters.floor ?? ""} onChange={(event) => update("floor", event.target.value)}/></label><label>Ascensore<select value={filters.elevator ?? ""} onChange={(event) => update("elevator", event.target.value)}><option value="">Tutti</option><option value="true">Sì</option><option value="false">No</option></select></label></fieldset>
        <fieldset><legend>Catasto</legend><label>Foglio<input value={filters.sheet ?? ""} onChange={(event) => update("sheet", event.target.value)}/></label><label>Particella<input value={filters.parcel ?? ""} onChange={(event) => update("parcel", event.target.value)}/></label><label>Subalterno<input value={filters.subaltern ?? ""} onChange={(event) => update("subaltern", event.target.value)}/></label></fieldset>
        <fieldset><legend>Gestione e stato</legend><label>Responsabile<select value={filters.operatorId ?? ""} onChange={(event) => update("operatorId", event.target.value)}><option value="">Tutti</option>{operators.map((operator) => <option value={operator.id} key={operator.id}>{operator.name}</option>)}</select></label><label>Qualifica<select value={filters.qualification ?? ""} onChange={(event) => update("qualification", event.target.value)}><option value="">Tutte</option>{qualifications.map(value=><option key={value}>{value}</option>)}</select></label><label>Occupazione<select value={filters.occupancy ?? ""} onChange={(event) => update("occupancy", event.target.value)}><option value="">Tutte</option>{occupancies.map(value=><option key={value}>{value}</option>)}</select></label><label>Tipo di incarico<select value={filters.engagementType ?? ""} onChange={(event) => update("engagementType", event.target.value)}><option value="">Tutti</option>{engagementTypes.map(value=><option key={value}>{value}</option>)}</select></label><label>Storico<select aria-label="Stato contatto" value={filters.contactStatus ?? ""} onChange={(event) => update("contactStatus", event.target.value)}><option value="">Tutti</option><option value="never">Non ancora contattati</option><option value="contacted">Con almeno un'intervista</option></select></label><label>Ereditato<select value={filters.inherited ?? ""} onChange={(event) => update("inherited", event.target.value)}><option value="">Tutti</option><option value="true">Sì</option><option value="false">No</option></select></label><label>Perizia<select value={filters.appraised ?? ""} onChange={(event) => update("appraised", event.target.value)}><option value="">Tutte</option><option value="true">Sì</option><option value="false">No</option></select></label></fieldset>
      </div>}
      <div className="filter-actions"><span><Filter size={15}/>{filtered.length} risultati</span><div className="button-row"><Link className="button secondary" prefetch={false} href={geoCensusHref(filters)}>Visualizza in GeoCensimento</Link><button className="text-button" onClick={reset}><RotateCcw size={15}/> Reimposta filtri</button></div></div>
      </div>}
    </section>
    <section className="table-panel contacts-table-panel">
      <div className="table-toolbar contacts-table-toolbar"><strong>Contatti censimento{pageCount>1?` · pagina ${page} di ${pageCount}`:""}</strong><label>Ordina per <select value={sort} onChange={(event) => {setPage(1);setSort(event.target.value as "name" | "created")}}><option value="name">Cognome / ragione sociale</option><option value="created">Inserimento</option></select></label></div>
      <div className="table-scroll contacts-table-scroll" aria-label="Tabella contatti censimento"><table><thead><tr><th>Contatto</th><th>Qualifica</th><th>Tipologia</th><th>Tipo incarico</th><th>Stato operativo</th><th>Zona / Indirizzo</th><th>Occupazione</th><th>Piano</th><th>Giorni dall'ultimo contatto</th><th>Ricontatto</th><th>Complesso</th><th>Ereditato</th><th>Azioni</th></tr></thead><tbody>{visibleContacts.map(({record,status,pendingRecall,contextCount,linkedNames}) =>
        <tr key={record.id}><td><strong>{record.lastName} {record.firstName}</strong><small>{record.phone ?? "—"} · {contextCount} {contextCount===1?"immobile":"immobili"}</small>{linkedNames.length>0&&<small>Altri soggetti: {linkedNames.join(", ")}</small>}</td><td>{[...new Set(record.subjectLinks.map(link=>link.role))].join(", ")}</td><td><span className={`badge ${record.contactType === "Notizia" ? "news" : ""}`}>{record.contactType}</span>{record.isAppraised && <small>Periziato</small>}</td><td>{record.engagementType}</td><td><OperationalStatusBadge result={status}/></td><td><strong>{record.zoneName}</strong><small>{record.streetName}, {record.civicNumber}{record.civicExtension ? `/${record.civicExtension}` : ""}</small></td><td>{record.occupancy??"—"}</td><td>{record.floorLabel ?? "—"}</td><td><strong>{status.daysSinceLastInterview === null ? "Mai contattato" : `${status.daysSinceLastInterview} gg`}</strong><small>{status.lastInterviewAt ?? "Nessuna intervista"}</small></td><td>{status.isRecallOverdue ? `Scaduto da ${status.overdueRecallDays} gg` : pendingRecall ?? "—"}</td><td>{record.complexName ?? "—"}</td><td>{record.inherited ? "Sì" : "No"}</td><td><div className="button-row"><Link className="row-action" prefetch={false} href={`/censimento/contatti/${record.id}`}>Apri</Link><Link className="row-action" prefetch={false} href={`/censimento/contatti/${record.id}/modifica`}>Modifica</Link></div></td></tr>
      )}</tbody></table></div>
      <div className="mobile-contact-list" aria-label="Contatti censimento">{visibleContacts.map(({record,status,pendingRecall,contextCount,linkedNames}) => <article className="mobile-contact-card" key={record.id}>
        <div className="mobile-contact-heading"><div><strong>{record.lastName} {record.firstName}</strong><small>{record.phone ?? "Nessun telefono"} · {contextCount} {contextCount===1?"immobile":"immobili"}</small>{linkedNames.length>0&&<small>Altri soggetti: {linkedNames.join(", ")}</small>}</div><OperationalStatusBadge result={status}/></div>
        <div className="mobile-contact-address"><strong>{record.zoneName}</strong><span>{record.streetName}, {record.civicNumber}{record.civicExtension ? `/${record.civicExtension}` : ""}</span></div>
        <dl><div><dt>Qualifica</dt><dd>{[...new Set(record.subjectLinks.map(link=>link.role))].join(", ")}</dd></div><div><dt>Tipologia</dt><dd><span className={`badge ${record.contactType === "Notizia" ? "news" : ""}`}>{record.contactType}</span>{record.isAppraised && <small>Periziato</small>}</dd></div><div><dt>Occupazione</dt><dd>{record.occupancy??"—"}</dd></div><div><dt>Piano</dt><dd>{record.floorLabel ?? "—"}</dd></div><div><dt>Ultimo contatto</dt><dd>{status.daysSinceLastInterview === null ? "Mai contattato" : `${status.daysSinceLastInterview} gg`}</dd></div><div><dt>Ricontatto</dt><dd>{status.isRecallOverdue ? `Scaduto da ${status.overdueRecallDays} gg` : pendingRecall ?? "—"}</dd></div><div><dt>Tipo incarico</dt><dd>{record.engagementType}</dd></div><div><dt>Complesso</dt><dd>{record.complexName ?? "—"}</dd></div></dl>
        <div className="mobile-contact-actions"><Link className="button secondary" prefetch={false} href={`/censimento/contatti/${record.id}`}>Apri</Link><Link className="button secondary" prefetch={false} href={`/censimento/contatti/${record.id}/modifica`}>Modifica</Link></div>
      </article>)}</div>
      {pageCount>1&&<div className="table-toolbar"><button className="button secondary" disabled={page===1} onClick={()=>setPage((current)=>Math.max(1,current-1))}>Pagina precedente</button><span>{(page-1)*pageSize+1}–{Math.min(page*pageSize,filtered.length)} di {filtered.length}</span><button className="button secondary" disabled={page===pageCount} onClick={()=>setPage((current)=>Math.min(pageCount,current+1))}>Pagina successiva</button></div>}
    </section>
  </>;
}
