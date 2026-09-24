import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Client } from "pg";
import { ACCESS_HEADER, STREET_HEADER, coordinateWarning, decimalComma, readAnncsuCsv } from "./anncsu-csv";

const DEFAULT_STREET_ZIP = "docs/anncsu-test/stradarioToscana20260915.zip";
const DEFAULT_ACCESS_ZIP = "docs/anncsu-test/indirizzarioToscana20260915.zip";
const PARSER_VERSION = "anncsu-lab-1";
type Street = { municipalityCode: string; istatCode: string; odonym: string; locality: string; total: number; count: number };
type Issue = { rowNumber: number; sourceId: string; code: string; severity: "WARNING" | "QUARANTINE" };
export type AnncsuValidation = {
  streets: number; accesses: number; withCoordinates: number; withoutCoordinates: number;
  quarantinedCoordinates: number; issues: Issue[]; municipalities: number; zeroAccessStreets: number;
};

function numericId(value: string, name: string, row: number): void {
  if (!/^\d+$/.test(value)) throw new Error(`${name} invalid at row ${row}`);
}

export async function validateAnncsu(streetZip: string, accessZip: string): Promise<AnncsuValidation> {
  const streets = new Map<string,Street>();
  const municipalityPairs = new Map<string,string>();
  let streetRow = 1;
  for await (const cells of readAnncsuCsv(streetZip,STREET_HEADER)) {
    streetRow++;
    const [municipalityCode,istatCode,progressive,,odonym,locality,totalText] = cells;
    numericId(progressive,"Street progressive",streetRow);
    if (!/^[A-Z][0-9A-Z]{3}$/.test(municipalityCode) || !/^\d{6}$/.test(istatCode) || !odonym || !/^\d+$/.test(totalText))
      throw new Error(`Invalid Stradario fields at row ${streetRow}`);
    if (streets.has(progressive)) throw new Error(`Duplicate Street progressive ${progressive}`);
    const paired = municipalityPairs.get(istatCode);
    if (paired && paired !== municipalityCode) throw new Error(`Municipality code conflict ${istatCode}`);
    municipalityPairs.set(istatCode,municipalityCode);
    streets.set(progressive,{municipalityCode,istatCode,odonym,locality,total:Number(totalText),count:0});
  }
  const accesses = new Set<string>();
  let accessRow = 1, withCoordinates = 0, quarantinedCoordinates = 0;
  const issues:Issue[] = [];
  for await (const cells of readAnncsuCsv(accessZip,ACCESS_HEADER)) {
    accessRow++;
    const [municipalityCode,istatCode,streetProgressive,,odonym,locality,,,accessProgressive,,civic,exponent,specificity,metric,snc,x,y,quota,method] = cells;
    numericId(accessProgressive,"Access progressive",accessRow);
    if (accesses.has(accessProgressive)) throw new Error(`Duplicate Access progressive ${accessProgressive}`);
    accesses.add(accessProgressive);
    const street = streets.get(streetProgressive);
    if (!street) throw new Error(`Orphan AddressAccess ${accessProgressive}: Street ${streetProgressive}`);
    if (street.municipalityCode!==municipalityCode || street.istatCode!==istatCode || street.odonym!==odonym || street.locality!==locality)
      throw new Error(`Stradario/Indirizzario mismatch at access ${accessProgressive}`);
    if (!civic && !metric && !snc) throw new Error(`Unnumbered access ${accessProgressive}`);
    if (x !== "" || y !== "" || method !== "") {
      if (!x || !y || !/^[1-5]$/.test(method)) throw new Error(`Incomplete coordinates/method at access ${accessProgressive}`);
      const longitude = Number(decimalComma(x)); const latitude = Number(decimalComma(y));
      withCoordinates++;
      const warning = coordinateWarning(longitude,latitude);
      if (warning) { quarantinedCoordinates++; issues.push({rowNumber:accessRow,sourceId:accessProgressive,code:warning,severity:"QUARANTINE"}); }
    }
    if (quota) decimalComma(quota);
    // These values are retained verbatim; their shape must not be collapsed into a civic label.
    void exponent; void specificity;
    street.count++;
  }
  for (const [progressive,street] of streets) if (street.count!==street.total)
    throw new Error(`TOTALE_ACCESSI mismatch for Street ${progressive}: ${street.total} vs ${street.count}`);
  return {streets:streets.size,accesses:accesses.size,withCoordinates,
    withoutCoordinates:accesses.size-withCoordinates,quarantinedCoordinates,issues,
    municipalities:municipalityPairs.size,zeroAccessStreets:[...streets.values()].filter(street=>street.total===0).length};
}

