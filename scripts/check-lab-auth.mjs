import env from "@next/env";
env.loadEnvConfig(process.cwd());
const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email=process.env.ANNCSU_TEST_EMAIL;
const password=process.env.ANNCSU_TEST_PASSWORD;
if(base!=="https://fomluksjubzimkfnzouf.supabase.co"||!key||!email||!password)throw new Error("LAB Auth configuration missing or mismatched");
try{
  const response=await fetch(`${base}/auth/v1/token?grant_type=password`,{method:"POST",headers:{"Content-Type":"application/json",apikey:key},body:JSON.stringify({email,password}),signal:AbortSignal.timeout(15000)});
  const body=await response.json();
  console.log(JSON.stringify({status:response.status,authenticated:response.ok,errorCode:response.ok?undefined:body.error_code??body.code??body.error}));
}catch(error){console.log(JSON.stringify({networkError:error instanceof Error?error.name:"unknown"}));process.exitCode=1}
