import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { ZoneTerritoryManager } from "@/features/zones/zone-territory-manager";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";
import { loadCensusData } from "@/services/census-data";
import { getZoneAccessCounts, listZoneAddressAccesses, listZoneStreets } from "@/repositories/territory-repository";

export default async function EditZonePage({params}:{params:Promise<{zoneId:string}>}) {
  const {zoneId}=await params;
  const [{zones},streets,accesses,counts]=await Promise.all([
    loadCensusData(["zones"]),listZoneStreets(zoneId),listZoneAddressAccesses(zoneId,100),getZoneAccessCounts(zoneId)]);
  const zone=zones.find(item=>item.id===zoneId);
  if(!zone)notFound();
  return <><PageHeader eyebrow="Zone / Modifica" title={`Modifica ${zone.name}`} description={`${zone.municipality} · Gestisci vie e accessi della zona`} action={<Link className="button secondary" href={`/censimento/zone/${zone.id}`}>Torna alla zona</Link>}/><ZoneTerritoryManager {...{zone,streets,accesses,counts}} databaseMode={hasSupabaseEnvironment()}/></>;
}
