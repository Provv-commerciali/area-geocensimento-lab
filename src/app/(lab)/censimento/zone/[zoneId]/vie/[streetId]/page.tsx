import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { StreetCivicsList } from "@/features/zones/street-civics-list";
import { TerritoryKpis } from "@/features/zones/territory-kpis";
import { hasRecordFilters, parseStreetFilters, recordMatchesQuickSearch, recordMatchesStreetFilters, streetSorts, type StreetSort } from "@/features/zones/street-operations";
import { pageStreetAddressAccesses, getZoneStreet } from "@/repositories/territory-repository";
import { loadCensusData } from "@/services/census-data";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";
import { civics as demoCivics } from "@/lib/demo-data";

type Search = Record<string,string|string[]|undefined>;
export default async function StreetPage({params,searchParams}:{params:Promise<{zoneId:string;streetId:string}>;searchParams:Promise<Search>}){
  const [{zoneId,streetId},query]=await Promise.all([params,searchParams]);
  const [{records,zones,complexes},street]=await Promise.all([
    loadCensusData(["records","zones","complexes"],{records:{zoneId,streetId},complexZoneId:zoneId}),getZoneStreet(zoneId,streetId),
  ]);
  const zone=zones.find(item=>item.id===zoneId);if(!zone||!street)notFound();
  const filters=parseStreetFilters(query),q=typeof query.q==="string"?query.q.trim().slice(0,100):"";
  const sort=typeof query.sort==="string"&&query.sort in streetSorts?query.sort as StreetSort:"civic_asc";
  const page=Math.max(1,Math.min(100000,Number(query.page)||1));
  const recordCandidates=hasRecordFilters(filters)?records.filter(record=>recordMatchesStreetFilters(record,filters)):records;
  const candidateIds=hasRecordFilters(filters)?[...new Set(recordCandidates.map(record=>record.civicId))]:undefined;
  const searchContactIds=q?[...new Set(recordCandidates.filter(record=>recordMatchesQuickSearch(record,q)).map(record=>record.civicId))]:[];
  const result=hasSupabaseEnvironment()
    ?await pageStreetAddressAccesses({zoneId,streetId,search:q,candidateIds,searchContactIds,sort,page,
      civicFrom:filters.civicFrom&&/^\d+$/.test(filters.civicFrom)?Number(filters.civicFrom):undefined,
      civicTo:filters.civicTo&&/^\d+$/.test(filters.civicTo)?Number(filters.civicTo):undefined})
    :{accesses:demoCivics.filter(civic=>civic.streetId===streetId).map(civic=>({id:civic.id,streetId,streetName:street.name,sourceKind:"MANUAL" as const,civic:civic.number,exponent:civic.extension})),total:demoCivics.filter(civic=>civic.streetId===streetId).length};
  const resultIds=new Set(result.accesses.map(access=>access.id));
  const visibleRecords=recordCandidates.filter(record=>resultIds.has(record.civicId));
  return <><PageHeader eyebrow="Zona / Via o indirizzo" title={street.name} description={[street.localityName,zone.municipality].filter(Boolean).join(" · ")} action={<div className="button-row"><Link className="button secondary" href={`/censimento/zone/${zone.id}`}>Torna alla zona</Link><Link className="button primary" href={`/censimento/contatti/nuovo?zoneId=${zone.id}&streetId=${street.id}`}>+ Nuovo contatto</Link><Link className="button secondary" href={`/geocensimento?zone=${zone.id}&street=${street.id}`}>Apri in GeoCensimento</Link></div>}/>
    <TerritoryKpis accessCount={street.totalAccesses} records={records}/>
    <section className="panel"><h2>Civici e contatti</h2><p className="muted">Cerca un civico o una persona; i filtri dettagliati sono disponibili solo quando servono.</p>
      <StreetCivicsList zoneId={zoneId} streetId={streetId} accesses={result.accesses} records={visibleRecords} complexes={complexes.filter(item=>item.zoneId===zoneId)} total={result.total} page={page} query={query} sort={sort} filters={filters}/>
    </section></>;
}
