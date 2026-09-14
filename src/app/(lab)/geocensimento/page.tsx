import { PageHeader } from "@/components/ui";
import { parseGeoCensusFilters } from "@/domain/geocensus";
import { GeoCensusMap } from "@/features/geocensus/geocensus-map";
import { loadCensusData } from "@/services/census-data";
import { getCadastralAccess } from "@/services/cadastral-data-service";
import { loadPrimaryContactPhotoUrls } from "@/services/contact-photo-data";

export default async function GeoCensimentoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [params, data, paidAuthorized] = await Promise.all([searchParams, loadCensusData(["records", "zones", "streets", "civics", "complexes", "operators", "operationalSettings"]),getCadastralAccess()]);const photoUrls=await loadPrimaryContactPhotoUrls(data.records.map(record=>record.id));const records=data.records.map(record=>({...record,photoUrl:photoUrls[record.id]}));
  return <><PageHeader eyebrow="Censimento / Rappresentazione geografica" title="GeoCensimento" description="Contatti, civici e Complessi del Censimento esistente sulla cartografia operativa."/><GeoCensusMap records={records} civics={data.civics} zones={data.zones} streets={data.streets} complexes={data.complexes} operators={data.operators} settings={data.operationalSettings} today={data.operationalToday} initialFilters={parseGeoCensusFilters(params)} paidAuthorized={paidAuthorized}/></>;
}
