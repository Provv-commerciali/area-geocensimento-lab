import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { loadCensusData } from "@/services/census-data";
import { getZoneAccessCounts, listZoneAddressAccesses, listZoneStreets } from "@/repositories/territory-repository";
import { accessLabel } from "@/domain/territory";

export default async function ZoneDetail({params}:{params:Promise<{zoneId:string}>}){
  const{zoneId}=await params;
  const[{records,zones},streets,accesses,counts]=await Promise.all([
    loadCensusData(["records","zones"],{records:{zoneId}}),listZoneStreets(zoneId),
    listZoneAddressAccesses(zoneId,100),getZoneAccessCounts(zoneId)]);
  const zone=zones.find(item=>item.id===zoneId);if(!zone)notFound();
  return <><PageHeader eyebrow="Zona di censimento" title={zone.name}
    description={`${zone.municipality} · Assegnata a ${zone.operator.name}`}
    action={<Link className="button primary" href={`/geocensimento?zone=${zone.id}`}>Visualizza in GeoCensimento</Link>}/>
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Territorio ANNCSU</p><h2>Vie e accessi della zona</h2></div><span>{counts.streetCount} vie · {counts.accessCount} accessi</span></div>
      <p className="muted">{counts.locatedCount} accessi con coordinate ANNCSU valide · {counts.unlocatedCount} senza coordinate utilizzabili. Gli accessi sono disponibili anche senza Contatti censiti.</p>
      <div className="cards-list">{streets.map(street=>{
        const preview=accesses.filter(access=>access.streetId===street.id);
        return <article className="street-card" key={street.id}><div><strong>{street.name}</strong>
          <span>{street.localityName??"Località non indicata"} · {street.totalAccesses} accessi ANNCSU · {records.filter(record=>record.streetId===street.id).length} contatti</span>
          <small>{street.sourceKind==="OFFICIAL_ANNCSU"?`Progressivo ${street.anncsuProgressivoNazionale}`:"Eccezione manuale"}</small>
          {preview.length>0&&<small className="street-civic-preview">{preview.slice(0,12).map(accessLabel).join(" · ")}{preview.length>12?" · …":""}</small>}
        </div><Link className="button secondary" href={`/censimento/zone/${zone.id}/vie/${street.id}`}>Apri contatti <ArrowRight size={16}/></Link></article>;
      })}{streets.length===0&&<p className="muted">Nessuna via associata a questa Zona.</p>}</div>
      {counts.accessCount>100&&<p className="muted">Anteprima dei primi 100 accessi; il repository consente paginazione per l’intera Zona.</p>}
    </section></>;
}
