# Codex worklog

## 2026-09-24 — Chiusura decisioni ANNCSU e verifica CRS

**Decisioni registrate:** approvato il modello greenfield e chiuse le questioni su boundary tenant, retention, governance MANUAL e coordinate. Il LAB mantiene la separazione global-reference/tenant-operational senza inventare tenant FK/RLS o RBAC di produzione; retention sorgenti configurabile con default 12 mesi e metadati/revisioni permanenti; riconciliazione MANUAL→OFFICIAL sempre esplicita e auditata.

**Verifica geospaziale:** le specifiche ANNCSU dichiarano ETRF2000 epoca 2008.0/RDN2008; la raccomandazione è `geometry(Point,6706)`, coordinate sorgente lossless, quota ortometrica separata, trasformazione esplicita a EPSG:3857 per OpenLayers e test numerici incrociati PostGIS/browser. GeoCensimento viene ridefinito come proiezione territoriale degli AddressAccess delle Street assegnate alle Zone, indipendentemente dall'esistenza di CensusRecord. Nessuna migration o modifica applicativa è stata eseguita.

## 2026-09-24 — Revisione greenfield del dominio ANNCSU

**Decisioni recepite:** ANNCSU diventa master data globale per aree di circolazione e accessi esterni; progressivi nazionali come identità ufficiali; omonimi sempre distinti; località esplicita; fallback MANUAL nello stesso dominio; coordinate multi-provenance senza overwrite della scelta verificata.

**Proposta:** un'unica entità Street e un'unica entità AddressAccess con invarianti OFFICIAL_ANNCSU/MANUAL, Locality ibrida, Zone tenant N:N con Street e GeoCensimento proiettato sugli accessi. Il modello LAB attuale potrà essere sostituito con una breaking migration e seed rigenerato dopo approvazione. Nessuna migration o modifica applicativa è stata eseguita.

## 2026-09-24 — Analisi integrazione ANNCSU

**Analisi:** verificati integralmente Stradario e Indirizzario Toscana del 15 settembre 2026, inclusi tracciati, encoding, cardinalità, chiavi, coordinate e coerenza referenziale. Confrontati schema, RPC e flussi Zone/Vie/Civici/Contatti del LAB.

**Proposta:** catalogo ANNCSU read-only aggiornabile più mapping esplicito alle Street esistenti, senza import diretto nelle entità operative, rinomine automatiche o modifica dei riferimenti dei Contatti. L'implementazione resta sospesa in attesa di approvazione e delle decisioni su tenant, omonimi/località e civici non standard.

## 2026-09-16 — Import catastale, date intervista e riordino GitHub

**Correzioni:** il parser gratuito AdE riconosce anche i riferimenti nazionali con sezione catastale esplicita; il calendario applicativo è usato nelle interviste e permette il salto diretto di mese/anno; `Risposta` è controllata; gli spazi della scadenza incarico sono stati riequilibrati.

**Repository:** individuati cinque upload manuali con copie dei sorgenti nella radice. Il riordino conserva i file canonici e rimuove le copie fuori struttura senza riscrivere la cronologia remota.

**Verifica:** parser sui due formati ufficiali, calendario con salto anno, form intervista, vocabolario Zod e contratto migration.

## 2026-09-14 — Documenti catastali e comparabili

- Added the explicit unit-led flow for property data, ordinary report and planimetric elaboration, with private document handling.
- Added official cadastral-category selects, richer map Contact metadata and a separate OpenAPI Real Estate comparable-search boundary.

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

## 2026-09-14 — Governance costi e pannello edificio

**Modifiche:** costi previsti mostrati nel consenso; budget mensile e massimale per richiesta per operatore, verificati da trigger PostgreSQL prima di una nuova richiesta; storico richieste/documenti in Impostazioni operative e modifica limiti riservata al manager. Il popup mappa mantiene un marker per civico e mostra le unità/contatti censiti; le unità Catasto confrontano sheet/particella/subalterno per aprire il contatto già esistente oppure creare un nuovo contatto.

**Migration:** `202609140005_paid_service_governance.sql`.

## 2026-09-15 — Tipo di incarico e dimensioni statistiche

**Modifiche:** il Tipo di incarico usa i cinque valori approvati ed è salvato nei workflow di creazione/modifica, mostrato in scheda/elenco e filtrabile. Qualifica e Occupazione sono ora filtri espliciti; Ereditato resta disponibile. Le future statistiche contano immobili distinti e considerano vuoto soltanto `Libero`.

**Migration:** `202609150001_controlled_engagement_type.sql`.

## 2026-09-15 — Dashboard performance e scadenze incarichi

**Modifiche:** nuova dashboard filtrabile con KPI Notizie, stati ricontatto mutuamente esclusivi, andamento mensile, performance operatori, distribuzione zone, qualifiche, occupazione, immobili ereditati, funnel commerciale e code operative. Censimenti, prima Notizia, perizia e prima acquisizione sono attribuiti all'operatore autenticato; il backlog resta del responsabile corrente. Incarico altre agenzie e In esclusiva richiedono una data e alimentano la coda scadenze.

