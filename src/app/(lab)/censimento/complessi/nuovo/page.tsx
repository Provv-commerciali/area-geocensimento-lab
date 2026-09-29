import { PageHeader } from "@/components/ui";
import { ComplexCreateForm } from "@/features/complexes/complex-create-form";
import { loadCensusData } from "@/services/census-data";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";

export default async function NewComplex(){
  const {zones}=await loadCensusData(["zones"]);
  return <><PageHeader eyebrow="Censimento / Complessi" title="Nuovo complesso" description="Collega uno o più civici della Zona. Il primo è l’indirizzo principale."/>
    <ComplexCreateForm zones={zones} databaseMode={hasSupabaseEnvironment()}/></>;
}
