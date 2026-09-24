import { PageHeader } from "@/components/ui";
import { parseGeoCensusFilters } from "@/domain/geocensus";
import { GeoCensusMap } from "@/features/geocensus/geocensus-map";
import { loadCensusData } from "@/services/census-data";
import { getCadastralAccess } from "@/services/cadastral-data-service";
import { loadPrimaryContactPhotoUrls } from "@/services/contact-photo-data";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";
import { getZoneAccessCounts, listZoneAddressAccesses } from "@/repositories/territory-repository";
import { accessLabel } from "@/domain/territory";

export default async function GeoCensimentoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (hasSupabaseEnvironment()) {
    const [params, data] = await Promise.all([searchParams, loadCensusData(["zones"])]);
    const requested = typeof params.zone === "string" ? params.zone : undefined;
    const zone = data.zones.find(item => item.id === requested) ?? data.zones[0];
    const [counts, accesses] = zone ? await Promise.all([getZoneAccessCounts(zone.id), listZoneAddressAccesses(zone.id,100)]) : [undefined,[]];
    return <><PageHeader eyebrow="Censimento / Base territoriale" title="GeoCensimento" description="Gli accessi delle vie assegnate alla Zona costituiscono la base territoriale, anche senza contatti."/>
      <section className="zone-detail-panel"><h2>Fondazione territoriale ANNCSU</h2><p>In questa fase la mappa operativa preesistente è sospesa nel LAB: CRS, osservazioni e selezione della posizione effettiva sono conservati; la visualizzazione cartografica degli accessi verrà integrata nel prossimo milestone approvato.</p>
        <nav aria-label="Zone">{data.zones.map(item=><a key={item.id} href={`/geocensimento?zone=${item.id}`}>{item.name}</a>)}</nav>
        {zone?<><h3>{zone.name}</h3><p>{counts?.streetCount??0} vie · {counts?.accessCount??0} accessi · {counts?.locatedCount??0} con posizione · {counts?.unlocatedCount??0} senza posizione.</p>
          <p>Primi {accesses.length} accessi indipendenti dai CensusRecord:</p><ul>{accesses.map(access=><li key={access.id}>{access.streetName}, {accessLabel(access)} · {access.sourceKind}{access.locationSource?` · ${access.locationSource}`:""}</li>)}</ul></>:<p>Nessuna Zona disponibile. Crea una Zona e assegna vie ufficiali.</p>}
      </section></>;
  }
  const [params, data, paidAuthorized] = await Promise.all([searchParams, loadCensusData(["records", "zones", "streets", "civics", "complexes", "operators", "operationalSettings"]),getCadastralAccess()]);const photoUrls=await loadPrimaryContactPhotoUrls(data.records.map(record=>record.id));const records=data.records.map(record=>({...record,photoUrl:photoUrls[record.id]}));
  return <><PageHeader eyebrow="Censimento / Rappresentazione geografica" title="GeoCensimento" description="Contatti, civici e Complessi del Censimento esistente sulla cartografia operativa."/><GeoCensusMap records={records} civics={data.civics} zones={data.zones} streets={data.streets} complexes={data.complexes} operators={data.operators} settings={data.operationalSettings} today={data.operationalToday} initialFilters={parseGeoCensusFilters(params)} paidAuthorized={paidAuthorized}/></>;
}
