import { describe, expect, it } from "vitest";
import { accessLabel, type AddressAccess } from "@/domain/territory";

const base={streetId:"street",streetName:"Via Roma",sourceKind:"OFFICIAL_ANNCSU" as const};
describe("canonical AddressAccess presentation",()=>{
  it("keeps civic, exponent, specificity, metric and SNC forms distinct",()=>{
    expect(accessLabel({civic:"7",exponent:"A",specificity:"SCALA 1"})).toBe("7/A · SCALA 1");
    expect(accessLabel({metric:"3,500"})).toBe("km 3,500");
    expect(accessLabel({progressivoSnc:"2"})).toBe("SNC 2");
  });
  it("does not use the visible label as identity",()=>{
    const first:AddressAccess={...base,id:"progressivo-1",anncsuProgressivoAccesso:"1",civic:"10"};
    const second:AddressAccess={...base,id:"progressivo-2",anncsuProgressivoAccesso:"2",civic:"10"};
    expect(accessLabel(first)).toBe(accessLabel(second));
    expect(first.id).not.toBe(second.id);
  });
});
