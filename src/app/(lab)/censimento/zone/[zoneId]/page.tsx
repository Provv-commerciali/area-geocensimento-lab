import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { records, streets, zones } from "@/lib/demo-data";

export default async function ZoneDetail({ params }: { params: Promise<{ zoneId: string }> }) { const {zoneId}=await params; const zone=zones.find(z=>z.id===zoneId); if(!zone) notFound(); return <><PageHeader eyebrow="Zona di censimento" title={zone.name} description={`${zone.municipality} · Assegnata a ${zone.operator.name}`}/><section className="cards-list">{streets.filter(s=>zone.streetIds.includes(s.id)).map(s=><article className="street-card" key={s.id}><div><strong>{s.name}</strong><span>{records.filter(r=>r.streetId===s.id).length} contatti censiti</span></div><Link className="button secondary" href={`/censimento/zone/${zone.id}/vie/${s.id}`}>Apri la via <ArrowRight size={16}/></Link></article>)}</section></> }
