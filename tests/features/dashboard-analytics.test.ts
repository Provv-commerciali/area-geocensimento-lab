import { describe,expect,it } from "vitest";
import { buildDashboardSnapshot } from "@/features/dashboard/dashboard-analytics";
import { operators,records,zones } from "@/lib/demo-data";

describe("dashboard analytics",()=>{
  it("partitions every News into one management state",()=>{const result=buildDashboardSnapshot(records,zones,operators,"2026-09-15",{months:12});expect(Object.values(result.newsByStatus).flat()).toHaveLength(result.news.length)});
  it("uses exact Libero and distinct CensusRecords for property dimensions",()=>{const result=buildDashboardSnapshot(records,zones,operators,"2026-09-15",{months:12});expect(result.totals.vacant).toBe(records.filter(record=>record.occupancy==="Libero").length);expect(result.zonePerformance.reduce((sum,row)=>sum+row.contacts,0)).toBe(records.length)});
  it("attributes monthly events to their actor while current backlog follows the responsible operator",()=>{const selected=operators[0];const result=buildDashboardSnapshot(records,zones,operators,"2026-09-15",{months:12,operatorId:selected.id});expect(result.operatorPerformance).toHaveLength(1);expect(result.operatorPerformance[0].contacts).toBe(records.filter(record=>record.createdByOperatorId===selected.id).length);expect(result.currentRecords.every(record=>record.responsibleOperatorId===selected.id)).toBe(true)});
  it("orders external and exclusive expiries chronologically",()=>{const result=buildDashboardSnapshot(records,zones,operators,"2026-09-15",{months:12});expect(result.engagementExpiries.length).toBeGreaterThan(0);expect(result.engagementExpiries.map(item=>item.record.engagementExpiresOn)).toEqual([...result.engagementExpiries.map(item=>item.record.engagementExpiresOn)].sort())});
});
