# A.R.E.A. GeoCensimento Lab — agent operating constitution

Before changing this repository, read this file and: `docs/PROJECT_CONSTITUTION.md`, `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/CENSIMENTO_CURRENT.md`, `docs/DOMAIN_MODEL.md`, `docs/TESTING.md`, `docs/DECISIONS.md`, and `docs/OPEN_QUESTIONS.md`.

This repository is an isolated, disposable laboratory. Never inspect, use, query, or change ProvviOne code, repositories, infrastructure, credentials, variables, or databases. Work only with the dedicated `area-geocensimento-lab` resources.

## Mandatory rules

- Do not silently deviate from the documented architecture or invent A.R.E.A. behavior.
- Uncertain requirements remain `TBD`; a necessary temporary behavior must be labeled `LAB EXPERIMENT`.
- Do not change stack without a documented decision. Keep Next.js App Router, strict TypeScript, npm, Supabase/PostgreSQL/PostGIS, Zod, Vitest/RTL and Playwright.
- Update `docs/DOMAIN_MODEL.md` with domain changes and create a versioned migration for every database schema change.
- Add architectural decisions to `docs/DECISIONS.md`, uncertainties to `docs/OPEN_QUESTIONS.md`, and significant sessions to `docs/CODEX_WORKLOG.md`.
- Keep UI, domain, persistence and external services separated. Validate external payloads at runtime.
- Client-exposed tables require RLS. Never commit secrets, expose service-role keys, or place secrets in `NEXT_PUBLIC_*`.
- Keep documentation, code, migrations and tests synchronized.
- Before a final push run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
- Do not implement GeoCensimento, map engines, WMS/WFS, cadastral providers, geometry, geocoding or overlays before explicit human approval for the next milestone.

The primary agent owns integration, testing, documentation, commits and push. Subagents may handle independent reviews or analysis, never conflicting edits or definitive architecture decisions.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