async function sha256(path: string): Promise<string> {
  const hash=createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

const streetColumns = ["codice_comune","codice_istat","progressivo_nazionale","codice_comunale","odonimo","localita","totale_accessi","dizione_lingua1","dizione_lingua2","source_fingerprint"];
const accessColumns = ["codice_comune","codice_istat","progressivo_nazionale","codice_comunale","odonimo","localita","dizione_lingua1","dizione_lingua2","progressivo_accesso","codice_comunale_accesso","civico","esponente","specificita","metrico","progressivo_snc","coord_x_comune","coord_y_comune","quota","metodo","coordinate_state","source_fingerprint"];

async function stage(client:Client, table:string, columns:string[], zip:string, header:string[]):Promise<number>{
  let count=0; let batch:Record<string,string>[]=[];
  async function flush(){if(!batch.length)return;
    await client.query(`insert into pg_temp.${table} select * from jsonb_populate_recordset(null::pg_temp.${table},$1::jsonb)`,[JSON.stringify(batch)]);
    batch=[];
  }
  for await(const cells of readAnncsuCsv(zip,header)){
    const values=header===STREET_HEADER?
      [...cells,createHash("sha256").update(cells.join("\u001f")).digest("hex")]:
      [...cells,cells[15]?coordinateWarning(Number(decimalComma(cells[15])),Number(decimalComma(cells[16])))??"VALID":"MISSING",
        createHash("sha256").update(cells.join("\u001f")).digest("hex")];
    batch.push(Object.fromEntries(columns.map((key,index)=>[key,values[index]])));
    count++; if(batch.length===500)await flush();
  }
  await flush(); return count;
}

function releaseDate(path:string):string {
  const value=path.split(/[\\/]/).at(-1)?.match(/Toscana(\d{4})(\d{2})(\d{2})\.zip$/i);
  if(!value)throw new Error(`ANNCSU ZIP filename must include Toscana YYYYMMDD: ${path}`);
  const date=`${value[1]}-${value[2]}-${value[3]}`;
  if(Number.isNaN(Date.parse(date)))throw new Error(`Invalid ANNCSU release date: ${date}`);
  return date;
}

async function upsertRun(client:Client,type:string,path:string,hash:string):Promise<{id:string;alreadyApplied:boolean}>{
  const released=releaseDate(path);
  const retention=Number(process.env.ANNCSU_SOURCE_RETENTION_MONTHS??"12");
  if(!Number.isSafeInteger(retention)||retention<1)throw new Error("ANNCSU_SOURCE_RETENTION_MONTHS must be a positive integer");
  const existing=await client.query<{id:string;state:string;source_sha256:string}>(
    "select id,state,source_sha256 from public.anncsu_import_runs where dataset_type=$1 and territorial_scope='TOSCANA' and release_date=$2 and state='APPLIED'",[type,released]);
  if(existing.rows[0] && existing.rows[0].source_sha256!==hash)throw new Error(`${type}: conflicting hash for release ${released}`);
  if(existing.rows[0])return{id:existing.rows[0].id,alreadyApplied:true};
  const newer=await client.query<{release_date:string}>(
    "select release_date from public.anncsu_import_runs where dataset_type=$1 and territorial_scope='TOSCANA' and state='APPLIED' and release_date>$2 order by release_date desc limit 1",[type,released]);
  if(newer.rows.length)throw new Error(`${type}: refusing to regress latest snapshot from ${newer.rows[0].release_date} to ${released}`);
  const size=(await stat(path)).size;
  const result=await client.query<{id:string}>(`insert into public.anncsu_import_runs
    (dataset_type,territorial_scope,release_date,source_file,source_sha256,source_size_bytes,parser_version,artifact_retention_months,state)
    values($1,'TOSCANA',$6,$2,$3,$4,$5,$7,'STARTED')
    on conflict (dataset_type,territorial_scope,source_sha256) do update set state='STARTED',error_summary=null
    returning id`,[type,path.split(/[\\/]/).at(-1),hash,size,PARSER_VERSION,released,retention]);
  return{id:result.rows[0].id,alreadyApplied:false};
}

export async function applyAnncsu(streetZip:string,accessZip:string,summary:AnncsuValidation,databaseUrl:string):Promise<string>{
  if(!databaseUrl)throw new Error("ANNCSU_DATABASE_URL is required for --apply");
  if(releaseDate(streetZip)!==releaseDate(accessZip))throw new Error("Stradario and Indirizzario release dates differ");
  const client=new Client({connectionString:databaseUrl});await client.connect();
  let streetRun:{id:string;alreadyApplied:boolean}|undefined,accessRun:{id:string;alreadyApplied:boolean}|undefined;
  try{
    const [streetHash,accessHash]=await Promise.all([sha256(streetZip),sha256(accessZip)]);
    streetRun=await upsertRun(client,"STRADARIO",streetZip,streetHash);
    accessRun=await upsertRun(client,"INDIRIZZARIO",accessZip,accessHash);
    if(streetRun.alreadyApplied && accessRun.alreadyApplied)return"Already applied: same SHA-256 snapshots";
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext('ANNCSU:TOSCANA'))");
    await client.query(`create temporary table anncsu_stage_streets (${streetColumns.map(column=>`${column} text`).join(",")}) on commit drop`);
    await client.query(`create temporary table anncsu_stage_accesses (${accessColumns.map(column=>`${column} text`).join(",")}) on commit drop`);
    const streetCount=await stage(client,"anncsu_stage_streets",streetColumns,streetZip,STREET_HEADER);
    const accessCount=await stage(client,"anncsu_stage_accesses",accessColumns,accessZip,ACCESS_HEADER);
    if(streetCount!==summary.streets || accessCount!==summary.accesses)throw new Error("Staging count changed after validation");
    await client.query("create unique index on anncsu_stage_streets(progressivo_nazionale)");
    await client.query("create unique index on anncsu_stage_accesses(progressivo_accesso)");
    const checks=await client.query<{missing_municipalities:string;orphan_accesses:string;count_mismatches:string}>(`
      select
        (select count(*)::text from anncsu_stage_streets s left join public.municipalities m
          on m.istat_code=s.codice_istat and upper(m.cadastral_code)=s.codice_comune where m.id is null) missing_municipalities,
        (select count(*)::text from anncsu_stage_accesses a left join anncsu_stage_streets s
          on s.progressivo_nazionale=a.progressivo_nazionale where s.progressivo_nazionale is null) orphan_accesses,
        (select count(*)::text from anncsu_stage_streets s left join
          (select progressivo_nazionale,count(*) n from anncsu_stage_accesses group by 1) a using(progressivo_nazionale)
          where s.totale_accessi::integer<>coalesce(a.n,0)) count_mismatches`);
    const gate=checks.rows[0];
    if(Number(gate.missing_municipalities)||Number(gate.orphan_accesses)||Number(gate.count_mismatches))
      throw new Error(`Database gate failed: municipalities=${gate.missing_municipalities}, orphans=${gate.orphan_accesses}, totals=${gate.count_mismatches}`);
    const preexisting=await client.query<{streets:string;accesses:string}>(`select
      (select count(*)::text from anncsu_stage_streets t join public.streets s
        on s.anncsu_progressivo_nazionale=t.progressivo_nazionale) streets,
      (select count(*)::text from anncsu_stage_accesses t join public.address_accesses a
        on a.anncsu_progressivo_accesso=t.progressivo_accesso) accesses`);
    const existingStreets=Number(preexisting.rows[0].streets),existingAccesses=Number(preexisting.rows[0].accesses);
    await client.query(`insert into public.localities(municipality_id,normalized_name,display_name)
      select distinct on (m.id,lower(regexp_replace(btrim(s.localita),'[[:space:]]+',' ','g')))
        m.id,lower(regexp_replace(btrim(s.localita),'[[:space:]]+',' ','g')),s.localita
      from anncsu_stage_streets s join public.municipalities m on m.istat_code=s.codice_istat
      where s.localita<>'' order by m.id,lower(regexp_replace(btrim(s.localita),'[[:space:]]+',' ','g')),s.localita
      on conflict(municipality_id,normalized_name) do nothing`);
    await client.query(`insert into public.streets(municipality_id,name,source_kind,ownership_scope,
      anncsu_progressivo_nazionale,codice_comunale,locality_name,locality_id,dizione_lingua1,dizione_lingua2,
      total_accesses,first_seen_run_id,last_seen_run_id,is_present_in_latest_snapshot)
      select m.id,s.odonimo,'OFFICIAL_ANNCSU','GLOBAL_REFERENCE',s.progressivo_nazionale,
        nullif(s.codice_comunale,''),nullif(s.localita,''),l.id,nullif(s.dizione_lingua1,''),nullif(s.dizione_lingua2,''),
        s.totale_accessi::integer,$1,$1,true
      from anncsu_stage_streets s join public.municipalities m on m.istat_code=s.codice_istat
      left join public.localities l on l.municipality_id=m.id and l.normalized_name=lower(regexp_replace(btrim(s.localita),'[[:space:]]+',' ','g'))
      on conflict (anncsu_progressivo_nazionale) where anncsu_progressivo_nazionale is not null do update set
        municipality_id=excluded.municipality_id,name=excluded.name,codice_comunale=excluded.codice_comunale,
        locality_name=excluded.locality_name,locality_id=excluded.locality_id,
        dizione_lingua1=excluded.dizione_lingua1,dizione_lingua2=excluded.dizione_lingua2,
        total_accesses=excluded.total_accesses,last_seen_run_id=$1,is_present_in_latest_snapshot=true`,[streetRun.id]);
    await client.query(`insert into public.street_official_revisions(street_id,import_run_id,source_fingerprint,attributes)
      select s.id,$1,t.source_fingerprint,jsonb_build_object('odonimo',t.odonimo,'localita',t.localita,
        'codice_comunale',t.codice_comunale,'totale_accessi',t.totale_accessi,
        'dizione_lingua1',t.dizione_lingua1,'dizione_lingua2',t.dizione_lingua2)
      from anncsu_stage_streets t join public.streets s on s.anncsu_progressivo_nazionale=t.progressivo_nazionale
      on conflict(street_id,source_fingerprint) do nothing`,[streetRun.id]);
    await client.query(`update public.streets s set is_present_in_latest_snapshot=false
      from public.municipalities m where s.municipality_id=m.id and m.istat_code like '09%'
      and s.source_kind='OFFICIAL_ANNCSU' and not exists
      (select 1 from anncsu_stage_streets t where t.progressivo_nazionale=s.anncsu_progressivo_nazionale)`);
    await client.query(`insert into public.address_accesses(street_id,source_kind,ownership_scope,
      anncsu_progressivo_accesso,codice_comunale_accesso,civic,exponent,specificity,metric,progressivo_snc,
      quota_raw,first_seen_run_id,last_seen_run_id,is_present_in_latest_snapshot)
      select s.id,'OFFICIAL_ANNCSU','GLOBAL_REFERENCE',a.progressivo_accesso,
        nullif(a.codice_comunale_accesso,''),nullif(a.civico,''),nullif(a.esponente,''),
        nullif(a.specificita,''),nullif(a.metrico,''),nullif(a.progressivo_snc,''),
        nullif(a.quota,''),$1,$1,true
      from anncsu_stage_accesses a join public.streets s on s.anncsu_progressivo_nazionale=a.progressivo_nazionale
      on conflict (anncsu_progressivo_accesso) where anncsu_progressivo_accesso is not null do update set
        street_id=excluded.street_id,codice_comunale_accesso=excluded.codice_comunale_accesso,
        civic=excluded.civic,exponent=excluded.exponent,specificity=excluded.specificity,
        metric=excluded.metric,progressivo_snc=excluded.progressivo_snc,quota_raw=excluded.quota_raw,
        last_seen_run_id=$1,is_present_in_latest_snapshot=true`,[accessRun.id]);
    await client.query(`insert into public.access_official_revisions(address_access_id,import_run_id,source_fingerprint,attributes)
      select a.id,$1,t.source_fingerprint,jsonb_build_object('civico',t.civico,'esponente',t.esponente,
        'specificita',t.specificita,'metrico',t.metrico,'progressivo_snc',t.progressivo_snc,
        'codice_comunale_accesso',t.codice_comunale_accesso,'quota',t.quota)
      from anncsu_stage_accesses t join public.address_accesses a on a.anncsu_progressivo_accesso=t.progressivo_accesso
      on conflict(address_access_id,source_fingerprint) do nothing`,[accessRun.id]);
    await client.query(`insert into public.access_location_observations(address_access_id,source_kind,ownership_scope,
      source_crs,raw_longitude,raw_latitude,longitude,latitude,quota_raw,anncsu_method,point,
      validation_state,validation_note,source_reference,import_run_id,source_sha256,source_fingerprint)
      select a.id,'ANNCSU','GLOBAL_REFERENCE','EPSG:6706',t.coord_x_comune,t.coord_y_comune,
        case when t.coordinate_state='INVALID_COORDINATE' then null else replace(t.coord_x_comune,',','.')::numeric(10,7) end,
        case when t.coordinate_state='INVALID_COORDINATE' then null else replace(t.coord_y_comune,',','.')::numeric(10,7) end,
        nullif(t.quota,''),t.metodo::smallint,
        case when t.coordinate_state='VALID' then extensions.st_setsrid(extensions.st_makepoint(
          replace(t.coord_x_comune,',','.')::double precision,replace(t.coord_y_comune,',','.')::double precision),6706) end,
        case when t.coordinate_state='VALID' then 'VALID' else 'QUARANTINED' end,
        nullif(t.coordinate_state,'VALID'),t.progressivo_accesso,$1,$2,t.source_fingerprint
      from anncsu_stage_accesses t join public.address_accesses a on a.anncsu_progressivo_accesso=t.progressivo_accesso
      where t.coordinate_state<>'MISSING'
      on conflict(address_access_id,source_kind,source_fingerprint) do nothing`,[accessRun.id,accessHash]);
    await client.query(`update public.address_accesses a set is_present_in_latest_snapshot=false
      from public.streets s join public.municipalities m on m.id=s.municipality_id
      where a.street_id=s.id and m.istat_code like '09%' and a.source_kind='OFFICIAL_ANNCSU'
        and not exists(select 1 from anncsu_stage_accesses t where t.progressivo_accesso=a.anncsu_progressivo_accesso)`);
    for(const issue of summary.issues) await client.query(`insert into public.anncsu_import_issues
      (import_run_id,row_number,source_id,issue_code,severity,detail) values($1,$2,$3,$4,$5,$6)`,
      [accessRun.id,issue.rowNumber,issue.sourceId,issue.code,issue.severity,"Source point excluded from effective location"]);
    await client.query(`update public.anncsu_import_runs set state='APPLIED',row_count=$2,
      inserted_count=$3,updated_count=$4,quarantined_count=0,warning_count=0,finished_at=now() where id=$1`,
      [streetRun.id,summary.streets,summary.streets-existingStreets,existingStreets]);
    await client.query(`update public.anncsu_import_runs set state='APPLIED',row_count=$2,
      inserted_count=$3,updated_count=$4,quarantined_count=$5,warning_count=$5,finished_at=now() where id=$1`,
      [accessRun.id,summary.accesses,summary.accesses-existingAccesses,existingAccesses,summary.quarantinedCoordinates]);
    await client.query("commit");
    return `Applied Toscana: ${summary.streets} Streets, ${summary.accesses} AddressAccesses, ${summary.quarantinedCoordinates} quarantined points`;
  }catch(error){
    await client.query("rollback").catch(()=>{});
    const message=error instanceof Error?error.message:"Unknown import error";
    for(const run of [streetRun,accessRun])if(run&&!run.alreadyApplied)
      await client.query("update public.anncsu_import_runs set state='FAILED',error_summary=$2,finished_at=now() where id=$1",[run.id,message.slice(0,500)]).catch(()=>{});
    throw error;
  }finally{await client.end();}
}

function option(name:string):string|undefined{const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:undefined}
async function main(){
  const streetZip=resolve(option("--stradario")??DEFAULT_STREET_ZIP);
  const accessZip=resolve(option("--indirizzario")??DEFAULT_ACCESS_ZIP);
  const summary=await validateAnncsu(streetZip,accessZip);
  const [streetHash,accessHash]=await Promise.all([sha256(streetZip),sha256(accessZip)]);
  console.log(JSON.stringify({summary,sha256:{stradario:streetHash,indirizzario:accessHash}},null,2));
  if(process.argv.includes("--apply"))console.log(await applyAnncsu(streetZip,accessZip,summary,process.env.ANNCSU_DATABASE_URL??""));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)
  main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1});
