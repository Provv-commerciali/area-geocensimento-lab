# Changelog

## [0.3.1] - 2026-09-11

- Restore Contacts and New Contact as the primary Milestone 1 workflow and navigation.
- Keep the normalized subject registry internal to census operations.
- Add Comproprietario to context relationship roles.
- Show other contexts linked to the same registry identity inside the Contact sheet.

## [0.3.0] - 2026-09-11

- Separate unique private/company subjects from property census contexts.
- Add many-to-many subject/property roles and lossless legacy backfill.
- Detect strong CF/P.IVA matches without merging names automatically.
- Add internal subject/property relationships while keeping interviews context-specific.

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
