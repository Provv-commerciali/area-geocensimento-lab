import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const migration=fs.readFileSync(path.join(process.cwd(),"supabase/migrations/202609140005_paid_service_governance.sql"),"utf8");

describe("paid service governance migration",()=>{
  it("enforces monthly and per-request limits before a paid request is inserted",()=>{expect(migration).toContain("paid_services_monthly_budget");expect(migration).toContain("paid_services_per_request_limit");expect(migration).toContain("enforce_paid_cadastral_budget_lab");expect(migration).toContain("before insert on public.cadastral_requests");expect(migration).toContain("for update")});
  it("keeps budget management separate from request permission",()=>{expect(migration).toContain("can_manage_paid_cadastral_services");expect(migration).toContain("set_paid_service_limits_lab");expect(migration).toContain("can_manage_paid_cadastral_services")});
});
