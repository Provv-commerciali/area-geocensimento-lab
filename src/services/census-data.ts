import { demoCensusRepository } from "@/repositories/demo-census-repository";
import { supabaseCensusRepository } from "@/repositories/supabase-census-repository";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";
import { todayInTimeZone } from "@/domain/census-operational-status";
import type { CensusRecordQuery, CensusRepository } from "@/repositories/census-repository";

export function censusRepository() { return hasSupabaseEnvironment() ? supabaseCensusRepository : demoCensusRepository }

type ResourceLoaders = {
  records: CensusRepository["listRecords"];
  zones: CensusRepository["listZones"];
  streets: CensusRepository["listStreets"];
  civics: CensusRepository["listCivics"];
  complexes: CensusRepository["listComplexes"];
  operators: CensusRepository["listOperators"];
  countries: CensusRepository["listCountries"];
  regions: CensusRepository["listRegions"];
  provinces: CensusRepository["listProvinces"];
  municipalities: CensusRepository["listMunicipalities"];
  subjects: CensusRepository["listSubjects"];
  operationalSettings: CensusRepository["getOperationalSettings"];
};
type Resource = keyof ResourceLoaders;
type CensusData = { [Key in Resource]: Awaited<ReturnType<ResourceLoaders[Key]>> };
type LoadOptions = { records?: CensusRecordQuery; municipalityProvinceId?: string; streetMunicipalityId?: string };

export async function loadCensusData<const Keys extends readonly Resource[]>(resources: Keys, options: LoadOptions = {}) {
  const repo = censusRepository();
  const loaders: { [Key in Resource]: () => Promise<CensusData[Key]> } = {
    records: () => repo.listRecords(options.records), zones: () => repo.listZones(), streets: () => repo.listStreets(options.streetMunicipalityId),
    civics: () => repo.listCivics(), complexes: () => repo.listComplexes(), operators: () => repo.listOperators(), countries: () => repo.listCountries(),
    regions: () => repo.listRegions(), provinces: () => repo.listProvinces(), municipalities: () => repo.listMunicipalities(options.municipalityProvinceId),
    subjects: () => repo.listSubjects(), operationalSettings: () => repo.getOperationalSettings(),
  };
  const values = await Promise.all(resources.map((resource) => loaders[resource]()));
  return Object.assign(
    { operationalToday: todayInTimeZone() },
    Object.fromEntries(resources.map((resource, index) => [resource, values[index]])),
  ) as Pick<CensusData, Keys[number]> & { operationalToday: string };
}
