import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { latestInterview, subjectDisplayName } from "@/domain/census";
import { deriveCensusOperationalStatus } from "@/domain/census-operational-status";
import { InterviewForm } from "@/features/census/interview-form";
import { OperationalStatusBadge } from "@/features/census/operational-status-badge";
import { SubjectLinkForm } from "@/features/census/subject-link-form";
import { CadastralAssociationPanel } from "@/features/census/cadastral-association-panel";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";
import { loadCensusData } from "@/services/census-data";

export default async function RecordPage({params,searchParams}:{params:Promise<{recordId:string}>;searchParams:Promise<{interviewCreated?:string}>}){
  const [{recordId},{interviewCreated}]=await Promise.all([params,searchParams]);
  const initial=await loadCensusData(["records","operators","operationalSettings"],{records:{recordId}});const {records,operators,operationalSettings,operationalToday}=initial;
  const record=records.find(item=>item.id===recordId);if(!record)notFound();
  const [{civics},{subjects}]=await Promise.all([loadCensusData(["civics"],{civicId:record.civicId}),loadCensusData(["subjects"],{subjectIds:record.subjectLinks.map(link=>link.subjectId)})]);
  const latest=latestInterview(record);
  const linked=record.subjectLinks.map(link=>({link,subject:subjects.find(subject=>subject.id===link.subjectId)})).filter(item=>item.subject);
  const primaryLink=record.subjectLinks.find(link=>link.isPrimary)??record.subjectLinks[0];
  const primarySubject=subjects.find(subject=>subject.id===primaryLink?.subjectId);
  const otherContexts=primarySubject?(await loadCensusData(["records"],{records:{subjectId:primarySubject.id}})).records.filter(candidate=>candidate.id!==record.id):[];
  const contactName=primarySubject?subjectDisplayName(primarySubject):`${record.lastName} ${record.firstName??""}`.trim();
  const operationalStatus=deriveCensusOperationalStatus({contactType:record.contactType,interviews:record.interviews,staleNewsDays:operationalSettings.staleNewsDays,today:operationalToday});
  return <><PageHeader eyebrow="Scheda contatto" title={contactName} description={`${record.zoneName} · ${record.streetName}, ${record.civicNumber}${record.civicExtension?`/${record.civicExtension}`:""}`} action={<OperationalStatusBadge result={operationalStatus}/>}/>{interviewCreated==="1"&&<div className="success-banner">Intervista registrata nello storico di questo contatto.</div>}
    <div className="detail-grid"><section className="panel"><h2>Anagrafica e ruoli</h2><div className="cards-list">{linked.map(({link,subject})=><article className="street-card" key={link.subjectId}><div><strong>{subjectDisplayName(subject!)}</strong><span>{subject!.subjectType==="AZIENDA"?"Azienda":"Privato"} · {link.role}{link.ownershipShare?` · quota ${link.ownershipShare}%`:""}</span></div></article>)}</div></section><section className="panel"><h2>Immobile e catasto</h2><dl><div><dt>Porzione</dt><dd>{record.buildingScope}</dd></div><div><dt>Piano</dt><dd>{record.floorLabel??"—"}</dd></div><div><dt>Superficie</dt><dd>{record.surface?`${record.surface} m²`:"—"}</dd></div><div><dt>Complesso</dt><dd>{record.complexName??"—"}</dd></div><div><dt>Foglio / particella / sub.</dt><dd>{[record.sheet,record.parcel,record.subaltern].filter(Boolean).join(" / ")||"—"}</dd></div></dl></section></div>
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Stessa anagrafica</p><h2>Altri immobili / contesti collegati</h2></div><span>{otherContexts.length}</span></div>{otherContexts.length?<div className="cards-list">{otherContexts.map(context=><article className="street-card" key={context.id}><div><strong>{context.zoneName} · {context.streetName}, {context.civicNumber}{context.civicExtension?`/${context.civicExtension}`:""}</strong><span>{context.subjectLinks.find(link=>link.subjectId===primarySubject?.id)?.role} · {context.interviews.length} interviste</span></div><Link className="button secondary" href={`/censimento/contatti/${context.id}`}>Apri contatto</Link></article>)}</div>:<p className="muted">Nessun altro immobile o contesto collegato a questa anagrafica.</p>}</section>
    <CadastralAssociationPanel record={record} civic={civics.find(civic=>civic.id===record.civicId)} databaseMode={hasSupabaseEnvironment()}/>
    <section className="panel history"><div className="panel-heading"><div><p className="eyebrow">Storico del contatto</p><h2>Interviste</h2></div><span>{record.interviews.length} eventi</span></div>{record.interviews.length?<div className="timeline">{[...record.interviews].sort((a,b)=>b.interviewDate.localeCompare(a.interviewDate)).map(interview=><article key={interview.id}><span className="timeline-dot"/><time>{interview.interviewDate}</time><div><strong>{interview.outcome??"Intervista"}</strong><p>{interview.response??"Nessuna risposta registrata"} · {interview.reason??"Nessun motivo"}</p><small>{interview.operatorName}{interview.recallDate?` · Ricontatto ${interview.recallDate}`:""}</small></div></article>)}</div>:<p className="muted">Non ancora contattato: nessuna intervista reale registrata per questo contesto.</p>}{latest&&<small className="muted">Ultima intervista: {latest.interviewDate}</small>}</section>
    <SubjectLinkForm recordId={record.id} subjects={subjects} databaseMode={hasSupabaseEnvironment()}/><InterviewForm recordId={record.id} operators={operators} databaseMode={hasSupabaseEnvironment()}/>
  </>;
}
