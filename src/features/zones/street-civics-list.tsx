import Link from "next/link";
import { accessLabel, type AddressAccess } from "@/domain/territory";
import { latestInterview, type CensusRecord, type Complex } from "@/domain/census";
import { metrics } from "./operational-metrics";
import { closestRecall, hasStreetFilters, lastActivity, streetSorts, type StreetFilters, type StreetSort } from "./street-operations";

interface Props {zoneId:string;streetId:string;accesses:AddressAccess[];records:CensusRecord[];complexes:Complex[];total:number;page:number;query:Record<string,string|string[]|undefined>;sort:StreetSort;filters:StreetFilters}
const formatDate=(value?:string)=>value?new Intl.DateTimeFormat("it-IT",{dateStyle:"short"}).format(new Date(value)):"—";
const field=(name:string,label:string,filters:StreetFilters,type="text")=><label key={name}>{label}<input name={name} type={type} defaultValue={filters[name as keyof StreetFilters]??""}/></label>;
const select=(name:string,label:string,filters:StreetFilters,options:Array<[string,string]>)=><label key={name}>{label}<select name={name} defaultValue={filters[name as keyof StreetFilters]??""}><option value="">Tutti</option>{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>;
function pagerHref(path:string,query:Props["query"],page:number){const params=new URLSearchParams();for(const[key,value]of Object.entries(query))if(typeof value==="string"&&value&&key!=="page")params.set(key,value);params.set("page",String(page));return `${path}?${params}`}

export function StreetCivicsList({zoneId,streetId,accesses,records,complexes,total,page,query,sort,filters}:Props){
  const path=`/censimento/zone/${zoneId}/vie/${streetId}`,byAccess=new Map<string,CensusRecord[]>();
  records.forEach(record=>byAccess.set(record.civicId,[...(byAccess.get(record.civicId)??[]),record]));
  const complexByAccess=new Map<string,Complex>();complexes.forEach(complex=>complex.civicIds.forEach(id=>complexByAccess.set(id,complex)));
  const from=(page-1)*40+1,to=Math.min(page*40,total);
  return <><form className="street-filter-form" action={path}>
    <div className="filter-panel filter-primary"><label className="search-field">Cerca civico o contatto<input aria-label="Cerca civico o contatto" name="q" defaultValue={typeof query.q==="string"?query.q:""} placeholder="es. 59/A, SNC, Rossi, telefono"/></label><label>Ordina per<select name="sort" defaultValue={sort}>{Object.entries(streetSorts).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button className="button secondary">Cerca</button></div>
    <details className="street-advanced" open={hasStreetFilters(filters)}><summary>Filtri avanzati{hasStreetFilters(filters)?" · attivi":""}</summary><div className="street-advanced-grid">
      {field("civicFrom","Civico da",filters,"number")}{field("civicTo","Civico a",filters,"number")}{field("name","Nominativo",filters)}{field("phone","Telefono",filters)}
      {select("contactType","Tipologia",filters,[["Generico","Generico"],["Informatore","Informatore"],["Informazione","Informazione"],["Notizia","Notizia"]])}
      {select("qualification","Qualifica",filters,[["Proprietario","Proprietario"],["Comproprietario","Comproprietario"],["Inquilino","Inquilino"]])}
      {select("complex","Complesso",filters,complexes.map(c=>[c.id,c.name]))}
      {field("floor","Piano",filters)}{field("rooms","Locali",filters,"number")}{field("surface","Superficie minima m²",filters,"number")}
      {select("occupancy","Occupazione",filters,[["Libero","Libero"],["Libero al rogito","Libero al rogito"],["Occupato dal proprietario","Occupato dal proprietario"],["Occupato dall'inquilino","Occupato dall'inquilino"],["Inagibile","Inagibile"]])}
      {select("engagement","Tipo incarico",filters,[["Nessuno","Nessuno"],["Incarico altre agenzie","Altre agenzie"],["In esclusiva","In esclusiva"],["Verbale","Verbale"],["Non esclusivo","Non esclusivo"]])}
      {field("category","Categoria catastale",filters)}{field("sheet","Foglio",filters)}{field("parcel","Particella",filters)}{field("subaltern","Subalterno",filters)}
      {field("createdFrom","Inserito dal",filters,"date")}{field("interviewFrom","Intervista dal",filters,"date")}{field("recallFrom","Ricontatto dal",filters,"date")}
      {select("response","Risposta",filters,[["Risposto","Risposto"],["Nessuna risposta","Nessuna risposta"]])}
      {select("elevator","Ascensore",filters,[["true","Sì"],["false","No"]])}{select("probable","Probabile incarico",filters,[["true","Sì"],["false","No"]])}
      {select("inherited","Immobile ereditato",filters,[["true","Sì"],["false","No"]])}{select("appraised","Perizia immobiliare",filters,[["true","Sì"],["false","No"]])}
    </div><div className="button-row"><button className="button secondary">Applica filtri</button><Link className="row-action" href={path}>Azzera</Link></div></details>
  </form>
  <div className="table-toolbar"><span>{total?`${from}–${to} di ${total} civici`:"Nessun civico trovato"}</span></div>
  <div className="table-panel"><div className="table-scroll"><table className="street-operational-table"><thead><tr><th>Civico</th><th>Situazione</th><th>Ultima attività</th><th>Azioni</th></tr></thead><tbody>{accesses.map(access=>{
    const related=byAccess.get(access.id)??[],m=metrics(related),complex=complexByAccess.get(access.id),civicHref=`${path}/civici/${access.id}`;
    const direct=related.length===1&&!complex,href=direct?`/censimento/contatti/${related[0].id}`:civicHref;
    const recent=[...related].sort((a,b)=>lastActivity(b).localeCompare(lastActivity(a)))[0];
    return <tr key={access.id}><td><strong>{accessLabel(access)}</strong>{access.sourceKind==="MANUAL"&&<small>Inserito manualmente</small>}</td><td>
      {related.length===0?<span className="muted">Mai censito · nessun contatto</span>:related.length===1?<div className="street-contact-summary"><strong>{related[0].lastName} {related[0].firstName}</strong><small>{[related[0].qualification,related[0].contactType,related[0].floorLabel,related[0].unitIdentifier&&`Interno ${related[0].unitIdentifier}`].filter(Boolean).join(" · ")}</small><small>{latestInterview(related[0])?.response??"Nessuna intervista"}{closestRecall(related[0])?` · ricontatto ${formatDate(closestRecall(related[0]))}`:""}</small><small>{related[0].responsibleOperatorName&&`Responsabile: ${related[0].responsibleOperatorName}`}</small></div>:<span><strong>{m.censiti} contatti</strong><small>{m.notizie} notizie · {m.valutazione} in valutazione · {m.altreAgenzie} altre agenzie · {m.esclusive} esclusive</small></span>}
      {complex&&<details className="complex-inline"><summary>Complesso: {complex.name}{complex.units?` · ${complex.units} unità`:""}</summary><small>{related.map(r=>[r.staircase&&`Scala ${r.staircase}`,r.unitIdentifier&&`Interno ${r.unitIdentifier}`,r.floorLabel].filter(Boolean).join(" · ")).filter(Boolean).join("; ")||"Interni non specificati"}</small><Link prefetch={false} href={`/censimento/complessi/${complex.id}`}>Apri complesso</Link></details>}
    </td><td>{recent?<><strong>{recent.lastName} {recent.firstName}</strong><small>{formatDate(lastActivity(recent))}</small></>:"—"}</td><td><div className="button-row"><Link className="row-action" prefetch={false} href={href}>{related.length===0?"Apri civico":direct?"Apri contatto":"Apri contatti"}</Link>{related.length===0&&<Link className="row-action" prefetch={false} href={`/censimento/contatti/nuovo?zoneId=${zoneId}&streetId=${streetId}&civicId=${access.id}`}>+ Nuovo contatto</Link>}{direct&&<><Link className="row-action" prefetch={false} href={`/censimento/contatti/${related[0].id}/modifica`}>Modifica</Link><Link className="row-action" prefetch={false} href={`/censimento/contatti/${related[0].id}#interviste`}>Nuova intervista</Link></>}</div></td></tr>;
  })}</tbody></table></div></div>
  {!accesses.length&&<p className="muted">Nessun civico corrisponde ai criteri. Prova a modificare la ricerca.</p>}
  {total>40&&<nav className="street-pager" aria-label="Pagine civici">{page>1&&<Link className="button secondary" href={pagerHref(path,query,page-1)}>Precedente</Link>}<span>Pagina {page} di {Math.ceil(total/40)}</span>{page*40<total&&<Link className="button secondary" href={pagerHref(path,query,page+1)}>Successiva</Link>}</nav>}
  </>;
}
