# Codex worklog

## 2026-09-14 — Revisione OCR interattiva e Storage RLS

**Problema:** lo scarto di una proposta OCR incompleta applicava erroneamente i vincoli necessari alla creazione del Contatto; l'errore della Server Action veniva mascherato in produzione come React #441. La policy Storage iniziale bloccava inoltre l'upload autenticato nel LAB online.

**Correzione:** lo stato `DISCARDED` non richiede campi anagrafici/immobiliari completi, gli errori di validazione tornano alla UI in forma leggibile e le proposte scartate escono dalla revisione dopo il salvataggio. La policy versionata `202609140001_fix_complex_photo_storage_rls.sql` consente l'accesso autenticato solo alle cartelle collegate a un Complesso LAB esistente tramite una verifica protetta dalla RLS ricorsiva.

**Verifica:** test UI mirato su select, salvataggio, separazione e scarto; lint, typecheck e build.

## 2026-09-13 — Local PP-OCRv6 reference service

Added the loopback-only FastAPI LAB EXPERIMENT under `tools/doorbell-ocr-service`, installed PaddlePaddle 3.2/PaddleOCR 3.7 in the isolated local environment and connected `.env.local` to port 8091 because port 8090 was occupied by unrelated software. Health and a real-image PP-OCRv6 inference completed successfully; online hosting remains `TBD-OCR-001`.

## 2026-09-11 — Milestone 3 Complex photos and assisted doorbell acquisition

**Obiettivo:** add private Complex documentation and operator-assisted Doorbell text acquisition without a parallel contact/property domain.

**Modifiche:** private Supabase Storage metadata; sessions; provider-neutral OCR runs/detections; editable source-preserving proposals; mass review with manual correction, bulk context, weak-match review, duplicate warning, merge/split and manual fallback; optional Scala/Interno labels on the existing CensusRecord.

**OCR boundary:** PP-OCRv6 stays behind a server-only HTTP adapter to a separately operated local/self-hosted service. No commercial OCR, embedded Python Vercel runtime or cost was introduced. Without configuration, uploads and manual proposals remain available.

**Invariants:** photo/proposal are not Contacts; names do not imply ownership; confirmation calls the canonical Contact RPC with no interview; resulting records derive Mai contattato from zero interviews.

**Migration:** `202609130001_complex_photos_and_doorbell_acquisition.sql`, after the existing Milestone 2/Contact migrations. Live Supabase Storage/policy verification remains an infrastructure step.

## 2026-09-11 — GeoCensimento layout, persisted point and Contact correction

**Obiettivo:** correct the four production regressions reported after the verified-location migration: narrow map/sidebar filters, an invisible persisted Via Francesca 59 point, missing Contact editing and incomplete cadastral click detail.

**Risultato:** filters now wrap horizontally above a full-width map; the Supabase repository decodes GeoJSON, WKT and EWKB PostGIS points instead of discarding non-object representations; Contact detail exposes a prefilled atomic editor; cadastral detail adds Province, Comune and returned feature type. Migration `202609110014_contact_updates.sql` grants only the Subject update columns needed by the authenticated security-invoker edit command.

**Verifica:** parser/schema/migration tests and the complete 15-test Playwright Chromium Censimento smoke suite pass. Live Via Francesca 59 verification remains a post-deploy readback against the dedicated LAB database.

## 2026-09-11 — Verified civic location and confirmed cadastral association

**Obiettivo:** integrate geocoder-assisted but operator-verified civic positioning into Nuovo Contatto, and add a normal Contact workflow for previewing and confirming an official free cadastral parcel.

**Risultato:** Civic remains the only coordinate owner and now distinguishes `NOT_GEOLOCATED`, `AUTO_GEOLOCATED` and `VERIFIED` with method/audit metadata. A reusable OpenLayers picker supports address centering, click, drag, cancel and explicit confirmation. GeoCensimento distinguishes verified, to-verify and missing civics. Contact detail adds a separate cadastral picker using the existing orange AdE WMS and validated `GetFeatureInfo`; confirmation creates/corrects one RLS-protected association per CensusRecord and synchronizes only sheet/parcel.

**Performance e sicurezza:** no bulk geocoding, no map-pan geocoding, no duplicated contact coordinates, no automatic cadastral match, targeted Contact/Subject-context reads, provider calls behind existing same-origin boundaries, authenticated security-invoker writes.

