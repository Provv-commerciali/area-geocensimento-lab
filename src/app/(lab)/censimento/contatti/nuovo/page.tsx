import { PageHeader } from "@/components/ui";
import { ContactForm } from "@/features/census/contact-form";
import { loadCensusData } from "@/services/census-data";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";
import { getCadastralContactPrefill } from "@/services/cadastral-data-service";
export default async function NewContactPage({searchParams}:{searchParams:Promise<{cadastralRightId?:string}>}){const {cadastralRightId}=await searchParams;const [{zones,streets,civics,complexes,operators},prefill]=await Promise.all([loadCensusData(["zones","streets","civics","complexes","operators"]),cadastralRightId?getCadastralContactPrefill(cadastralRightId):Promise.resolve(undefined)]);return <><PageHeader eyebrow="Censimento / Contatti" title="Nuovo contatto" description={prefill?"Dati realmente disponibili dal Catasto precompilati nel normale workflow. Il contatto nascerà Mai contattato, senza interviste.":"Registra un privato o un’azienda nel proprio contesto immobiliare. Le interviste si aggiungono solo con un’azione successiva esplicita."}/><ContactForm {...{zones,streets,civics,complexes,operators,prefill}} databaseMode={hasSupabaseEnvironment()}/></>}
