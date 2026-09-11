# Architecture

The application is a Next.js App Router monolith deployable on Vercel. React UI lives in `src/app` and `src/components`; feature validation and filtering live in `src/features`; typed entities in `src/domain`; persistence boundaries in `src/repositories`; Supabase setup in `src/lib` and `src/services`.

```text
browser → Next.js route/server boundary → validated feature service → repository → Supabase
                                  ↘ read-only demo repository (when env is absent)
```

Supabase Auth supplies the LAB identity. Middleware refreshes sessions when configured. PostgreSQL is the system of record, migrations are authoritative, and all client-exposed domain tables use RLS scoped to authenticated users. The browser receives only URL and publishable key. There is no separate backend.

The demo adapter is a documented LAB EXPERIMENT: deterministic fictional records make review possible before infrastructure credentials are present. It does not claim persistence and is visibly labeled.

GeoCensimento will reuse these identifiers and relationships in a future milestone. OpenLayers is planned but deliberately absent now.