**Hard stop:** no OpenAPI Catasto, paid API, visura, ownership data, scraping, invented subaltern/category, or parallel property/contact archive.

## 2026-09-11 — Runtime performance pass

**Obiettivo:** remove the request amplification and unnecessary full-snapshot reads found by the application/database performance audit, without overlapping the separate cadastral-map correction.

**Modifiche:** use-case-scoped data loader; PostgREST record constraints for Zone, Street and Complex pages; Municipality/Street loading only after parent selection; bounded on-demand Subject lookup; runtime payload validation; linear link aggregation; bounded Contact table rendering; disabled speculative prefetch on authenticated heavy navigation; locally verifiable JWT claims in the Supabase proxy.

**Migration:** `202609110010_runtime_performance_indexes.sql`; reverse many-to-many traversal, record-filter and Subject-order indexes only. No domain or geometry change.

**Migration successiva:** `202609110011_subject_search_projection.sql`; generated, trigram-indexed Subject lookup projection used only for bounded search.

**Esclusione esplicita:** cadastral WMS CRS behavior and map implementation files remain owned by the separate map task.

**Quality gate integrato:** ESLint passed; strict TypeScript passed; 116 Vitest tests passed across 24 files; 15 Playwright Chromium tests passed; Next.js production build passed.

## 2026-09-11 — GeoCensimento production correction

**Problema:** OpenLayers did not know EPSG:4258 and silently requested the cadastral proxy in EPSG:3857, which the verified allowlist correctly rejected. Tiled loading then also produced request bursts and intermittent upstream 502 responses. Zone changes could retain an invalid Via filter, while real post-migration civics without coordinates left the view on the default city.

**Correzione:** explicit ETRS89 registration and transforms; single-image orange `fabbricati` AdE WMS with separate parcel query source; dependent Via reset; explicit missing-coordinate notice and one bounded first-address centering lookup without marker creation or persistence; resource-scoped repository reads for heavy Censimento pages. The initially selected composite parent was rejected after browser review because it produced an unreadable administrative overlay.

**Verifica:** live close-scale `fabbricati` request returned the expected transparent orange building footprints; the local same-origin request uses `CRS=EPSG:4258` and the UI reaches `Catasto: disponibile`. The integrated automated gate is recorded above.

## 2026-09-11 — Milestone 2 GeoCensimento

**Obiettivo:** deliver the first operational geographic view of the existing Censimento with free providers and no parallel domain.

**Modifiche:** OpenLayers client boundary; OSM LAB basemap; verified AdE parcel WMS through an allowlisted server proxy; civic-level aggregation and clustering; shared operational marker visuals; URL filters and contextual Censimento links; explicit missing-geolocation counters; on-demand geocoding adapter; provider-error handling.

**Migration:** `202609110009_geocensus_civic_locations.sql`; cached WGS84 PostGIS geography and provenance on Civic with GiST index. No coordinates on CensusRecord.

**Servizi verificati:** AdE WMS capabilities, PNG GetMap and plain-text GetFeatureInfo succeeded; upstream CORS header absent. WFS probe returned Access Denied and is not integrated. OSM/Nominatim remain LAB-limited.

**Hard stop:** no OpenAPI Catasto, paid service, owner/visura, scraping, automatic match or new cadastral identity.

**Quality gate:** ESLint passed; strict TypeScript passed; 105 Vitest tests passed across 20 files; 13 Playwright Chromium smoke tests passed against the production build; Next.js production build passed. Live AdE WMS and Nominatim probes passed; WFS remained unavailable.

## 2026-09-11 — Milestone 1B operational contact state

**Obiettivo:** add actionable age, stale Notizia and overdue recall semantics without redesigning the approved Censimento workflow.

**Modifiche:** pure shared operational derivation with explicit Europe/Rome date; centralized accessible visual tokens; Contact list/detail badges and day counts; real-repository operational filters; minimal persistent threshold screen; Dashboard activity projection; no synthetic interviews and no map implementation.

**Migration:** `202609110008_census_operational_status.sql` after migration `007`; adds only the RLS-protected singleton configuration.

**Test:** deterministic cases A–I, threshold/RLS migration contracts, operational filters and Playwright smoke coverage. Final gate results are recorded in the delivery report.

## 2026-09-11 — Archivio territoriale nazionale ISTAT/SITUAS

**Obiettivo:** replace demo-only territorial choices in the Supabase LAB with the complete official Italian hierarchy while preserving existing zones and Milestone 1 boundaries.

