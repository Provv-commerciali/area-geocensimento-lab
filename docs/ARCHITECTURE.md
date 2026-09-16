# Architecture

The application is a Next.js App Router monolith deployable on Vercel. React UI lives in `src/app` and `src/components`; feature validation and filtering live in `src/features`; typed entities in `src/domain`; persistence boundaries in `src/repositories`; Supabase setup in `src/lib` and `src/services`.

```text
browser → Next.js route/server boundary → validated feature service → repository → Supabase
                                  ↘ read-only demo repository (when env is absent)
```

Supabase Auth supplies the LAB identity. Middleware refreshes sessions when configured. PostgreSQL is the system of record, migrations are authoritative, and all client-exposed domain tables use RLS scoped to authenticated users. The browser receives only URL and publishable key. There is no separate backend.

Territorial master data has a separate administration path: an offline Node importer downloads and validates the official ISTAT/SITUAS workbook, then connects directly to the dedicated LAB PostgreSQL endpoint for one transactional sync. Its database URL is ephemeral operator input, never a browser/Vercel variable. Runtime pages query only the local Supabase snapshot; municipality reads are paginated so the PostgREST row limit cannot truncate the national list.

The demo adapter is a documented LAB EXPERIMENT: deterministic fictional records make review possible before infrastructure credentials are present. It does not claim persistence and is visibly labeled.

Runtime pages request only the repository resources they render. Contextual Zone, Street and Complex pages push their record constraints into PostgREST instead of downloading the national snapshot and filtering it afterward. Municipalities and Streets are loaded incrementally after their parent selection through authenticated, runtime-validated routes. Heavy navigation links do not prefetch complete authenticated data trees speculatively.

The Censimento dashboard consumes the existing record projection and derives one deterministic snapshot for current operational workload, monthly event performance, zone composition and commercial deadlines. Current ownership and historical event attribution are deliberately separate. Database triggers capture the authenticated actor for creation, first Notizia, appraisal and first agency acquisition; no historical actor is inferred. UI filters operate on this already-loaded bounded LAB projection and never call external providers.

GeoCensimento reuses these identifiers and relationships through a client-only OpenLayers boundary fed by server-loaded, authenticated Censimento data. External providers remain isolated behind adapters and server routes.

```text
authenticated page → CensusRepository → shared operational-state derivation → civic aggregation → OpenLayers vector/cluster
                                                     browser → same-origin WMS proxy → official AdE WMS
                                                     explicit search → same-origin geocoding route → provider adapter
```

The browser receives serializable domain data and never a Supabase service-role key. One WGS84 PostGIS point is cached on `Civic`, reused by all associated contacts. EPSG:4258 is registered explicitly in OpenLayers before an `ImageWMS` requests the official orange `fabbricati` overlay and reprojects its single view image onto EPSG:3857; parcel queries use the separate queryable layer. WMS parameters are allowlisted by a same-origin route because the verified upstream response does not expose CORS. Provider failures are non-fatal.

The GeoCensimento page loads its bounded application projection once per navigation and filters it locally; it does not reload the database or geocode on pan. Contact detail reads are constrained by record and Subject context. The GiST index and provider boundary prepare viewport queries for larger volumes.

Explicit geography commands cross a validated server-action boundary. Civic location is written once on `Civic`; an automatic geocoder candidate remains `AUTO_GEOLOCATED`, while marker movement/click plus operator confirmation writes `VERIFIED`. The separate cadastral picker uses the existing WMS proxy and a validated `GetFeatureInfo` parser that handles both official national-reference section variants. On an existing Contact it writes a `CadastralAssociation` only after confirmation; during creation it can only copy the returned sheet and parcel into the draft form because no CensusRecord exists yet.

Milestone 3 adds a bounded Complex-photo feature without changing the main navigation. Authenticated browsers upload JPG/PNG/WebP directly to the private Supabase Storage bucket `complex-photos`; validated server actions write metadata, short-lived signed URLs support display and deletion removes the blob while retaining soft-deleted audit metadata.

```text
Complex → private photo → explicit Analyze → DoorbellTextRecognitionProvider
                                      ↓
                         OCR detection → editable proposal
                                      ↓ operator confirmation
                         create_census_record_lab → normal CensusRecord
```

`DoorbellTextRecognitionProvider` is server-only and storage-agnostic. Its HTTP adapter sends bytes to a separately operated PaddleOCR/PP-OCRv6 service, validates a versioned response with Zod and persists only safe errors. No application logic imports PaddleOCR types. The endpoint/token are server-only. Without an endpoint, no fake OCR result is produced and manual proposals remain available.

The OCR stack is not embedded in the current Vercel Next.js function. Official PaddleOCR requires a Python inference stack and model assets; while Vercel Fluid compute now permits larger/longer functions, large functions remain beta and this project has no measured or approved Python deployment. A separate local/self-hosted HTTP service is the milestone boundary; its final hosting, sync/queued execution and capacity remain operational TBDs.

`tools/doorbell-ocr-service` is the loopback-only **LAB EXPERIMENT** reference implementation. It runs PP-OCRv6 on CPU, accepts only supported image MIME types, returns the versioned provider contract and classifies uncertain/non-name text as `UNKNOWN`. It is suitable for local validation; a Vercel deployment cannot reach `127.0.0.1`, so production hosting remains `TBD-OCR-001`.

Paid cadastral enrichment crosses one server-only application boundary shared by GeoCensimento and Contact detail. `CadastralDataProvider` isolates business logic from `OpenApiCatastoProvider`; Zod validates every external response. `OPENAPI_CATASTO_TOKEN` and the sandbox/production base URL are read only inside this boundary. Each explicit command authenticates the Supabase user and calls `can_use_paid_cadastral_services_lab()` before creating an auditable request. A SHA-256 hash of canonical parameters provides cache lookup, while a partial unique index prevents two active purchases for the same operation. Moderate six-second polling follows provider request IDs. Completed data is projected into property units and lossless ownership rights; ordinary PDF reports are copied to a private RLS-protected bucket and exposed only through short-lived signed URLs.
