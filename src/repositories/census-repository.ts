import type { CensusRecord, CensusZone, Civic, Complex, Country, Municipality, Operator, Province, Region, Street, Subject } from "@/domain/census";
import type { CensusOperationalSettings } from "@/domain/census-operational-status";

export interface CensusRepository {
  listRecords(): Promise<CensusRecord[]>;
  listZones(): Promise<CensusZone[]>;
  listStreets(): Promise<Street[]>;
  listCivics(): Promise<Civic[]>;
  listComplexes(): Promise<Complex[]>;
  listOperators(): Promise<Operator[]>;
  listCountries(): Promise<Country[]>;
  listRegions(): Promise<Region[]>;
  listProvinces(): Promise<Province[]>;
  listMunicipalities(): Promise<Municipality[]>;
  listSubjects(): Promise<Subject[]>;
  getOperationalSettings(): Promise<CensusOperationalSettings>;
}
