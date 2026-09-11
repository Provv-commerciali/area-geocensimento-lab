# A.R.E.A. GeoCensimento Lab

Disposable technical proof of concept for validating the **Censimento** domain and workflows before experimenting with GeoCensimento. It is not the new A.R.E.A., is not a complete real-estate management system, and is not automatically production-ready.

## Stack and status

Next.js App Router, React, strict TypeScript, Supabase Auth/PostgreSQL, PostGIS readiness, Zod, Vitest/React Testing Library and Playwright. Milestone 0 establishes governance and infrastructure; Milestone 1 implements the Censimento LAB. Maps and cadastral integrations are explicitly out of scope.

## Local setup

1. Install Node.js and run `npm ci`.
2. Copy `.env.example` to `.env.local` and insert credentials from the **dedicated** Supabase project.
3. Apply migrations in `supabase/migrations` with the Supabase CLI or SQL editor, strictly in filename order (`001` through `005`).
4. Optionally apply `supabase/seed.sql` to obtain controlled fictional LAB data.
5. Run `npm run dev` and open `http://localhost:3000`.

Without Supabase variables, the application intentionally runs in a read-only local demo mode so the UI, filters and domain can be reviewed. Persistence and real login require the dedicated environment values.

## Commands

- `npm run lint` — lint
- `npm run typecheck` — strict type checking
- `npm test` — unit/integration-shaped repository contract tests
- `npm run test:e2e` — Playwright smoke tests
- `npm run build` — Vercel-compatible production build

## Supabase and deployment

Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` locally and in Vercel. Never use a service-role key in the browser. The Vercel project should keep its default Next.js build and repository root settings. Database changes must be migrations; dashboard-only schema changes are not reproducible and are prohibited.

Migration `004` is required after `003`: it enforces that a newly-created CensusRecord has no synthetic interview, exposes an explicit authenticated interview command and provides an RLS-aware derived contact-status view.

## Documentation

Start with `AGENTS.md`, then `docs/PROJECT_CONSTITUTION.md` and `docs/PROJECT_SPEC.md`. Architecture, domain, schema, testing, decisions, uncertainties and work sessions are maintained in the remaining `docs/` files.
