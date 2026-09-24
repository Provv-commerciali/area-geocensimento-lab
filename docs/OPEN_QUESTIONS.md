# Open questions

- **TBD-CENSUS-002** — Exact fields behind “Mostra ricerca per storico”. Interview history is persisted; no invented advanced filters.
- **TBD-CENSUS-003** — Exact semantics of “In valutazione”, “Altre agenzie” and “Esclusive”. UI marks aggregates as demo/TBD.
- **TBD-CENSUS-004** — Complete meaning of actions/icons in the historic contact table.
- **TBD-CENSUS-005** — Complete semantics and validation rules for special civic extension values. It remains flexible text.
- **TBD-CENSUS-006** — Exact semantics and lifecycle of “Probabile Incarico”. “Tipo di Incarico”, its required expiries and first acquisition attribution are now controlled by DEC-045/046.
- **TBD-CENSUS-007** — Final response vocabulary. Cadastral categories now use the official Catasto Fabbricati selection.
- **TBD-CENSUS-008** — Whether operators must manually record legal ownership shares on the Subject–CensusRecord relationship. Current census roles express Proprietario/Comproprietario/Inquilino only; provider-returned rights and shares remain lossless Catasto enrichment and are not silently promoted to census ownership data.
- **TBD-MAP-001** — Production basemap capacity/provider and service-level requirements; OSM Standard is LAB-only.
- **TBD-MAP-003** — Authoritative geometry model for a Complex spanning several civics/extensions. Milestone 2 indicates a Complex through its associated civic features.
- **TBD-MAP-004** — Reliable official WFS availability. The endpoint tested on 2026-09-11 returned Access Denied, so no WFS capability is claimed.
- **TBD-MAP-006** — Whether a future paid provider supplies stable parcel geometry/identity and which licensed fields it may enrich. It must extend the confirmed association and cannot infer ownership.
- **TBD-OCR-001** — Final location, capacity, synchronous/queued mode, retry lease and service-level requirements for the separate free/self-hosted PaddleOCR service.
- **TBD-OCR-002** — Final privacy retention duration for photos, raw text and detections. Until approved, deletion is operator-driven; provenance metadata remains while the blob is removed.
- **TBD-OCR-003** — Whether Scala/Interno later normalize into an approved property-unit model. Milestone 3 keeps optional CensusRecord labels and infers no unit identity.
- **TBD-CATASTO-001** — Contract-specific OpenAPI prices and whether they can be obtained from an authoritative account endpoint. The LAB currently shows the configured 2026 list-price estimate; a manager must align it with the actual account contract before production.
- **TBD-CATASTO-002** — Business-approved freshness duration per paid operation. Until approved, completed equal data is reused indefinitely and only the explicit “Aggiorna dati” action creates a new request.
- **TBD-CATASTO-003** — Final operational process for granting `can_use_paid_cadastral_services` to LAB operators. The database defaults to denied and no self-service role system is invented.

The ANNCSU architectural questions `TBD-ANNCSU-001`, `004`, `006` and `007` are closed by DEC-051 through DEC-055. The physical production tenant/RLS and definitive RBAC bindings remain deferred integration contracts, not open domain decisions.

The first LAB milestone still requires an accessible dedicated LAB PostgreSQL/PostGIS target for migration, transactional import and SQL/RLS integration tests. This is an execution blocker, not an unresolved domain decision. Do not apply the breaking migration to any unverified or production database.
