import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql=fs.readFileSync(path.join(process.cwd(),"supabase/migrations/202609160001_controlled_interview_response.sql"),"utf8");

describe("controlled interview response migration",()=>{
  it("accepts only the approved values for new writes without rewriting history",()=>{
    expect(sql).toMatch(/response is null or response in \('Risposto', 'Nessuna risposta'\)/);
    expect(sql).toMatch(/not valid/i);
  });
});