**Modifiche:** incremental official-code/active-state schema; private import audit; repeatable transactional XLSX importer; active Supabase reference queries; hierarchical Nuova zona tests; source, sync and verification runbook. Runtime never calls ISTAT and demo seed remains separate.

**Fonte verificata:** permanent ISTAT municipal-code workbook, sheet `CODICI al 21_02_2026`: 20 Regions, 110 intermediate statistical units, 7,894 Municipalities.

**Migration:** `202609110007_official_istat_territories.sql` after migration `006`.

**Test:** official online importer dry-run passed with SHA-256 verification; live LAB import committed only after reading back 20/110/7,894 rows in the same transaction; ESLint passed; strict TypeScript passed; 82 Vitest tests passed across 16 files; Next.js production build passed.

## 2026-09-11 — Contact UX correction

**Obiettivo:** restore the A.R.E.A. Censimento operating model after the registry normalization was exposed too prominently.

**Modifiche:** restored Dashboard/Contatti/Nuovo contatto/Zone/Complessi navigation; removed the autonomous Subjects UI; retained the internal normalized registry and N:N links; added Comproprietario; exposed same-registry contexts inside the Contact sheet; preserved context-specific interview history and zero-interview creation.

**Migration:** `202609110006_restore_contact_ux_and_coownership.sql` after migration `005`; no migrated registry data is removed.

**Test:** contact navigation, private/company form, strong-identifier reuse, comproprietà, cross-context links, interview isolation and migration contract.

## 2026-09-11 — Subject/property normalization

**Obiettivo:** separate unique personal/company registry data from reusable property census contexts.

**Modifiche:** `Subject` private/company model; strong CF/P.IVA duplicate detection; many-to-many property roles; lossless legacy backfill; existing-subject reuse in creation; bidirectional subject/property sheets; context-owned interviews with subject aggregation.

**Migration:** `202609110005_normalize_subjects_and_property_links.sql` after migration `004`.

**Test:** subject-to-many-properties, many-subjects-to-property, schema shapes, strong identifiers, migration/RLS contracts and UI selection flows.

## 2026-09-11 — Milestone 1 persistence completion

**Obiettivo:** complete real Supabase territory/contact workflows and preserve the domain distinction between a new record and an actual interview.

**Modifiche:** hierarchical zone creation; explicit street/civic management; civic range/parity generation; cascaded contact form; structured floors; controlled vocabularies; truthful persistence feedback; significant duplicate protection; explicit interview action; derived never-contacted filter; database/demo mode indicators.

**Migration:** `202609110003_complete_milestone_one_workflows.sql`, followed by `202609110004_separate_record_creation_from_interviews.sql`.

**Seed:** unchanged; existing fictional interview rows remain intentional history, while all newly-created records start with zero interviews.

**Test:** ESLint passed; strict TypeScript passed; 56 Vitest tests passed across 11 files; 7 Playwright Chromium smoke tests passed; Next.js production build passed.

**Problemi/TBD:** live Supabase verification remains a manual LAB action; future GeoCensimento remains out of scope.

## 2026-09-11 — Supabase authorization fix

**Obiettivo:** resolve authenticated runtime `permission denied` errors without disabling RLS or exposing service-role credentials.

**Modifiche:** incremental least-privilege grants; explicit anonymous revocation; read-only reference policies; authenticated CRUD policies for operational Censimento tables; authorization regression tests and documentation.

**File principali:** `supabase/migrations/202609110002_fix_authenticated_permissions.sql`, `tests/database/permissions-migration.test.ts`, authorization documentation.

**Migration:** `202609110002_fix_authenticated_permissions.sql`.

**Test:** ESLint passed; strict TypeScript passed; 25 Vitest tests passed across 6 files; Next.js production build passed.

**Problemi/TBD:** live policy verification requires manual application to the dedicated Supabase LAB project.

**Commit:** `fix(database): grant least-privilege access for authenticated users`.

## 2026-09-11

**Obiettivo:** bootstrap Milestone 0 and implement Milestone 1 Censimento LAB.

**Modifiche:** governance and documentation; Next.js/Supabase foundation; responsive operational UI; domain, filters, validation, demo repository; database schema/RLS/PostGIS/seed; tests and CI.

**File principali:** `src/`, `supabase/`, `tests/`, `.github/workflows/ci.yml`, root configuration and `docs/`.

