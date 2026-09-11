# Decisions

- **DEC-001** — Next.js App Router + strict TypeScript is the application stack.
- **DEC-002** — Supabase/PostgreSQL is the persistence and authentication platform.
- **DEC-003** — PostGIS is enabled from the initial migration, without geometry tables yet.
- **DEC-004** — `CensusRecord` is the POC's central entity.
- **DEC-005** — `CensusInterview` is separate to preserve history.
- **DEC-006** — Complex ↔ Civic is a many-to-many relationship.
- **DEC-007** — GeoCensimento is deferred to the next milestone.
- **DEC-008** — OpenLayers is planned for GIS but not introduced in Milestone 1.
- **DEC-009** — A deterministic read-only demo adapter supports UI review when dedicated Supabase variables are absent. This is a LAB EXPERIMENT, not production behavior.
- **DEC-010** — `floor_label` remains textual because observed values cannot be faithfully represented by one integer.
- **DEC-011** — Database authorization uses two explicit layers: narrow SQL `GRANT` privileges followed by RLS policies requiring an authenticated Supabase identity. Reference data is application-read-only; only operational Censimento tables receive authenticated CRUD privileges.
