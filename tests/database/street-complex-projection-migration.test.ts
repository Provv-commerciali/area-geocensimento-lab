import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql=readFileSync("supabase/migrations/202609290006_street_complex_projection.sql","utf8").toLowerCase();
describe("Street Complex projection migration",()=>{
  it("pages one authenticated visual item per free Access or Complex",()=>{
    expect(sql).toContain("security invoker");
    expect(sql).toContain("partition by b.group_key");
    expect(sql).toContain("coalesce(ca.complex_id::text,a.id::text)");
    expect(sql).toContain("anchor_rank=1");
    expect(sql).toContain("count(*) over() total_count");
    expect(sql).toContain("p_complex_id uuid default null");
    expect(sql).toContain("grant execute on function public.street_representation_page_lab");
    expect(sql).toContain("to authenticated");
    expect(sql).not.toContain("security definer");
  });
});
