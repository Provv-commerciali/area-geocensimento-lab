# Changelog

## [0.2.0] - 2026-09-11

- Complete persistent Milestone 1 zone, street, civic and contact workflows on Supabase.
- Add hierarchical territory selection, civic range/parity generation and normalized duplicate protection.
- Add structured floor data and controlled qualification/occupancy vocabularies.
- Separate record creation from explicit interview creation and derive “never contacted” from real interview absence.
- Add incremental migrations, truthful database/demo mode indicators and workflow regression tests.

## [0.1.1] - 2026-09-11

- Add explicit least-privilege grants required before Supabase RLS evaluation.
- Keep lookup/operator data read-only and operational Censimento tables writable only to authenticated LAB users.
- Add database authorization contract tests.

## [0.1.0] - 2026-09-11

- Bootstrap governance, Next.js tooling, Supabase/PostGIS foundation and CI.
- Add Censimento LAB navigation, zones, contacts, contextual street view, complexes and interview history.
- Add controlled demo data, migrations, validation and automated tests.
