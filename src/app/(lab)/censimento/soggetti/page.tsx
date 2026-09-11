import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { subjectDisplayName } from "@/domain/census";
import { loadCensusData } from "@/services/census-data";

export default async function SubjectsPage(){const {subjects,records}=await loadCensusData();return <><PageHeader eyebrow="Censimento" title="Soggetti" description="Anagrafiche uniche collegate ai contesti immobiliari."/><section className="cards-list">{subjects.map(subject=><article className="street-card" key={subject.id}><div><strong>{subjectDisplayName(subject)}</strong><span>{subject.subjectType==="AZIENDA"?"Azienda":"Privato"} · {records.filter(record=>record.subjectLinks.some(link=>link.subjectId===subject.id)).length} proprietà</span></div><Link className="button secondary" href={`/censimento/soggetti/${subject.id}`}>Apri scheda</Link></article>)}</section></>}
