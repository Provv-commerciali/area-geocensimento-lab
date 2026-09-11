# Testing strategy

Vitest covers Zod validators, filter semantics, appraisal invariants, record helpers, interview derivation and repository contracts. React Testing Library covers critical conditional UI. Playwright smoke specifications cover login/demo entry, zone/street flow, contact creation/filtering, contextual street contacts and complex interiors.

Tests never call external APIs. Repository integration tests use deterministic in-memory fixtures; live Supabase migration verification is a separate infrastructure action because credentials are not stored. CI runs lint, strict typecheck, unit/integration tests and production build. Playwright can be run locally once the browser runtime is installed.
