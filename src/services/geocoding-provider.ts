import "server-only";
import { z } from "zod";

export interface GeocodingResult { label: string; longitude: number; latitude: number; quality?: number }
export interface GeocodingProvider { search(query: string): Promise<GeocodingResult[]> }

const nominatimResponse = z.array(z.object({ display_name: z.string(), lon: z.string(), lat: z.string(), importance: z.number().optional() }));

export class NominatimGeocodingProvider implements GeocodingProvider {
  async search(query: string): Promise<GeocodingResult[]> {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query); url.searchParams.set("format", "jsonv2"); url.searchParams.set("limit", "5"); url.searchParams.set("countrycodes", "it");
    const response = await fetch(url, { headers: { "User-Agent": "area-geocensimento-lab/0.1 (manual search)", Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) throw new Error(`Geocoding non disponibile (${response.status})`);
    return nominatimResponse.parse(await response.json()).map((item) => ({ label: item.display_name, longitude: Number(item.lon), latitude: Number(item.lat), quality: item.importance }));
  }
}
