# Database schema

Migration `202609110001_initial_census_lab.sql` enables PostGIS and creates operators, territorial hierarchy, zones, streets, zone/street links, civics, complexes, complex/civic links, contact types, census records and interviews. UUID primary keys and timestamps are used throughout; foreign keys encode ownership without duplicating geography.

All domain tables have RLS enabled. Authenticated LAB users can read and write; anonymous access is denied. This intentionally simple policy is adequate for the isolated LAB and is not the A.R.E.A. role model.

Migration `202609110002_fix_authenticated_permissions.sql` adds the SQL privileges that must exist before RLS policies can be evaluated. It explicitly denies anonymous access, grants authenticated users read access to reference data, limits `operators` reads to `id` and `display_name`, and grants CRUD only on operational Censimento tables. Lookup tables and operator/Auth associations remain admin-managed and read-only from the application.

Migration `202609110003_complete_milestone_one_workflows.sql` adds structured floor fields and constraints, controlled qualification/occupancy values, normalized uniqueness for streets/civics, significant record duplicate protection and authenticated RLS-respecting workflow functions for zones, streets, civics and CensusRecords.

Migration `202609110004_separate_record_creation_from_interviews.sql` replaces record creation so it rejects bundled interviews, adds the explicit `create_census_interview_lab` command, marks workflow functions as security-invoker and creates the `census_record_contact_status` security-invoker view. The view derives `has_interviews` and latest interview date from real rows while preserving underlying RLS.

`supabase/seed.sql` inserts a deterministic fictional dataset. It is idempotent by stable UUID/key usage and must only be applied to the dedicated Lab project.
