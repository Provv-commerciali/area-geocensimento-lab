import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { ContactsTable } from "@/features/census/contacts-table";
import { loadCensusData } from "@/services/census-data";

export default async function ContactsPage({searchParams}:{searchParams:Promise<{created?:string}>}) { const [{created},{records,zones,streets,complexes,operators}]=await Promise.all([searchParams,loadCensusData()]); return <><PageHeader eyebrow="Censimento" title="Contatti" description="Contatti di censimento associati al proprio contesto immobiliare e allo storico delle interviste." action={<Link className="button primary" href="/censimento/contatti/nuovo"><Plus size={17}/> Nuovo contatto</Link>}/>{created==="1"&&<div className="success-banner">Contatto salvato nel database LAB.</div>}<ContactsTable {...{records,zones,streets,complexes,operators}}/></> }
