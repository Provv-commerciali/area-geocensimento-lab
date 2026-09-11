import type { CensusRepository } from "./census-repository";
import { civics, complexes, operators, records, streets, zones } from "@/lib/demo-data";

export const demoCensusRepository: CensusRepository = {
  async listRecords() { return records; }, async listZones() { return zones; }, async listStreets() { return streets; },
  async listCivics() { return civics; }, async listComplexes() { return complexes; }, async listOperators() { return operators; },
};
