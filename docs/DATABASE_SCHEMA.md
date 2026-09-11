# Database schema

Migration `202609110001_initial_census_lab.sql` enables PostGIS and creates operators, territorial hierarchy, zones, streets, zone/street links, civics, complexes, complex/civic links, contact types, census records and interviews. UUID primary keys and timestamps are used throughout; foreign keys encode ownership without duplicating geography.

All domain tables have RLS enabled. Authenticated LAB users can read and write; anonymous access is denied. This intentionally simple policy is adequate for the isolated LAB and is not the A.R.E.A. role model.

Migration `202609110002_fix_authenticated_permissions.sql` adds the SQL privileges that must exist before RLS policies can be evaluated. It explicitly denies anonymous access, grants authenticated users read access to reference data, limits `operators` reads to `id` and `display_name`, and grants CRUD only on operational Censimento tables. Lookup tables and operator/Auth associations remain admin-managed and read-only from the application.

Migration `202609110003_complete_milestone_one_workflows.sql` adds structured floor fields and constraints, controlled qualification/occupancy values, normalized uniqueness for streets/civics, significant record duplicate protection and authenticated RLS-respecting workflow functions for zones, streets, civics and CensusRecords.

Migration `202609110004_separate_record_creation_from_interviews.sql` replaces record creation so it rejects bundled interviews, adds the explicit `create_census_interview_lab` command, marks workflow functions as security-invoker and creates the `census_record_contact_status` security-invoker view. The view derives `has_interviews` and latest interview date from real rows while preserving underlying RLS.

Migration `202609110005_normalize_subjects_and_property_links.sql` introduces `subjects` and the many-to-many `census_record_subjects` table. It backfills one private subject per legacy record unless a normalized tax code provides a strong match, preserves legacy columns as snapshots, adds partial unique indexes for CF/P.IVA and replaces record creation with an atomic subject resolution/link workflow. New tables retain RLS and explicit authenticated-only grants.

Migration `202609110006_restore_contact_ux_and_coownership.sql` preserves the normalized registry and all migrated links, adds `Comproprietario` to the relationship roles and updates the authenticated security-invoker workflows. It does not alter interview ownership or create synthetic events.

Migration `202609110007_official_istat_territories.sql` extends the existing Country → Region → Province → Municipality hierarchy with official ISTAT identifiers, unit type, useful administrative codes, source date and active state. NUTS3 codes use a separate one-to-many table because the official dataset does not make that relationship functional for every 2026 intermediate unit. It creates a private import-audit table while preserving RLS and browser read-only grants. Existing Bologna demo rows are not replaced or deleted; the importer reconciles them in place so dependent zone FKs remain valid.

Migration `202609110008_census_operational_status.sql` adds the singleton `census_operational_settings` table with validated `stale_news_days` (LAB default 30, range 1–3650). It enables RLS, denies anonymous access, grants authenticated operators read access and column-level update of the threshold only, and provides no browser INSERT/DELETE privilege. Status, interview age and overdue days remain derived in the domain layer and are not added to `census_records`.

Migration `202609110009_geocensus_civic_locations.sql` adds an optional `geography(Point,4326)` to `civics`, explicit geocoding state, source, timestamp, optional quality/review note and a GiST spatial index. A consistency constraint requires provenance for `GEOLOCATED` rows. Existing Civic grants and RLS remain in force; coordinates are not duplicated on contacts.

`supabase/seed.sql` inserts a deterministic fictional application dataset. Its Bologna territorial anchors are not the national archive. `scripts/sync-istat-territories.ts` separately downloads, validates and transactionally synchronizes the official archive; see `docs/TERRITORIAL_IMPORT.md`.
