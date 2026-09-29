import env from "@next/env";
import pg from "pg";

env.loadEnvConfig(process.cwd());
const url=process.env.SUPABASE_DB_URL;
if(!url||!url.includes("fomluksjubzimkfnzouf"))throw new Error("Expected dedicated Supabase LAB database");
const client=new pg.Client({connectionString:url,ssl:{rejectUnauthorized:false}});
await client.connect();
let tx=false;
async function rejects(sql,params,code){
  await client.query("savepoint expected_rejection");
  try{await client.query(sql,params);throw new Error(`Expected ${code} rejection`)}
  catch(error){if(error.code!==code)throw error}
  finally{await client.query("rollback to savepoint expected_rejection")}
}
try{
  const user=(await client.query("select id from auth.users where email=$1",[process.env.ANNCSU_TEST_EMAIL])).rows[0];
  if(!user)throw new Error("LAB Auth test user not found");
  const candidates=(await client.query(`select zs.census_zone_id zone_id,a.id access_id,a.street_id,
    row_number() over(partition by zs.census_zone_id,a.street_id order by a.id) rn
    from public.census_zone_streets zs join public.address_accesses a on a.street_id=zs.street_id`)).rows;
  const first=candidates.find(row=>Number(row.rn)===1&&candidates.some(item=>item.zone_id===row.zone_id&&item.street_id===row.street_id&&item.access_id!==row.access_id)&&candidates.some(item=>item.zone_id===row.zone_id&&item.street_id!==row.street_id));
  const sameStreet=candidates.find(row=>row.zone_id===first?.zone_id&&row.street_id===first?.street_id&&row.access_id!==first?.access_id);
  const otherStreet=candidates.find(row=>row.zone_id===first?.zone_id&&row.street_id!==first?.street_id);
  const otherZone=candidates.find(row=>row.zone_id!==first?.zone_id&&!candidates.some(candidate=>candidate.zone_id===first?.zone_id&&candidate.access_id===row.access_id));
  if(!first||!sameStreet||!otherStreet||!otherZone)throw new Error("Insufficient LAB territory for Complex checks");
  await client.query("begin");tx=true;
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claim.sub',$1,true)",[user.id]);
  const createSql="select public.create_complex_lab($1,$2,$3,$4,$5,$6,$7,$8) id";
  const created=(await client.query(createSql,[`LAB verification ${Date.now()}`,first.zone_id,first.access_id,[sameStreet.access_id,otherStreet.access_id],null,null,3,null])).rows[0];
  const links=(await client.query("select address_access_id,is_primary from public.complex_address_accesses where complex_id=$1",[created.id])).rows;
  if(links.length!==3||links.filter(row=>row.is_primary).length!==1)throw new Error("Complex primary/links mismatch");
  await rejects(createSql,[`LAB duplicate ${Date.now()}`,first.zone_id,first.access_id,[],null,null,null,null],"23505");
  await rejects(createSql,[`LAB cross zone ${Date.now()}`,first.zone_id,otherZone.access_id,[],null,null,null,null],"23503");
  await rejects("delete from public.census_zone_streets where census_zone_id=$1 and street_id=$2",[first.zone_id,otherStreet.street_id],"23503");
  await rejects("insert into public.complex_address_accesses(complex_id,address_access_id,is_primary) values($1,$2,true)",[created.id,sameStreet.access_id],"23505");
  await client.query("select public.update_complex_lab($1,$2,$3,$4,$5,$6,$7,$8)",[created.id,"LAB updated",otherStreet.access_id,[first.access_id],null,null,4,null]);
  const updated=(await client.query("select address_access_id,is_primary from public.complex_address_accesses where complex_id=$1",[created.id])).rows;
  if(updated.length!==2||updated.filter(row=>row.is_primary).length!==1||!updated.some(row=>row.address_access_id===otherStreet.access_id&&row.is_primary))throw new Error("Complex update mismatch");
  await client.query("select public.delete_complex_lab($1)",[created.id]);
  if((await client.query("select id from public.complexes where id=$1",[created.id])).rowCount!==0)throw new Error("Complex delete mismatch");
  const single=(await client.query(createSql,[`LAB single ${Date.now()}`,otherZone.zone_id,otherZone.access_id,[],null,null,null,null])).rows[0];
  const singleLinks=(await client.query("select is_primary from public.complex_address_accesses where complex_id=$1",[single.id])).rows;
  if(singleLinks.length!==1||!singleLinks[0].is_primary)throw new Error("Single-access Complex mismatch");
  const contactComplex=(await client.query(createSql,[`LAB contact link ${Date.now()}`,first.zone_id,first.access_id,[],null,null,null,null])).rows[0];
  const record={zoneId:first.zone_id,streetId:first.street_id,addressAccessId:sameStreet.access_id,
    complexId:contactComplex.id,relationshipRole:"Proprietario",engagementType:"Nessuno",buildingScope:"Intero edificio",
    contactType:"Generico",subject:{subjectType:"PRIVATO",lastName:"LAB verification"}};
  const contactSql="select public.create_census_record_with_complex_access_lab($1::jsonb,null) id";
  await rejects(contactSql,[JSON.stringify({...record,relationshipRole:"INVALID"})],"22023");
  if((await client.query("select 1 from public.complex_address_accesses where complex_id=$1 and address_access_id=$2",[contactComplex.id,sameStreet.access_id])).rowCount)throw new Error("Failed Contact left an Access link");
  const contact=(await client.query(contactSql,[JSON.stringify(record)])).rows[0];
  const linked=(await client.query("select is_primary from public.complex_address_accesses where complex_id=$1 and address_access_id=$2",[contactComplex.id,sameStreet.access_id])).rows[0];
  const primary=(await client.query("select address_access_id from public.complex_address_accesses where complex_id=$1 and is_primary",[contactComplex.id])).rows[0];
  if(!contact.id||linked?.is_primary!==false||primary?.address_access_id!==first.access_id)throw new Error("Contact/Complex link or primary mismatch");
  await rejects(contactSql,[JSON.stringify({...record,streetId:otherStreet.street_id})],"23503");
  await client.query("rollback");tx=false;
  console.log(JSON.stringify({status:"passed",checks:["single Access","three accesses across streets","one primary","exclusive access","zone coherence","street detach guard","unique primary","atomic update","guarded delete","Contact-selected Access link","Contact failure rolls back link","primary Access preserved"],persisted:false}));
}finally{if(tx)await client.query("rollback");await client.end()}
