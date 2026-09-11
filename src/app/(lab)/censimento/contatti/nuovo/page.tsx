import { PageHeader } from "@/components/ui";
import { ContactForm } from "@/features/census/contact-form";
import { loadCensusData } from "@/services/census-data";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";
export default async function NewContactPage(){const {zones,streets,civics,complexes,operators}=await loadCensusData();return <><PageHeader eyebrow="Censimento / Contatti" title="Nuovo contatto" description="Registra anagrafica, immobile e dati catastali manuali. Le interviste si aggiungono in seguito con un'azione esplicita."/><ContactForm {...{zones,streets,civics,complexes,operators}} databaseMode={hasSupabaseEnvironment()}/></>}
