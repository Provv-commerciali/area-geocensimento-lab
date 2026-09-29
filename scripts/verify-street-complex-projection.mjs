import env from "@next/env";
import pg from "pg";

env.loadEnvConfig(process.cwd());
const url=process.env.SUPABASE_DB_URL;
if(!url)throw new Error("SUPABASE_DB_URL missing");
const parsed=new URL(url);
if(parsed.hostname!=="aws-1-eu-west-1.pooler.supabase.com"||parsed.username!=="postgres.fomluksjubzimkfnzouf")throw new Error("Not AREA LAB");
const client=new pg.Client({connectionString:url,ssl:{rejectUnauthorized:false}});
await client.connect();
try{
  const user=(await client.query("select id from auth.users where email=$1",[process.env.ANNCSU_TEST_EMAIL])).rows[0];
  if(!user)throw new Error("LAB test user missing");
  const complexes=(await client.query(`select c.id,c.name,c.census_zone_id zone_id,c.unit_count,a.street_id,a.id primary_access_id,a.civic,a.exponent,
    (select count(*) from public.complex_address_accesses l where l.complex_id=c.id) access_count,
    (select count(*) from public.census_records r where r.complex_id=c.id) record_count,
    (select count(*) from public.complex_photos p where p.complex_id=c.id and p.photo_type='COMPLEX' and p.deleted_at is null) photo_count
    from public.complexes c join public.complex_address_accesses ca on ca.complex_id=c.id and ca.is_primary
    join public.address_accesses a on a.id=ca.address_access_id
    where c.name ilike '%Geska%' limit 1`)).rows;
  if(!complexes.length)throw new Error("Case Geska absent from LAB; cannot verify user journey");
  const c=complexes[0];
  await client.query("begin read only");
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claim.sub',$1,true)",[user.id]);
  const args=[c.zone_id,c.street_id,"Geska",null,[],"civic_asc",40,0,null,null,null];
  const found=(await client.query("select * from public.street_representation_page_lab($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",args)).rows;
  if(found.length!==1||found[0].complex_id!==c.id||found[0].id!==c.primary_access_id)throw new Error("Complex search/anchor mismatch");
  const empty=(await client.query("select * from public.street_representation_page_lab($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",[...args.slice(0,3),[],...args.slice(4)])).rows;
  if(empty.length)throw new Error("Record filter unexpectedly accepted zero candidate IDs");
  const raw=(await client.query("select total_count from public.street_access_page_lab($1,$2,'',null,'{}','civic_asc',1,0,null,null)",[c.zone_id,c.street_id])).rows[0];
  const projected=(await client.query("select total_count from public.street_representation_page_lab($1,$2,'',null,'{}','civic_asc',1,0,null,null,null)",[c.zone_id,c.street_id])).rows[0];
  const duplicate=(await client.query("select count(*) n from public.street_representation_page_lab($1,$2,'',null,'{}','civic_asc',100,0,null,null,null) where complex_id=$3",[c.zone_id,c.street_id,c.id])).rows[0];
  if(Number(duplicate.n)!==1)throw new Error("Complex represented more than once");
  const rows=[];for(let offset=0;offset<Number(projected.total_count);offset+=100){
    rows.push(...(await client.query("select id,civic,exponent,complex_id from public.street_representation_page_lab($1,$2,'',null,'{}','civic_asc',100,$3,null,null,null)",[c.zone_id,c.street_id,offset])).rows);
  }
  if(rows.length!==Number(projected.total_count)||rows.filter(row=>row.complex_id===c.id).length!==1)throw new Error("Grouped pagination count/uniqueness mismatch");
  const position=rows.findIndex(row=>row.complex_id===c.id);
  const number=value=>Number.parseInt(String(value??""),10);
  if(position<0||number(rows[position-1]?.civic)>number(c.civic)||number(rows[position+1]?.civic)<number(c.civic))throw new Error("Natural civic anchor order mismatch");
  console.log(JSON.stringify({name:c.name,primaryCivic:[c.civic,c.exponent].filter(Boolean).join("/"),unitsDeclared:c.unit_count,linkedAccesses:Number(c.access_count),censusRecords:Number(c.record_count),complexPhotos:Number(c.photo_count),rawAccessItems:Number(raw?.total_count??0),projectedItems:Number(projected?.total_count??0),complexRows:Number(duplicate.n),position:position+1}));
  await client.query("rollback");
}finally{await client.end()}
