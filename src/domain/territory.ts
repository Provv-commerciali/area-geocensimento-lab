export type TerritorialSource = "OFFICIAL_ANNCSU" | "MANUAL";

export interface CanonicalStreet {
  id: string;
  municipalityId: string;
  name: string;
  localityName?: string;
  localityId?: string;
  totalAccesses: number;
  sourceKind: TerritorialSource;
  anncsuProgressivoNazionale?: string;
  isPresentInLatestSnapshot: boolean;
  manualReviewState?: "PROPOSED" | "APPROVED" | "RETIRED";
}

export interface AddressAccess {
  id: string;
  streetId: string;
  streetName: string;
  sourceKind: TerritorialSource;
  anncsuProgressivoAccesso?: string;
  civic?: string;
  exponent?: string;
  specificity?: string;
  metric?: string;
  progressivoSnc?: string;
  longitude?: number;
  latitude?: number;
  locationCrs?: string;
  locationSource?: string;
}

export interface ZoneAccessCounts {
  streetCount: number;
  accessCount: number;
  locatedCount: number;
  unlocatedCount: number;
}

export function accessLabel(access: Pick<AddressAccess,"civic"|"exponent"|"specificity"|"metric"|"progressivoSnc">): string {
  const number = access.civic ? `${access.civic}${access.exponent ? `/${access.exponent}` : ""}` : access.metric ? `km ${access.metric}` : "SNC";
  return [access.progressivoSnc && number === "SNC" ? `SNC ${access.progressivoSnc}` : number,
    access.specificity,access.progressivoSnc && number !== "SNC" ? `SNC ${access.progressivoSnc}` : undefined].filter(Boolean).join(" · ");
}
