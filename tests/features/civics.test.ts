import { describe, expect, it } from "vitest";
import { deduplicateCivicDrafts, generateCivicRange, parseManualCivics } from "@/features/territory/civics";

describe("civic generation", () => {
  it("generates an inclusive complete range", () => expect(generateCivicRange(1,4,"all").map(c=>c.number)).toEqual(["1","2","3","4"]));
  it("generates only even civics", () => expect(generateCivicRange(1,6,"even").map(c=>c.number)).toEqual(["2","4","6"]));
  it("generates only odd civics", () => expect(generateCivicRange(1,6,"odd").map(c=>c.number)).toEqual(["1","3","5"]));
  it("keeps manual extension separate", () => expect(parseManualCivics("12 A\n14 bis")).toEqual([{number:"12",extension:"A"},{number:"14",extension:"bis"}]));
  it("removes normalized duplicates but preserves different extensions", () => expect(deduplicateCivicDrafts([{number:" 12 ",extension:"A"},{number:"12",extension:"a"},{number:"12",extension:"B"}])).toHaveLength(2));
  it("rejects invalid and excessive ranges", () => { expect(()=>generateCivicRange(5,1,"all")).toThrow(); expect(()=>generateCivicRange(1,3000,"all")).toThrow() });
});
