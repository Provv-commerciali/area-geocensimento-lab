import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/202609130001_complex_photos_and_doorbell_acquisition.sql"), "utf8");

describe("complex photos and doorbell acquisition migration", () => {
  it("creates a private constrained Storage bucket and denies anonymous table access", () => {
    expect(sql).toContain("values ('complex-photos', 'complex-photos', false, 10485760");
    expect(sql).toContain("allowed_mime_types");
    expect(sql).toContain("bucket_id = 'complex-photos'");
    expect(sql).toContain("from public, anon, authenticated");
    expect(sql).not.toContain("service_role");
    expect(sql).not.toContain("security definer");
  });

  it("separates photos, runs, detections and editable proposals with provenance", () => {
    for (const table of ["complex_photos","doorbell_acquisition_sessions","doorbell_ocr_runs","doorbell_ocr_detections","doorbell_contact_proposals","doorbell_proposal_sources"]) expect(sql).toContain(`create table public.${table}`);
    expect(sql).toContain("census_record_id uuid unique references public.census_records");
    expect(sql).toContain("proposed_subject_type in ('PERSON','COMPANY','UNKNOWN')");
  });

  it("never triggers OCR for a complex photo and creates no contact during recognition", () => {
    expect(sql).toContain("photo_type='DOORBELL'");
    const recognition = sql.slice(sql.indexOf("record_doorbell_recognition_lab"), sql.indexOf("fail_doorbell_recognition_lab"));
    expect(recognition).not.toContain("create_census_record_lab");
    expect(recognition).not.toContain("census_interviews");
  });

  it("confirms selected proposals through the canonical contact RPC with no interview", () => {
    const confirmation = sql.slice(sql.indexOf("confirm_doorbell_proposals_lab"));
    expect(confirmation).toContain("public.create_census_record_lab");
    expect(confirmation).toMatch(/\),null\);/);
    expect(confirmation).not.toContain("insert into public.census_interviews");
    expect(confirmation).toContain("if array_length(v_ids,1)<>array_length(p_proposal_ids,1)");
  });

  it("adds optional Scala and Interno to the existing context without a parallel property archive", () => {
    expect(sql).toContain("add column staircase text");
    expect(sql).toContain("add column unit_identifier text");
    expect(sql).not.toMatch(/create table public\.(property|unit|apartment)/i);
  });
});