**Migration:** `202609110001_initial_census_lab.sql`.

**Test:** ESLint passed; strict TypeScript passed; 20 Vitest tests passed; 6 Playwright Chromium smoke tests passed; Next.js production build passed.

**Problemi/TBD:** see `OPEN_QUESTIONS.md`; real Supabase credentials unavailable in repository by design.

**Commit:** semantic commits on `main`; final SHAs are recorded in Git history and delivery report.

## 2026-09-13 — Territory-safe cadastral detail and Contact lifecycle

**Problema:** an unfiltered cadastral click displayed Bologna for AdE code F035; Contact editing omitted coordinate management; deletion was unavailable; the cadastral popup lacked hierarchy.

**Correzione:** exact cadastral-code territory matching, explicit overlay status, structured popup, coordinate picker restored in editing and confirmed record-scoped deletion. Migration `202609110015_contact_deletion.sql` adds the authenticated deletion command.

**Verifica:** typecheck, lint, build, 154 tests and 16 Playwright scenarios pass.

## 2026-09-13 — Resilienza sovrapposizione catastale

**Problema:** `GetFeatureInfo` restava operativo ma il caricamento iniziale `GetMap` poteva ricevere un redirect di sessione, una risposta WMS non-PNG con stato 200 o superare il limite dimensionale su schermi HiDPI.

**Correzione:** proxy cartografico indipendente dall’autenticazione, validazione PNG con singolo retry, errori non memorizzabili, richieste non-HiDPI e comando manuale “Riprova”.

## 2026-09-13 — Causa riprodotta: dimensioni dopo riproiezione

**Evidenza:** il GetMap generato realmente da OpenLayers per 1530×610 pixel in Toscana richiede WIDTH=2122 e riceve HTTP 400 dal proxy online. Anche AdE dichiara MaxWidth/MaxHeight=2048. La precedente verifica con una URL costruita a mano non copriva questa richiesta e non dimostrava il rendering; l’ipotesi del refresh di sessione non era una causa dimostrata del guasto autenticato.

**Correzione:** loader condiviso che ridimensiona la richiesta finale mantenendo BBOX e aggiornando la risoluzione usata per riproiettare. Applicato a mappa principale e selettore catastale. Test sulle richieste reali a dimensioni desktop, ultrawide e portrait/HiDPI; verifica browser con immagini AdE e OSM reali e screenshot dei fabbricati arancioni sovrapposti.

**Verifica:** lint, typecheck, 158 test e build superati. Nel browser a 1920px, Piano di Mommio mostra oltre 62.000 pixel arancioni; GetMap 2048×708 restituisce 200 e la sovrapposizione su OSM è stata ispezionata visivamente.

## 2026-09-14 — OpenAPI Catasto enrichment

**Obiettivo:** integrare unità immobiliari, intestatari/diritti/quote e visura ordinaria senza duplicare il dominio catastale e senza chiamate automatiche a consumo.

**Modifiche:** provider condiviso server-side; sandbox/production configurabile; autorizzazione default-denied; cache/audit/idempotenza; polling asincrono; unità e diritti lossless; PDF privati; workflow mappa e Contatto; deduplica forte e normale Nuovo Contatto senza interviste; azione Modifica nell’elenco.

**Migration:** `202609140002_openapi_cadastral_enrichment.sql`.

**Verifica:** lint, typecheck, 167 test Vitest, 18 scenari Playwright e build production superati; provider esterno sempre mockato nei test automatici.

**TBD/manuale:** applicare la migration al Supabase LAB, abilitare gli operatori autorizzati, configurare token sandbox e verificare il contratto prezzi/freschezza. Nessun endpoint OpenAPI production è usato dai test.

## 2026-09-14 — Estensione contatto/unità e foto privata

**Modifiche:** i campi Catasto disponibili (classe, consistenza, rendita, zona, partita e indirizzo) estendono il blocco unità già presente nel Contatto. Una unità può precompilare un Nuovo Contatto; nel contatto esistente l’import è esplicito e bloccato in Sandbox. Nuovo/Modifica contatto accettano una foto privata JPG/PNG/WebP.

**Migration:** `202609140003_contact_cadastral_import_and_photos.sql` aggiunge la provenienza catastale e `contact-photos` con bucket privato/RLS.

**Verifica:** lint, typecheck, 167 test Vitest e build production superati.
