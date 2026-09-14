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

Migration `202609110010_runtime_performance_indexes.sql` adds non-invasive B-tree indexes for reverse Zone/Street and Complex/Civic traversal, independent Complex/operator/contact-type record filters and deterministic Subject registry ordering. It does not alter entities, RLS, grants or map geometry.

Migration `202609110011_subject_search_projection.sql` adds a generated Subject search projection with a `pg_trgm` GIN index so forms retrieve at most 20 matching registry entries instead of transferring the full registry. The projection is derived from authoritative registry columns and does not change RLS or domain identity.

Migration `202609110012_verified_locations_and_cadastral_associations.sql` replaces the ambiguous legacy civic states with `NOT_GEOLOCATED`, `AUTO_GEOLOCATED` and `VERIFIED`, adds method and verification audit, and enforces that a geocoder cannot verify a point. It creates the RLS-protected one-to-one `cadastral_associations` relation on `census_records` plus authenticated security-invoker commands for explicit civic-location and parcel confirmation. Parcel confirmation updates only existing sheet/parcel fields; unavailable subaltern/category data is untouched.

Migration `202609130001_complex_photos_and_doorbell_acquisition.sql` adds optional Scala/Interno labels to the existing CensusRecord and creates the private `complex-photos` bucket. RLS-protected photos, sessions, provider-neutral OCR runs, detections, editable proposals and N:N sources preserve photo→recognition→proposal→normal record provenance. Authenticated security-invoker functions start/finish/fail recognition and transactionally confirm selected proposals through `create_census_record_lab`; none inserts a CensusInterview.

Migration `202609110014_contact_updates.sql` adds the authenticated Subject update policy/column grant and the security-invoker `update_census_contact_lab` command. It validates primary-subject identity, zone/street/civic and complex membership plus the established duplicate property-context invariant, then atomically updates Subject identity, CensusRecord context/property data and the primary relationship role. It never updates interview rows.

Migration `202609110015_contact_deletion.sql` adds the authenticated security-invoker `delete_census_contact_lab` command. It removes one CensusRecord context, lets existing cascade FKs remove its context-owned children, retains the normalized Subject and detaches any optional doorbell acquisition audit reference before deletion.

Migration `202609140002_openapi_cadastral_enrichment.sql` adds the default-denied paid-service permission, auditable/cacheable `cadastral_requests`, provider property-unit projections, lossless ownership rights and private ordinary-report metadata/storage. RLS remains enabled, anonymous access is revoked, one partial unique index prevents duplicate active purchases and signed document access is restricted to the authenticated requester.

`supabase/seed.sql` inserts a deterministic fictional application dataset. Its Bologna territorial anchors are not the national archive. `scripts/sync-istat-territories.ts` separately downloads, validates and transactionally synchronizes the official archive; see `docs/TERRITORIAL_IMPORT.md`.
