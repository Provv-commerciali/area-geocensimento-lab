import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { latestInterview, subjectDisplayName } from "@/domain/census";
import { InterviewForm } from "@/features/census/interview-form";
import { SubjectLinkForm } from "@/features/census/subject-link-form";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";
import { loadCensusData } from "@/services/census-data";

export default async function RecordPage({params,searchParams}:{params:Promise<{recordId:string}>;searchParams:Promise<{interviewCreated?:string}>}){
  const [{recordId},{interviewCreated},{records,operators,subjects}]=await Promise.all([params,searchParams,loadCensusData()]);
  const record=records.find(item=>item.id===recordId);if(!record)notFound();const latest=latestInterview(record);const linked=record.subjectLinks.map(link=>({link,subject:subjects.find(subject=>subject.id===link.subjectId)})).filter(item=>item.subject);const available=subjects.filter(subject=>!record.subjectLinks.some(link=>link.subjectId===subject.id));
  return <><PageHeader eyebrow="Scheda proprietà" title={`${record.streetName}, ${record.civicNumber}${record.civicExtension?`/${record.civicExtension}`:""}`} description={`${record.zoneName} · ${linked.length} soggetti collegati`}/>{interviewCreated==="1"&&<div className="success-banner">Intervista registrata nello storico.</div>}
    <div className="detail-grid"><section className="panel"><h2>Soggetti collegati</h2><div className="cards-list">{linked.map(({link,subject})=><article className="street-card" key={link.subjectId}><div><strong>{subjectDisplayName(subject!)}</strong><span>{subject!.subjectType==="AZIENDA"?"Azienda":"Privato"} · {link.role}</span></div><Link className="button secondary" href={`/censimento/soggetti/${link.subjectId}`}>Apri soggetto</Link></article>)}</div></section><section className="panel"><h2>Immobile e catasto</h2><dl><div><dt>Porzione</dt><dd>{record.buildingScope}</dd></div><div><dt>Piano</dt><dd>{record.floorLabel??"—"}</dd></div><div><dt>Superficie</dt><dd>{record.surface?`${record.surface} m²`:"—"}</dd></div><div><dt>Complesso</dt><dd>{record.complexName??"—"}</dd></div><div><dt>Foglio / particella / sub.</dt><dd>{[record.sheet,record.parcel,record.subaltern].filter(Boolean).join(" / ")||"—"}</dd></div></dl></section></div>
    <section className="panel history"><div className="panel-heading"><div><p className="eyebrow">Storico del contesto</p><h2>Interviste</h2></div><span>{record.interviews.length} eventi</span></div>{record.interviews.length?<div className="timeline">{[...record.interviews].sort((a,b)=>b.interviewDate.localeCompare(a.interviewDate)).map(interview=><article key={interview.id}><span className="timeline-dot"/><time>{interview.interviewDate}</time><div><strong>{interview.outcome??"Intervista"}</strong><p>{interview.response??"Nessuna risposta registrata"} · {interview.reason??"Nessun motivo"}</p><small>{interview.operatorName}{interview.recallDate?` · Ricontatto ${interview.recallDate}`:""}</small></div></article>)}</div>:<p className="muted">Mai contattato: nessuna intervista reale registrata per questa proprietà.</p>}{latest&&<small className="muted">Ultima intervista derivata: {latest.interviewDate}</small>}</section>
    {available.length>0&&<SubjectLinkForm recordId={record.id} subjects={available} databaseMode={hasSupabaseEnvironment()}/>}<InterviewForm recordId={record.id} operators={operators} databaseMode={hasSupabaseEnvironment()}/>
  </>;
}
