import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { ContactsTable } from "@/features/census/contacts-table";
import { civicLabel } from "@/domain/census";
import { loadCensusData } from "@/services/census-data";
import Link from "next/link";
export default async function ComplexPage({params}:{params:Promise<{complexId:string}>}){const [{complexId},{civics,complexes,operators,records,streets,zones,operationalSettings,operationalToday}]=await Promise.all([params,loadCensusData()]);const complex=complexes.find(c=>c.id===complexId);if(!complex)notFound();const linked=civics.filter(c=>complex.civicIds.includes(c.id));return <><PageHeader eyebrow="Complesso / Mostra interni" title={complex.name} description={`${linked.length} civici collegati: ${linked.map(civicLabel).join(", ")}`} action={<Link className="button primary" href={`/geocensimento?zone=${complex.zoneId}&complex=true`}>Visualizza in GeoCensimento</Link>}/><ContactsTable records={records.filter(r=>r.complexId===complexId)} {...{zones,streets,complexes,operators,operationalSettings,operationalToday}}/></>}
