import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { ContactsTable } from "@/features/census/contacts-table";
import { civicLabel } from "@/domain/census";
import { loadCensusData } from "@/services/census-data";
import Link from "next/link";
export default async function ComplexPage({params}:{params:Promise<{complexId:string}>}){const {complexId}=await params;const {civics,complexes,operators,records,streets,zones,operationalSettings,operationalToday}=await loadCensusData(["civics","complexes","operators","records","streets","zones","operationalSettings"],{records:{complexId}});const complex=complexes.find(c=>c.id===complexId);if(!complex)notFound();const linked=civics.filter(c=>complex.civicIds.includes(c.id));return <><PageHeader eyebrow="Complesso / Mostra interni" title={complex.name} description={`${linked.length} civici collegati: ${linked.map(civicLabel).join(", ")}`} action={<Link className="button primary" href={`/geocensimento?zone=${complex.zoneId}&complex=true`}>Visualizza in GeoCensimento</Link>}/><ContactsTable records={records} {...{zones,streets,complexes,operators,operationalSettings,operationalToday}}/></>}
