import { demoCensusRepository } from "@/repositories/demo-census-repository";
import { supabaseCensusRepository } from "@/repositories/supabase-census-repository";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";

export function censusRepository() { return hasSupabaseEnvironment() ? supabaseCensusRepository : demoCensusRepository }
export async function loadCensusData() { const repo=censusRepository(); const [records,zones,streets,civics,complexes,operators,countries,regions,provinces,municipalities]=await Promise.all([repo.listRecords(),repo.listZones(),repo.listStreets(),repo.listCivics(),repo.listComplexes(),repo.listOperators(),repo.listCountries(),repo.listRegions(),repo.listProvinces(),repo.listMunicipalities()]); return {records,zones,streets,civics,complexes,operators,countries,regions,provinces,municipalities} }
