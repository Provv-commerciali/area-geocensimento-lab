import type { CensusRepository } from "./census-repository";
import { civics, complexes, countries, municipalities, operators, provinces, records, regions, streets, subjects, zones } from "@/lib/demo-data";
import { DEFAULT_STALE_NEWS_DAYS } from "@/domain/census-operational-status";

export const demoCensusRepository: CensusRepository = {
  async listRecords() { return records; }, async listZones() { return zones; }, async listStreets() { return streets; },
  async listCivics() { return civics; }, async listComplexes() { return complexes; }, async listOperators() { return operators; },
  async listCountries() { return countries; }, async listRegions() { return regions; }, async listProvinces() { return provinces; }, async listMunicipalities() { return municipalities; }, async listSubjects() { return subjects; },
  async getOperationalSettings() { return { staleNewsDays: DEFAULT_STALE_NEWS_DAYS }; },
};
