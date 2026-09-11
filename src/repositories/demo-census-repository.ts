import type { CensusRepository } from "./census-repository";
import { civics, complexes, countries, municipalities, operators, provinces, records, regions, streets, subjects, zones } from "@/lib/demo-data";
import { DEFAULT_STALE_NEWS_DAYS } from "@/domain/census-operational-status";

export const demoCensusRepository: CensusRepository = {
  async listRecords(query) { return records.filter((record) => (!query?.recordId || record.id === query.recordId) && (!query?.zoneId || record.zoneId === query.zoneId) && (!query?.streetId || record.streetId === query.streetId) && (!query?.complexId || record.complexId === query.complexId) && (!query?.subjectId || record.subjectLinks.some(link=>link.subjectId===query.subjectId))); },
  async listZones() { return zones; }, async listStreets(municipalityId) { return streets.filter((street) => !municipalityId || street.municipalityId === municipalityId); },
  async listCivics(query) { return civics.filter(civic=>(!query?.civicId||civic.id===query.civicId)&&(!query?.streetId||civic.streetId===query.streetId)); }, async listComplexes() { return complexes; }, async listOperators() { return operators; },
  async listCountries() { return countries; }, async listRegions() { return regions; }, async listProvinces() { return provinces; }, async listMunicipalities(provinceId) { return municipalities.filter((municipality) => !provinceId || municipality.provinceId === provinceId); }, async listSubjects(ids) { return ids?subjects.filter(subject=>ids.includes(subject.id)):subjects; },
  async searchSubjects(query) { const needle=query.trim().toLocaleLowerCase("it");return subjects.filter(subject=>[subject.firstName,subject.lastName,subject.companyName,subject.taxCode,subject.vatNumber].some(value=>value?.toLocaleLowerCase("it").includes(needle))).slice(0,20); },
  async getOperationalSettings() { return { staleNewsDays: DEFAULT_STALE_NEWS_DAYS }; },
};
