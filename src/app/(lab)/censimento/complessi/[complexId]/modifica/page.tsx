import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { civicLabel } from "@/domain/census";
import { ComplexCreateForm } from "@/features/complexes/complex-create-form";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";
import { loadCensusData } from "@/services/census-data";

export default async function EditComplexPage({params}:{params:Promise<{complexId:string}>}){
  const {complexId}=await params;
  const {zones,complexes,streets}=await loadCensusData(["zones","complexes","streets"]);
  const complex=complexes.find(item=>item.id===complexId);if(!complex)notFound();
  const {civics}=await loadCensusData(["civics"],{civicIds:complex.civicIds});
  const primary=civics.find(item=>item.id===complex.primaryAccessId);if(!primary)notFound();
  const streetName=(id:string)=>streets.find(item=>item.id===id)?.name??"Via";
  const others=civics.filter(item=>complex.civicIds.includes(item.id)&&item.id!==primary.id).map(item=>({
    id:item.id,label:civicLabel(item),streetId:item.streetId,streetLabel:streetName(item.streetId),
  }));
  return <><PageHeader eyebrow="Censimento / Complessi" title={`Modifica ${complex.name}`} description="Aggiorna i dati e gli accessi del complesso, senza cambiare la Zona."/>
    <ComplexCreateForm zones={zones} databaseMode={hasSupabaseEnvironment()} initial={{
      id:complex.id,name:complex.name,zoneId:complex.zoneId,streetId:primary.streetId,streetLabel:streetName(primary.streetId),
      accessId:primary.id,accessLabel:civicLabel(primary),others,sheet:complex.sheet,parcel:complex.parcel,
      units:complex.units,description:complex.description,
    }}/></>;
}
