import { describe, expect, it, vi } from "vitest";
import { loadStreetComplexSummaries } from "@/services/street-complex-summaries";
import type { Complex } from "@/domain/census";

const from=vi.fn();const createSignedUrls=vi.fn();
vi.mock("@/lib/supabase/server",()=>({hasSupabaseEnvironment:()=>true,createClient:async()=>({from,storage:{from:()=>({createSignedUrls})}})}));

function query(data:unknown){
  const q={select:()=>q,in:()=>q,eq:()=>q,is:()=>q,order:()=>q,then:(resolve:(value:unknown)=>unknown,reject:(reason:unknown)=>unknown)=>Promise.resolve({data,error:null}).then(resolve,reject)};
  return q;
}

describe("Street Complex batch summary",()=>{
  it("uses fixed Access/photo reads and one signed-URL batch for 30 visible Complexes",async()=>{
    const complexes:Complex[]=Array.from({length:30},(_,i)=>({id:`cx-${i}`,name:`Complex ${i}`,zoneId:"zone",civicIds:[`a-${i}`],primaryAccessId:`a-${i}`}));
    const links=complexes.map((complex,i)=>({complex_id:complex.id,address_accesses:{id:`a-${i}`,street_id:"street",civic:String(i+1),exponent:null,specificity:null,metric:null,progressivo_snc:null,streets:{name:"Via Roma"}}}));
    const photos=complexes.map((complex,i)=>({complex_id:complex.id,storage_path:`private/${i}.jpg`,is_primary:true,sort_order:0,uploaded_at:"2026-09-29"}));
    from.mockImplementation((table:string)=>query(table==="complex_address_accesses"?links:photos));
    createSignedUrls.mockResolvedValue({data:photos.map(photo=>({path:photo.storage_path,signedUrl:`https://lab.test/${photo.storage_path}`})),error:null});
    const result=await loadStreetComplexSummaries(complexes);
    expect(Object.keys(result)).toHaveLength(30);
    expect(from).toHaveBeenCalledTimes(2);
    expect(createSignedUrls).toHaveBeenCalledTimes(1);
    expect(createSignedUrls.mock.calls[0][0]).toHaveLength(30);
  });
});
