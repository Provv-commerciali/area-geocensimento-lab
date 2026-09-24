import type { CensusRecord, CensusZone, Civic, Complex, Country, Municipality, Operator, Province, Region, Street, Subject, SubjectSearchResult } from "@/domain/census";
import type { CensusOperationalSettings } from "@/domain/census-operational-status";

export type CensusRecordQuery = {
  recordId?: string;
  zoneId?: string;
  streetId?: string;
  complexId?: string;
  subjectId?: string;
};
export type CivicQuery = { civicId?: string; streetId?: string };

export interface CensusRepository {
  listRecords(query?: CensusRecordQuery): Promise<CensusRecord[]>;
  listZones(): Promise<CensusZone[]>;
  listStreets(municipalityId?: string): Promise<Street[]>;
  listCivics(query?: CivicQuery): Promise<Civic[]>;
  listComplexes(): Promise<Complex[]>;
  listOperators(): Promise<Operator[]>;
  listCountries(): Promise<Country[]>;
  listRegions(): Promise<Region[]>;
  listProvinces(): Promise<Province[]>;
  listMunicipalities(provinceId?: string): Promise<Municipality[]>;
  listSubjects(ids?: string[]): Promise<Subject[]>;
  searchSubjects(query: string): Promise<SubjectSearchResult[]>;
  getOperationalSettings(): Promise<CensusOperationalSettings>;
}
