import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { ZoneTerritoryManager } from "@/features/zones/zone-territory-manager";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";
import { loadCensusData } from "@/services/census-data";
import { getZoneAccessCounts, listZoneStreets } from "@/repositories/territory-repository";

export default async function EditZonePage({params}:{params:Promise<{zoneId:string}>}) {
  const {zoneId}=await params;
  const [{zones},streets,counts]=await Promise.all([
    loadCensusData(["zones"]),listZoneStreets(zoneId),getZoneAccessCounts(zoneId)]);
  const zone=zones.find(item=>item.id===zoneId);
  if(!zone)notFound();
  return <><PageHeader eyebrow="Zone / Modifica" title={`Modifica ${zone.name}`} description={`${zone.municipality} · Gestisci le vie e gli indirizzi della zona`} action={<Link className="button secondary" href={`/censimento/zone/${zone.id}`}>Torna alla zona</Link>}/><ZoneTerritoryManager {...{zone,streets,counts}} databaseMode={hasSupabaseEnvironment()}/></>;
}
