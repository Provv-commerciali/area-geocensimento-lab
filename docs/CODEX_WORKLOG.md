# Codex worklog

## 2026-09-11 — Supabase authorization fix

**Obiettivo:** resolve authenticated runtime `permission denied` errors without disabling RLS or exposing service-role credentials.

**Modifiche:** incremental least-privilege grants; explicit anonymous revocation; read-only reference policies; authenticated CRUD policies for operational Censimento tables; authorization regression tests and documentation.

**File principali:** `supabase/migrations/202609110002_fix_authenticated_permissions.sql`, `tests/database/permissions-migration.test.ts`, authorization documentation.

**Migration:** `202609110002_fix_authenticated_permissions.sql`.

**Test:** ESLint passed; strict TypeScript passed; 25 Vitest tests passed across 6 files; Next.js production build passed.

**Problemi/TBD:** live policy verification requires manual application to the dedicated Supabase LAB project.

**Commit:** `fix(database): grant least-privilege access for authenticated users`.

## 2026-09-11

**Obiettivo:** bootstrap Milestone 0 and implement Milestone 1 Censimento LAB.

**Modifiche:** governance and documentation; Next.js/Supabase foundation; responsive operational UI; domain, filters, validation, demo repository; database schema/RLS/PostGIS/seed; tests and CI.

**File principali:** `src/`, `supabase/`, `tests/`, `.github/workflows/ci.yml`, root configuration and `docs/`.

**Migration:** `202609110001_initial_census_lab.sql`.

**Test:** ESLint passed; strict TypeScript passed; 20 Vitest tests passed; 6 Playwright Chromium smoke tests passed; Next.js production build passed.

**Problemi/TBD:** see `OPEN_QUESTIONS.md`; real Supabase credentials unavailable in repository by design.

**Commit:** semantic commits on `main`; final SHAs are recorded in Git history and delivery report.
