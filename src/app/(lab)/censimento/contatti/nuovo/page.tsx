import { PageHeader } from "@/components/ui";
import { ContactForm } from "@/features/census/contact-form";
import { loadCensusData } from "@/services/census-data";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";
export default async function NewContactPage(){const {zones,streets,civics,complexes,operators,subjects}=await loadCensusData();return <><PageHeader eyebrow="Censimento / Proprietà" title="Nuovo contesto" description="Collega una proprietà a un soggetto nuovo o già presente. Le interviste si aggiungono in seguito con un'azione esplicita."/><ContactForm {...{zones,streets,civics,complexes,operators,subjects}} databaseMode={hasSupabaseEnvironment()}/></>}
