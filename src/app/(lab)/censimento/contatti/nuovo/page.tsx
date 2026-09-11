import { PageHeader } from "@/components/ui";
import { ContactForm } from "@/features/census/contact-form";
import { loadCensusData } from "@/services/census-data";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";
export default async function NewContactPage(){const {zones,streets,civics,complexes,operators,subjects}=await loadCensusData(["zones","streets","civics","complexes","operators","subjects"]);return <><PageHeader eyebrow="Censimento / Contatti" title="Nuovo contatto" description="Registra un privato o un’azienda nel proprio contesto immobiliare. Le interviste si aggiungono solo con un’azione successiva esplicita."/><ContactForm {...{zones,streets,civics,complexes,operators,subjects}} databaseMode={hasSupabaseEnvironment()}/></>}
