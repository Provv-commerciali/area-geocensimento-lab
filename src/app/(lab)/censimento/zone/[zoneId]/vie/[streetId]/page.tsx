import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { StreetCivicsList } from "@/features/zones/street-civics-list";
import { TerritoryKpis } from "@/features/zones/territory-kpis";
import { hasRecordFilters, parseStreetFilters, recordMatchesQuickSearch, recordMatchesStreetFilters, streetSorts, type StreetSort } from "@/features/zones/street-operations";
import { pageStreetRepresentations, getZoneStreet, type StreetRepresentation } from "@/repositories/territory-repository";
import { loadCensusData } from "@/services/census-data";
import { loadStreetComplexSummaries } from "@/services/street-complex-summaries";
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
  const recordFiltersBeyondComplex=Object.entries(filters).some(([key,value])=>key!=="complex"&&key!=="civicFrom"&&key!=="civicTo"&&Boolean(value));
  const candidateIds=recordFiltersBeyondComplex?[...new Set(recordCandidates.map(record=>record.civicId))]:undefined;
  const searchContactIds=q?[...new Set(recordCandidates.filter(record=>recordMatchesQuickSearch(record,q)).map(record=>record.civicId))]:[];
  const databaseMode=hasSupabaseEnvironment();
  const result=databaseMode
    ?await pageStreetRepresentations({zoneId,streetId,search:q,candidateIds,searchContactIds,sort,page,complexId:filters.complex,
      civicFrom:filters.civicFrom&&/^\d+$/.test(filters.civicFrom)?Number(filters.civicFrom):undefined,
      civicTo:filters.civicTo&&/^\d+$/.test(filters.civicTo)?Number(filters.civicTo):undefined})
    :(()=>{const seen=new Set<string>();const all:StreetRepresentation[]=demoCivics.filter(civic=>civic.streetId===streetId).flatMap(civic=>{const complex=complexes.find(item=>item.zoneId===zoneId&&item.civicIds.includes(civic.id));const key=complex?.id??civic.id;if(seen.has(key))return[];seen.add(key);return[{access:{id:civic.id,streetId,streetName:street.name,sourceKind:"MANUAL" as const,civic:civic.number,exponent:civic.extension},complexId:complex?.id}]}).filter(item=>{
      const related=recordCandidates.filter(record=>item.complexId?record.complexId===item.complexId:record.civicId===item.access.id);
      return (!filters.complex||item.complexId===filters.complex)&&(!recordFiltersBeyondComplex||related.length>0)&&(!q||[item.access.civic,item.access.exponent,complexes.find(c=>c.id===item.complexId)?.name,...related.map(r=>`${r.firstName} ${r.lastName} ${r.phone??""}`)].join(" ").toLocaleLowerCase("it").includes(q.toLocaleLowerCase("it")));
    });return{items:all.slice((page-1)*40,page*40),total:all.length}})();
  const visibleComplexes=complexes.filter(item=>result.items.some(row=>row.complexId===item.id));
  const [complexSummaries,complexRecords]=await Promise.all([
    loadStreetComplexSummaries(visibleComplexes),
    visibleComplexes.length?loadCensusData(["records"],{records:{zoneId,complexIds:visibleComplexes.map(item=>item.id)}}).then(data=>data.records):Promise.resolve([]),
  ]);
  const normalIds=new Set(result.items.filter(item=>!item.complexId).map(item=>item.access.id));
  const visibleRecords=recordCandidates.filter(record=>normalIds.has(record.civicId));
  return <><PageHeader eyebrow="Zona / Via o indirizzo" title={street.name} description={[street.localityName,zone.municipality].filter(Boolean).join(" · ")} action={<div className="button-row"><Link className="button secondary" href={`/censimento/zone/${zone.id}`}>Torna alla zona</Link><Link className="button primary" href={`/censimento/contatti/nuovo?zoneId=${zone.id}&streetId=${street.id}`}>+ Nuovo contatto</Link><Link className="button secondary" href={`/geocensimento?zone=${zone.id}&street=${street.id}`}>Apri in GeoCensimento</Link></div>}/>
    <TerritoryKpis accessCount={street.totalAccesses} records={records}/>
    <section className="panel"><h2>Civici, complessi e contatti</h2><p className="muted">Cerca un civico, un complesso o una persona; i filtri dettagliati sono disponibili solo quando servono.</p>
      <StreetCivicsList zoneId={zoneId} streetId={streetId} items={result.items} records={visibleRecords} complexRecords={complexRecords} complexes={complexes.filter(item=>item.zoneId===zoneId)} complexSummaries={complexSummaries} total={result.total} page={page} query={query} sort={sort} filters={filters}/>
    </section></>;
}
