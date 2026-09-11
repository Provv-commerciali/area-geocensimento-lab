import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { ContactsTable } from "@/features/census/contacts-table";
import { complexes, operators, records, streets, zones } from "@/lib/demo-data";
export default async function StreetPage({params}:{params:Promise<{zoneId:string;streetId:string}>}){const {zoneId,streetId}=await params;const zone=zones.find(z=>z.id===zoneId);const street=streets.find(s=>s.id===streetId);if(!zone||!street||!zone.streetIds.includes(streetId))notFound();return <><PageHeader eyebrow={`${zone.name} / Via`} title={street.name} description="Contesto territoriale già determinato: i filtri Zona e Via non vengono richiesti di nuovo."/><ContactsTable {...{records,zones,streets,complexes,operators}} fixedZoneId={zoneId} fixedStreetId={streetId}/></>}
