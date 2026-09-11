import type { CensusRecord, CensusZone, Civic, Complex, Operator, Street } from "@/domain/census";

export interface CensusRepository {
  listRecords(): Promise<CensusRecord[]>;
  listZones(): Promise<CensusZone[]>;
  listStreets(): Promise<Street[]>;
  listCivics(): Promise<Civic[]>;
  listComplexes(): Promise<Complex[]>;
  listOperators(): Promise<Operator[]>;
}
