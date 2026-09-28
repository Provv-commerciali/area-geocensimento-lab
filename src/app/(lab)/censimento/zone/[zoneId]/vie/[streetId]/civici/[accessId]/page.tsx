import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { accessLabel } from "@/domain/territory";
import { getStreetAddressAccess, getZoneStreet } from "@/repositories/territory-repository";
import { loadCensusData } from "@/services/census-data";
import { TerritoryKpis } from "@/features/zones/territory-kpis";
import { closestRecall, lastActivity } from "@/features/zones/street-operations";
import { latestInterview } from "@/domain/census";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";
import { civics as demoCivics } from "@/lib/demo-data";

export default async function CivicPage({params}:{params:Promise<{zoneId:string;streetId:string;accessId:string}>}){
  const{zoneId,streetId,accessId}=await params;
  const[{records,zones,complexes},street,storedAccess]=await Promise.all([
    loadCensusData(["records","zones","complexes"],{records:{zoneId,accessId},complexZoneId:zoneId}),getZoneStreet(zoneId,streetId),getStreetAddressAccess(accessId),
  ]);
  const zone=zones.find(z=>z.id===zoneId);
  const demoAccess=demoCivics.find(c=>c.id===accessId&&c.streetId===streetId);
  const access=hasSupabaseEnvironment()?storedAccess:demoAccess?{id:demoAccess.id,streetId,streetName:street?.name??"",sourceKind:"MANUAL" as const,civic:demoAccess.number,exponent:demoAccess.extension}:undefined;
  if(!zone||!street||!access||access.streetId!==streetId)notFound();
  const contacts=records.filter(r=>r.civicId===accessId),complex=complexes.find(c=>c.zoneId===zoneId&&c.civicIds.includes(accessId));
  const activity=[...contacts].map(lastActivity).sort().at(-1);
  return <><PageHeader eyebrow="Zona / Via / Civico" title={`${street.name}, ${accessLabel(access)}`} description={`${zone.name} · ${zone.municipality}`} action={<div className="button-row"><Link className="button secondary" href={`/censimento/zone/${zoneId}/vie/${streetId}`}>Torna alla via</Link><Link className="button primary" href={`/censimento/contatti/nuovo?zoneId=${zoneId}&streetId=${streetId}&civicId=${accessId}`}>+ Nuovo contatto</Link></div>}/>
    <TerritoryKpis accessCount={1} records={contacts}/>
    <div className="census-stack"><section className="panel"><div className="panel-heading"><h2>Contatti del civico</h2><span className="muted">Ultima attività: {activity?new Date(activity).toLocaleDateString("it-IT"):"nessuna"}</span></div>
      {contacts.length?<div className="civics-list">{contacts.map(contact=><article key={contact.id}><div><strong>{contact.lastName} {contact.firstName}</strong><small>{[contact.qualification,contact.contactType,contact.floorLabel,contact.unitIdentifier&&`Interno ${contact.unitIdentifier}`].filter(Boolean).join(" · ")}</small><small>{latestInterview(contact)?.response??"Nessuna intervista"} · Ultima attività {new Date(lastActivity(contact)).toLocaleDateString("it-IT")}{closestRecall(contact)?` · Ricontatto ${closestRecall(contact)}`:""}</small><small>{contact.responsibleOperatorName&&`Responsabile: ${contact.responsibleOperatorName}`}</small></div><div className="button-row"><Link href={`/censimento/contatti/${contact.id}`}>Apri</Link><Link href={`/censimento/contatti/${contact.id}/modifica`}>Modifica</Link></div></article>)}</div>:<p className="muted">Mai censito: nessun contatto associato. Puoi crearne uno per questo civico.</p>}</section>
      {complex&&<section className="panel"><h2>Complesso: {complex.name}</h2><p className="muted">{complex.units?`${complex.units} unità · `:""}{complex.civicIds.length} civici collegati · {contacts.length} contatti in questo civico</p><details className="complex-inline"><summary>Mostra interni e unità</summary><div className="cards-list">{contacts.map(contact=><div key={contact.id}>{[contact.staircase&&`Scala ${contact.staircase}`,contact.unitIdentifier&&`Interno ${contact.unitIdentifier}`,contact.floorLabel].filter(Boolean).join(" · ")||"Interno non specificato"} · {contact.lastName}</div>)}</div></details><Link className="row-action" href={`/censimento/complessi/${complex.id}`}>Apri complesso</Link></section>}
    </div></>;
}
