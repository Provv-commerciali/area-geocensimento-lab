# Database schema

Migration `202609110001_initial_census_lab.sql` enables PostGIS and creates operators, territorial hierarchy, zones, streets, zone/street links, civics, complexes, complex/civic links, contact types, census records and interviews. UUID primary keys and timestamps are used throughout; foreign keys encode ownership without duplicating geography.

All domain tables have RLS enabled. Authenticated LAB users can read and write; anonymous access is denied. This intentionally simple policy is adequate for the isolated LAB and is not the A.R.E.A. role model.

Migration `202609110002_fix_authenticated_permissions.sql` adds the SQL privileges that must exist before RLS policies can be evaluated. It explicitly denies anonymous access, grants authenticated users read access to reference data, limits `operators` reads to `id` and `display_name`, and grants CRUD only on operational Censimento tables. Lookup tables and operator/Auth associations remain admin-managed and read-only from the application.

`supabase/seed.sql` inserts a deterministic fictional dataset. It is idempotent by stable UUID/key usage and must only be applied to the dedicated Lab project.
