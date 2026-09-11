import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { ContactsTable } from "@/features/census/contacts-table";
import { loadCensusData } from "@/services/census-data";

export default async function ContactsPage({searchParams}:{searchParams:Promise<{created?:string}>}) { const [{created},{records,zones,streets,complexes,operators}]=await Promise.all([searchParams,loadCensusData()]); return <><PageHeader eyebrow="Censimento" title="Proprietà" description="Contesti immobiliari con soggetti e storico delle interviste collegati." action={<Link className="button primary" href="/censimento/contatti/nuovo"><Plus size={17}/> Nuova proprietà</Link>}/>{created==="1"&&<div className="success-banner">Proprietà e soggetto collegato salvati nel database LAB.</div>}<ContactsTable {...{records,zones,streets,complexes,operators}}/></> }
