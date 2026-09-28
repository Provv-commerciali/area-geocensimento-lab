import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql=readFileSync("supabase/migrations/202609250001_census_street_access_page.sql","utf8").toLowerCase();
describe("census operational page migration",()=>{
  it("enforces the Zone-Street relationship and RLS invoker semantics",()=>{
    expect(sql).toContain("join public.address_accesses a on a.street_id=zs.street_id");
    expect(sql).toContain("zs.census_zone_id=p_zone_id and zs.street_id=p_street_id");
    expect(sql).toContain("security invoker");
    expect(sql).toContain("grant execute on function public.street_access_page_lab");
  });
  it("sorts numeric civic/exponent and caps server result sets",()=>{
    expect(sql).toContain("civic_number");
    expect(sql).toContain("f.exponent");
    expect(sql).toContain("limit least(greatest(p_limit,1),100)");
    expect(sql).toContain("zone_overview_lab");
    expect(sql).toContain("zone_street_page_lab");
  });
});
