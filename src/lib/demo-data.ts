import type { CensusRecord, CensusZone, Civic, Complex, Country, Municipality, Operator, Province, Region, Street, Subject } from "@/domain/census";

export const operators: Operator[] = [
  { id: "op-1", name: "Elena Rossi" }, { id: "op-2", name: "Marco Bianchi" }, { id: "op-3", name: "Sara Conti" },
];
export const countries: Country[] = [{ id: "country-it", code: "IT", name: "Italia" }];
export const regions: Region[] = [{ id: "region-er", countryId: "country-it", name: "Emilia-Romagna" }];
export const provinces: Province[] = [{ id: "province-bo", regionId: "region-er", code: "BO", name: "Bologna" }];
export const municipalities: Municipality[] = [{ id: "municipality-bo", provinceId: "province-bo", name: "Bologna" }];
export const streets: Street[] = [
  { id: "st-1", municipalityId: "municipality-bo", name: "Via Roma", municipality: "Bologna" }, { id: "st-2", municipalityId: "municipality-bo", name: "Via San Vitale", municipality: "Bologna" },
  { id: "st-3", municipalityId: "municipality-bo", name: "Via Marconi", municipality: "Bologna" }, { id: "st-4", municipalityId: "municipality-bo", name: "Via Indipendenza", municipality: "Bologna" },
  { id: "st-5", municipalityId: "municipality-bo", name: "Via Rizzoli", municipality: "Bologna" },
];
export const zones: CensusZone[] = [
  { id: "zone-1", name: "Centro Storico", municipalityId: "municipality-bo", municipality: "Bologna", operator: operators[0], streetIds: ["st-1", "st-2", "st-5"] },
  { id: "zone-2", name: "Porto–Saragozza", municipalityId: "municipality-bo", municipality: "Bologna", operator: operators[1], streetIds: ["st-3", "st-4"] },
];
export const civics: Civic[] = Array.from({ length: 20 }, (_, index) => ({
  id: `cv-${index + 1}`, streetId: streets[index % streets.length].id, number: String(2 + index * 2),
  ...(index % 6 === 0 ? { extension: index % 12 === 0 ? "A" : "bis" } : {}),
  geocodingStatus: index === 19 ? "NOT_GEOLOCATED" : index === 18 ? "AUTO_GEOLOCATED" : "VERIFIED",
  ...(index === 19 ? {} : { location: { longitude: 11.3425 + (index % 5) * 0.0022, latitude: 44.4937 + Math.floor(index / 5) * 0.0018, source: "fixture LAB", method: index === 18 ? "GEOCODER" : "MANUAL_MAP", geocodedAt: "2026-09-11", verifiedAt: index === 18 ? undefined : "2026-09-11", quality: 1 } }),
}));
export const complexes: Complex[] = [
  { id: "cx-1", name: "Corte Mercanti", zoneId: "zone-1", civicIds: ["cv-1", "cv-6", "cv-11"], sheet: "12", parcel: "88", units: 18, description: "Complesso multicivico LAB" },
  { id: "cx-2", name: "Residenza Portico", zoneId: "zone-1", civicIds: ["cv-2", "cv-7"], sheet: "14", parcel: "102", units: 10 },
  { id: "cx-3", name: "Palazzo del Canale", zoneId: "zone-2", civicIds: ["cv-3", "cv-8"], units: 14 },
];
const surnames = ["Ferri", "Romano", "Esposito", "Gallo", "De Luca", "Mancini", "Costa", "Giordano"];
const names = ["Anna", "Luca", "Giulia", "Paolo", "Chiara", "Davide", "Marta", "Andrea"];
export const records: CensusRecord[] = Array.from({ length: 36 }, (_, index) => {
  const civic = civics[index % civics.length]; const street = streets.find((s) => s.id === civic.streetId)!;
  const zone = zones.find((z) => z.streetIds.includes(street.id))!; const complex = complexes.find((c) => c.civicIds.includes(civic.id));
  const isNews = index % 4 === 3; const interviewCount = index % 7 === 0 ? 2 : index % 3 === 0 ? 1 : 0;
  return {
    id: `rec-${index + 1}`, subjectType: "PRIVATO", firstName: names[index % names.length], lastName: surnames[(index * 3) % surnames.length],
    phone: `051 555 ${String(1000 + index)}`, email: index % 5 ? undefined : `contatto${index + 1}@example.test`,
    contactType: isNews ? "Notizia" : (["Generico", "Informatore", "Informazione"] as const)[index % 3],
    inherited: index % 11 === 0, responsibleOperatorId: operators[index % operators.length].id,
    responsibleOperatorName: operators[index % operators.length].name, zoneId: zone.id, zoneName: zone.name,
    streetId: street.id, streetName: street.name, civicId: civic.id, civicNumber: civic.number, civicExtension: civic.extension,
    complexId: complex?.id, complexName: complex?.name, buildingScope: index % 6 === 0 ? "Intero edificio" : "Parte di edificio",
    levels: index % 6 === 0 ? 5 : undefined, floorCode: index % 6 === 0 ? undefined : index % 4 === 0 ? "3°" : `${(index % 5) + 1}°`, totalFloors: index % 4 === 0 && index % 6 !== 0 ? 10 : undefined, isTopFloor: index % 10 === 0 && index % 6 !== 0, floorLabel: index % 6 === 0 ? "Intero edificio" : index % 4 === 0 ? "3° di 10" : `${(index % 5) + 1}°`,
    rooms: 2 + (index % 6), surface: 48 + index * 3, occupancy: index % 3 === 0 ? "Occupato dal proprietario" : "Libero", elevator: index % 2 === 0,
    sheet: index % 5 === 1 ? undefined : String(10 + (index % 5)), parcel: index % 5 === 1 ? undefined : String(80 + index),
    subaltern: index % 3 === 0 ? String(index + 1) : undefined, cadastralCategory: index % 2 ? "A/2" : "A/3",
    isAppraised: isNews && index % 8 === 7, probableAssignment: index % 5 === 0, createdAt: `2026-0${(index % 8) + 1}-12`,
    subjectLinks: [{ subjectId: `subject-${index + 1}`, role: index % 3 === 0 ? "Proprietario" : "Inquilino", isPrimary: true }],
    interviews: Array.from({ length: interviewCount }, (_, j) => ({
      id: `int-${index}-${j}`, recordId: `rec-${index + 1}`, operatorId: operators[(index + j) % operators.length].id,
      operatorName: operators[(index + j) % operators.length].name, interviewDate: `2026-0${Math.min(9, (index % 8) + 1)}-${String(8 + j).padStart(2, "0")}`,
      recallDate: j === interviewCount - 1 ? (index === 7 ? "2026-08-15" : index % 2 === 0 ? "2026-12-15" : undefined) : undefined,
      response: j ? "Interessato" : "Da ricontattare", reason: "Verifica disponibilità", outcome: j ? "Positivo" : "In attesa",
    })),
  };
});

export const subjects: Subject[] = records.map((record, index) => ({
  id: `subject-${index + 1}`, subjectType: "PRIVATO", firstName: record.firstName, lastName: record.lastName,
  taxCode: index === 0 ? "FRRNNA80A41A944X" : undefined, phone: record.phone, email: record.email,
}));
