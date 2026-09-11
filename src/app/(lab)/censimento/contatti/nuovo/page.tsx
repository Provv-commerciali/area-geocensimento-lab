import { PageHeader } from "@/components/ui";
import { ContactForm } from "@/features/census/contact-form";
import { loadCensusData } from "@/services/census-data";
export default async function NewContactPage(){const {zones,streets,civics,complexes,operators}=await loadCensusData();return <><PageHeader eyebrow="Censimento / Contatti" title="Nuovo contatto" description="Registra anagrafica, immobile, dati catastali manuali e prima intervista."/><ContactForm {...{zones,streets,civics,complexes,operators}}/></>}
