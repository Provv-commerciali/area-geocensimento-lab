import type { CensusRecord, CensusZone, Civic, Complex, Operator, Street } from "@/domain/census";
import { CENSUS_OPERATIONAL_STATUS_VISUALS, deriveCensusOperationalStatus, type CensusOperationalSettings, type CensusOperationalStatus } from "@/domain/census-operational-status";
import { filterCensusRecords, type CensusFilters } from "@/features/census/filters";

export const MAP_STATUS_PRECEDENCE: CensusOperationalStatus[] = ["RICONTATTO_SCADUTO", "NOTIZIA_NON_AGGIORNATA", "MAI_CONTATTATO", "ORDINARIO"];

export interface GeoCensusFilters extends CensusFilters { onlyComplexes?: boolean }
export interface CivicMapFeature {
  civicId: string; longitude: number; latitude: number; address: string; zoneId: string; streetId: string;
  records: CensusRecord[]; status: CensusOperationalStatus; complexNames: string[];
}
export interface GeoCensusProjection { features: CivicMapFeature[]; visibleRecordCount: number; notGeolocatedCivicCount: number; notGeolocatedRecordCount: number; firstMissingAddress?: string }

export function dominantOperationalStatus(records: CensusRecord[], settings: CensusOperationalSettings, today: string): CensusOperationalStatus {
  const present = new Set(records.map((record) => deriveCensusOperationalStatus({ contactType: record.contactType, interviews: record.interviews, staleNewsDays: settings.staleNewsDays, today }).status));
  return MAP_STATUS_PRECEDENCE.find((status) => present.has(status)) ?? "ORDINARIO";
}

export function projectGeoCensus(input: {
  records: CensusRecord[]; civics: Civic[]; streets: Street[]; complexes: Complex[]; filters: GeoCensusFilters;
  settings: CensusOperationalSettings; today: string;
}): GeoCensusProjection {
  const filtered = filterCensusRecords(input.records, input.filters, { ...input.settings, today: input.today })
    .filter((record) => !input.filters.onlyComplexes || Boolean(record.complexId));
  const byCivic = new Map<string, CensusRecord[]>();
  filtered.forEach((record) => byCivic.set(record.civicId, [...(byCivic.get(record.civicId) ?? []), record]));
  let notGeolocatedCivicCount = 0; let notGeolocatedRecordCount = 0; let firstMissingAddress: string | undefined;
  const features: CivicMapFeature[] = [];
  byCivic.forEach((records, civicId) => {
    const civic = input.civics.find((item) => item.id === civicId);
    const street = input.streets.find((item) => item.id === (civic?.streetId ?? records[0].streetId));
    if (!civic?.location || civic.geocodingStatus !== "GEOLOCATED") { notGeolocatedCivicCount += 1; notGeolocatedRecordCount += records.length; firstMissingAddress ??= `${street?.name ?? records[0].streetName}, ${civic?.number ?? records[0].civicNumber}${civic?.extension ? `/${civic.extension}` : ""}`; return; }
    const complexNames = [...new Set(records.map((record) => record.complexName).filter((value): value is string => Boolean(value)))];
    features.push({ civicId, longitude: civic.location.longitude, latitude: civic.location.latitude, address: `${street?.name ?? "Via"}, ${civic.number}${civic.extension ? `/${civic.extension}` : ""}`, zoneId: records[0].zoneId, streetId: civic.streetId, records, status: dominantOperationalStatus(records, input.settings, input.today), complexNames });
  });
  return { features, visibleRecordCount: filtered.length, notGeolocatedCivicCount, notGeolocatedRecordCount, firstMissingAddress };
}

export function markerColor(status: CensusOperationalStatus): string { return CENSUS_OPERATIONAL_STATUS_VISUALS[status].markerColor }

const allowedOperational = new Set(["never", "recallOverdue", "staleNews", "actionRequired"]);
export function parseGeoCensusFilters(params: Record<string, string | string[] | undefined>): GeoCensusFilters {
  const one = (key: string) => typeof params[key] === "string" ? params[key] as string : undefined;
  const operational = one("activity");
  return { zoneId: one("zone"), streetId: one("street"), contactType: one("type"), operatorId: one("operator"), appraised: one("appraised"), operationalStatus: operational && allowedOperational.has(operational) ? operational as GeoCensusFilters["operationalStatus"] : undefined, onlyComplexes: one("complex") === "true", query: one("q") };
}

export function geoCensusHref(filters: GeoCensusFilters): string {
  const params = new URLSearchParams();
  if (filters.zoneId) params.set("zone", filters.zoneId); if (filters.streetId) params.set("street", filters.streetId);
  if (filters.contactType) params.set("type", filters.contactType); if (filters.operatorId) params.set("operator", filters.operatorId);
  if (filters.appraised) params.set("appraised", filters.appraised); if (filters.operationalStatus) params.set("activity", filters.operationalStatus);
  if (filters.onlyComplexes) params.set("complex", "true"); if (filters.query) params.set("q", filters.query);
  const query = params.toString(); return `/geocensimento${query ? `?${query}` : ""}`;
}

export interface GeoCensusOptions { zones: CensusZone[]; streets: Street[]; operators: Operator[] }
