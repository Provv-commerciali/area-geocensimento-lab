import { useEffect, useState } from "react";
import { z } from "zod";
import type { Civic } from "@/domain/census";

const response = z.object({ accesses: z.array(z.object({ id: z.string(), streetId: z.string(),
  number: z.string(), extension: z.string().optional(), geocodingStatus: z.enum(["NOT_GEOLOCATED","AUTO_GEOLOCATED","VERIFIED"]),
  location:z.object({longitude:z.number(),latitude:z.number(),source:z.string().optional(),geocodedAt:z.string().optional(),verifiedAt:z.string().optional()}).optional() })) });

export function useStreetAccesses(streetId: string, search: string, databaseMode: boolean, initial: Civic[]) {
  const [loaded, setLoaded] = useState<Civic[]>(initial);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!databaseMode || !streetId) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await fetch(`/api/territory/accesses?streetId=${encodeURIComponent(streetId)}&q=${encodeURIComponent(search)}`, { signal: controller.signal });
        if (!result.ok) throw new Error("Access search failed");
        setLoaded(response.parse(await result.json()).accesses);
        setError(false);
      } catch { if (!controller.signal.aborted) setError(true); }
    }, search ? 200 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [streetId, search, databaseMode, initial]);
  return { accesses: databaseMode && streetId ? loaded : initial, error: databaseMode && streetId && error };
}
