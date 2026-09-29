import { readFileSync } from "node:fs";
import env from "@next/env";
import pg from "pg";

env.loadEnvConfig(process.cwd());
const url=process.env.SUPABASE_DB_URL;
if(!url)throw new Error("SUPABASE_DB_URL missing");
const parsed=new URL(url);
if(parsed.hostname!=="aws-1-eu-west-1.pooler.supabase.com"||parsed.username!=="postgres.fomluksjubzimkfnzouf"||parsed.pathname!=="/postgres")throw new Error("Not the dedicated AREA GeoCensimento LAB database");
const client=new pg.Client({connectionString:url,ssl:{rejectUnauthorized:false}});
await client.connect();
try{
  const identity=await client.query("select current_database() db, current_user db_user, to_regclass('public.complex_address_accesses') complex_links, to_regprocedure('public.street_access_page_lab(uuid,uuid,text,uuid[],uuid[],text,integer,integer,numeric,numeric)') current_page");
  const row=identity.rows[0];
  if(row.db!=="postgres"||!row.complex_links||!row.current_page)throw new Error("LAB schema identity check failed");
  console.log("Verified dedicated LAB database, Complex links and existing Street paging RPC.");
  const exists=await client.query("select to_regprocedure('public.street_representation_page_lab(uuid,uuid,text,uuid[],uuid[],text,integer,integer,numeric,numeric,uuid)')::text name");
  if(!process.argv.includes("--apply")){console.log(`New projection migration: ${exists.rows[0].name?"already present":"pending"}. No changes made.`);process.exitCode=0;}
  else if(exists.rows[0].name)console.log("New projection migration already present; no changes made.");
  else{
    const sql=readFileSync("supabase/migrations/202609290006_street_complex_projection.sql","utf8");
    await client.query(sql);
    console.log("Applied Street Complex projection migration to dedicated LAB.");
  }
}finally{await client.end()}