**Migration:** `202609150002_dashboard_event_attribution.sql`, `202609150003_engagement_expiry.sql`.

**Correzione deploy:** dopo l'aggiunta delle relazioni di attribuzione, l'embed PostgREST dell'operatore responsabile è stato qualificato tramite la FK esplicita per evitare l'ambiguità tra le cinque relazioni `census_records → operators`.

## 2026-09-15 — Correzione permesso, import catastale e calendario

**Modifiche:** il lookup autenticato dell'operatore è confinato nel trigger di audit senza esporre `auth_user_id`; Nuovo contatto importa foglio e particella dal picker GeoCensimento gratuito dopo la selezione del civico; nascita e scadenza incarico usano un calendario applicativo italiano con valore ISO.

**Migration:** `202609150004_dashboard_operator_audit_permission.sql`.

## 2026-09-16 — Elenco contatti adattivo e layout compatto

**Modifiche:** titoli pagina ridotti globalmente; filtri Contatti chiusi di default con riepilogo di risultati e filtri attivi. Su desktop/tablet l’elenco usa un’area di scorrimento interna con intestazione e prima colonna fisse; su mobile la tabella larga diventa una lista di schede senza scorrimento laterale.

**Verifica:** aggiunto uno scenario Playwright per filtri chiusi, tabella desktop e schede mobile.
## 2026-09-23 — Separazione consultazione e modifica Zone

**Modifiche:** l’elenco Zone espone “Apri” e “Modifica”. La consultazione mostra soltanto vie, civici e accesso ai contatti; la nuova route di modifica gestisce associazione/creazione vie, rinomina e inserimento civici senza selezionare automaticamente la prima via.

**Migration:** `202609230001_zone_street_editing.sql` aggiunge la rinomina autenticata e vincolata alla relazione Zona–Via e al Comune.
## 2026-09-24 — Chiarezza aggiunta Vie alla Zona

**Modifiche:** il selettore per associare una Via già registrata nello stesso Comune è visibile solo quando contiene candidati reali e usa un’etichetta esplicita. Quando non esistono Vie disponibili, la gestione mostra soltanto “Aggiungi nuova via” senza un’alternativa vuota.

## 2026-09-24 — Anagrafica prima e gestione multiproprietà

**Modifiche:** Nuovo contatto parte dalla ricerca dell’anagrafica, mostra esiti vuoti/errori e apre la creazione solo su scelta esplicita. La ricerca è indipendente dall’ordine nome/cognome e restituisce conteggio e anteprima degli immobili collegati. Elenco Contatti ricerca anche comproprietari/soggetti secondari e mantiene un risultato per immobile; la scheda mostra il portafoglio completo incluso il contesto corrente.

**Migration:** `202609240001_subject_multi_property_search.sql` aggiunge la proiezione di ricerca generata e indicizzata.

**Verifica:** lint, typecheck, 205 test Vitest e build production superati; 22 scenari Playwright hanno completato il flusso applicativo previsto.

## 2026-09-24 — Prima implementazione ANNCSU LAB (in verifica DB)

**Decisione:** approvazione architetturale DEC-050–055 e autorizzazione al primo milestone. Migration breaking `202609240002`–`004`: Street ufficiale/manuale, AddressAccess ufficiale/manuale, Locality, run/issues/revisioni, osservazioni EPSG:6706, selezione posizione, riconciliazione, Zone/Complex/Record su Access. Seed demo territoriale eliminato. La chiave tenant reale e il RBAC responsabile/master non sono inventati.

**Import:** parser ZIP/CSV offline e sync Toscana transazionale con SHA-256, gate Comuni/relazioni/cardinalità, upsert idempotente e quarantena coordinate. `npm run anncsu:sync` ha validato 87.147 vie, 1.901.458 accessi, 273 Comuni, 1.555.651 coordinate, 345.807 accessi senza coordinate, 10.965 vie senza accessi e 4 posizioni in quarantena secondo il gate conservativo LAB. SHA Stradario `2c4978b2636f44b16efb400eab16f6b189a94ba78c1e9da77d1016744489dccd`; SHA Indirizzario `8c755d866901adf3a53b4395595f8a9c9bbf4ffaea8077be57b8fbee16337291`.

**UX:** Zona con ricerca selettiva vie ufficiali e accessi indipendenti dai contatti; eccezioni manuali motivate. Form Contatto mantiene un adattatore di etichetta `civicId` ma salva l'UUID AddressAccess e ricerca accessi on demand. GeoCensimento database-mode mostra la fondazione territoriale senza fingere marker derivati dai record; mappa demo read-only invariata.

**Verifica locale:** lint, typecheck, 215 test Vitest, trasformazione EPSG:6706 → EPSG:3857 nel browser e build superati. Il tentativo Playwright mirato non ha prodotto un esito conclusivo perché il server dev non ha terminato la sessione. Migration, import persistito, verifica numerica PostGIS, RLS e UI con Supabase non eseguiti: nessuna connessione `ANNCSU_DATABASE_URL`, CLI PostgreSQL/Docker/Supabase o `NEXT_PUBLIC_SUPABASE_URL` disponibile nella sessione. Non dichiarare milestone completo prima di un test dedicato LAB.

