import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { ContactsTable } from "@/features/census/contacts-table";
import { complexes, operators, records, streets, zones } from "@/lib/demo-data";

export default function ContactsPage() { return <><PageHeader eyebrow="Censimento" title="Contatti" description="Ricerca trasversale su anagrafica, territorio, immobile, catasto e attività." action={<Link className="button primary" href="/censimento/contatti/nuovo"><Plus size={17}/> Nuovo contatto</Link>}/><ContactsTable {...{records,zones,streets,complexes,operators}}/></> }
