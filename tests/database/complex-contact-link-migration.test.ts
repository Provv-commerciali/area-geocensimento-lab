import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql=readFileSync("supabase/migrations/202609290005_contact_complex_street_link.sql","utf8");

describe("Contact-selected Complex Access migration",()=>{
  it("keeps explicit Access linking and Contact creation inside one invoker command",()=>{
    expect(sql).toMatch(/create function public\.create_census_record_with_complex_access_lab/);
    expect(sql).toMatch(/security invoker/);
    expect(sql).toMatch(/linked\.street_id=v_street_id/);
    expect(sql).toMatch(/zs\.census_zone_id=v_zone_id/);
    expect(sql).toMatch(/values\(v_complex_id,v_access_id,false\)/);
    expect(sql).toMatch(/return public\.create_census_record_lab\(p_record,p_interview\)/);
    expect(sql).toMatch(/grant execute on function public\.create_census_record_with_complex_access_lab\(jsonb,jsonb\) to authenticated/);
  });
});