## 2026-09-24/25 — Import ANNCSU reale limitato a Lucca

**Target e migration:** connessione verificata sul progetto Supabase LAB `fomluksjubzimkfnzouf`. Readback delle migration ANNCSU `002`–`004` già applicate: 10 tabelle, PostGIS 3.3.7, FK/CHECK/indici, funzioni/trigger e RLS presenti; nessuna riesecuzione del reset breaking. L'archivio ISTAT contiene 7.894 Comuni, 273 in Toscana e 33 nella Provincia `046` (Lucca).

**Tentativo regionale e capacità:** la transazione Toscana completa ha perso la connessione dopo circa 22 minuti e un picco osservato di 837 MB; il database ha temporaneamente risposto `57P03`. Rollback confermato (0 Street/Access); due run audit chiusi `FAILED`. Dopo verifica delle tabelle vuote, `VACUUM FULL` mirato ha ridotto l'allocazione database da circa 427 MB a 24 MB. Il piano Free documentato da Supabase limita il database a 500 MB; nessun secondo tentativo regionale.

**Lucca:** aggiunto filtro esplicito `--province 046` con scope audit `PROVINCE:046`, SHA degli ZIP originali, disattivazione limitata alla provincia, guard che vieta apply senza provincia nel LAB e timeout di sessione per il carico. Import `APPLIED` della release 2026-09-15: 10.426 Street, 250.604 AddressAccess, 33 Comuni, 287 Locality, 1.464 vie a zero accessi, 215.888 punti validi, 3 coordinate in quarantena e 34.713 accessi senza coordinate. Database circa 341 MB; secondo apply con stessa coppia SHA: no-op. Lo `finished_at=now()` originale non misura la durata reale nella transazione; corretto a `clock_timestamp()` per i run futuri. Nessuna migration nuova.

**Validazione:** SQL live Lucca superato; zero ID ufficiali duplicati, zero accessi orfani o fuori provincia, zero discrepanze TOTALE_ACCESSI e numerazioni strutturate/revisioni. Le quarantene persistite sono `35060626`, `32370051`, `20925024` (Camaiore); il quarto punto del gate regionale `24301081` è a Gaiole in Chianti, Siena, fuori scope Lucca. Regressione PostGIS EPSG:6706→3857 superata; punti reali con metodi ANNCSU 1–5 differiscono dalla trasformazione browser al massimo di `5.6e-9` m.

**Flussi:** Zona test Bagni di Lucca con due omonime VIA CHIESA distinte per Locality: 137 accessi ufficiali, tutti visibili senza CensusRecord; filtro LUGLIANO e rilettura della Zona verificati. Aggiunte una Street e un AddressAccess MANUAL motivati, `PROPOSED`, autore/data e scope tenant-operational, senza ID ANNCSU; Zona finale tre vie/138 accessi. Stessa Street associabile a due Zone in prova transazionale annullata. RLS/grant anon/authenticated e guard Comune↔Zona verificati. EXPLAIN ANALYZE: ricerca Street 1.383 ms, Locality 0.870 ms, vie Zona 0.108 ms, conteggi 5.709 ms, pagina 100 accessi 5.219 ms sul LAB; indici territoriali in uso.

**Stato test:** lint, strict TypeScript, 216 Vitest, SQL live Lucca e build production superati dopo il filtro provincia. Playwright headless su build reale ha confermato il redirect della Zona protetta a `/login`; il percorso UI autenticato resta non eseguito perché manca la password Supabase Auth dell'utente LAB (non la password PostgreSQL). Non dichiarare UI verificata finché non eseguito.

## 2026-09-25 — ANNCSU Territorial Foundation completata

**Playwright autenticato:** verifica eseguita sulla deployment `area-geocensimento-lab.vercel.app` tramite sessione Chrome autenticata al progetto Supabase LAB. Il banner applicativo identifica l'operatore `Elena Rossi`; il percorso `/login` redirige alla dashboard autenticata e non presenta errori console.

**UI verificata:** Gestione Zone, apertura e modifica della Zona `ANNCSU LAB Bagni di Lucca 2026-09-25`, ricerca Street ANNCSU per odonimo, filtro Locality, selezione e associazione di una Street ufficiale (`CORSO UMBERTO`, `CASOLI`, 9 accessi), persistenza e riapertura della Zona. La Zona è stata riletta con 4 vie e 147 accessi, inclusa l'eccezione MANUAL motivata `VIA TEST ANNCSU NON PRESENTE` in revisione.

**GeoCensimento:** la base territoriale mostra 4 vie, 147 AddressAccess, 146 con posizione e 1 senza posizione; gli accessi sono visualizzati con zero CensusRecord e con origine `OFFICIAL_ANNCSU`/ANNCSU. Nessun bug UI o funzionale riconducibile al milestone è stato trovato; nessuna modifica applicativa o import è stata eseguita.

**Esito:** milestone `ANNCSU Territorial Foundation` completato. La verifica è stata eseguita sulla sessione autenticata già presente nel browser; non è stata modificata alcuna credenziale.
