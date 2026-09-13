import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { ContactsTable } from "@/features/census/contacts-table";
import { civicLabel } from "@/domain/census";
import { loadCensusData } from "@/services/census-data";
import Link from "next/link";
import { ComplexPhotoManager } from "@/features/complex-photos/complex-photo-manager";
import { loadComplexPhotoData } from "@/services/complex-photo-data";
export default async function ComplexPage({params}:{params:Promise<{complexId:string}>}){const {complexId}=await params;const [{civics,complexes,operators,records,streets,zones,operationalSettings,operationalToday},photoData]=await Promise.all([loadCensusData(["civics","complexes","operators","records","streets","zones","operationalSettings"],{records:{complexId}}),loadComplexPhotoData(complexId)]);const complex=complexes.find(c=>c.id===complexId);if(!complex)notFound();const linked=civics.filter(c=>complex.civicIds.includes(c.id));const photoRevision=photoData.photos.map(photo=>`${photo.id}:${photo.processingStatus}`).concat(photoData.proposals.map(proposal=>`${proposal.id}:${proposal.status}`)).join("|");return <><PageHeader eyebrow="Complesso / Mostra interni" title={complex.name} description={`${linked.length} civici collegati: ${linked.map(civicLabel).join(", ")}`} action={<Link className="button primary" href={`/geocensimento?zone=${complex.zoneId}&complex=true`}>Visualizza in GeoCensimento</Link>}/><ComplexPhotoManager key={photoRevision} complexId={complexId} civics={linked} operators={operators} {...photoData}/><section className="complex-contacts"><h2>Contatti associati al complesso</h2><ContactsTable records={records} {...{zones,streets,complexes,operators,operationalSettings,operationalToday}}/></section></>}
