# Domain model

## Territory

`Country → Region → Province → Municipality → CensusZone`. `Province` represents the ISTAT unità territoriale sovracomunale valida a fini statistici, including Province, Province autonome, Città metropolitane, Liberi consorzi and the statistical ex Province of Friuli-Venezia Giulia. Italian regions, intermediate units and municipalities carry stable official ISTAT codes, source release metadata and an active flag. NUTS3 is a separate one-to-many code relation because its boundaries are not always identical to the current ISTAT intermediate units. `CensusZone` stores only `municipality_id`: Region and Province are derived through real FKs rather than duplicated text. `CensusZone ↔ Street` uses `CensusZoneStreet`; `Street → Civic`, where `Civic.number` and optional free-text `Civic.extension` are distinct.

## Subjects and census contexts

`Subject` is the unique registry entity. It is either `PRIVATO`, with personal name fields and optional tax code, or `AZIENDA`, with company name and optional VAT/tax identifiers. Normalized tax code and VAT number are strong duplicate signals and database uniqueness keys. Names and company names never trigger automatic merging.

`Subject.search_text` is a generated persistence-only search projection over names and strong identifiers. It supports bounded, on-demand registry lookup and is never authoritative domain state.

`CensusRecord` is exposed operationally as a Census Contact: one private person or company in one property/civic context, with its own contact classification and interview history. It references a zone, street, civic, optional complex and responsible operator. `CensusRecordSubject` implements the internal many-to-many registry relationship and carries the role `Proprietario`, `Comproprietario` or `Inquilino`; migrated legacy links may temporarily be `Non specificato` rather than inventing historical meaning. Therefore one registry subject may span different streets, zones and municipalities, and one context may have several related people or companies.

Legacy person columns remain on `census_records` only to preserve already-loaded LAB data and are no longer authoritative for new writes. Whole-building levels are distinct from the partial-building `floor_code`, `total_floors` and `is_top_floor` fields; `floor_label` remains only as backward-compatible legacy display data.

`Subject N ↔ N CensusRecord` is traversed internally in both directions. In the UX this appears inside the Contact sheet as “Altri immobili / contesti collegati”; there is no autonomous Subjects macro-area in Milestone 1. `CensusRecord 1 → N CensusInterview` preserves context-specific history: interviews never move to or become shared through the registry subject. A record starts with zero interviews; latest interview, next recall and “Non ancora contattato” remain derived from actual children.

`Complex ↔ Civic` is many-to-many through `complex_civics`; creation may attach the first selected civic but does not designate a “primary” civic.

## GeoCensimento civic location

`Civic` optionally owns one cached `geography(Point, 4326)` plus source, method, timestamp, optional 0–1 quality and the explicit state `NOT_GEOLOCATED`, `AUTO_GEOLOCATED` or `VERIFIED`. `GEOCODER` may only produce an automatic candidate; only an explicit operator confirmation with `MANUAL_MAP` or `CADASTRAL` may produce `VERIFIED`. Contacts and Subjects never store duplicate coordinates. Several contacts at one civic reuse the same point and become one civic feature; automatic features remain visibly uncertain and verified features have priority.

`CadastralAssociation` belongs one-to-one to a `CensusRecord`, because a parcel selection describes the property/census context rather than a person and is distinct from the civic point. It stores only attributes actually returned and explicitly confirmed from the free AdE WMS: cadastral municipality code/name, optional section, sheet, parcel, optional feature type, source/layer, query reference and verification audit. Confirmation synchronizes the existing canonical `CensusRecord.sheet` and `parcel`; it never invents or overwrites unavailable subaltern, category, ownership or visura data. A later paid enrichment must extend this association rather than create a parallel identity.

Map operational status is not new domain state. Each associated record is passed to `deriveCensusOperationalStatus`; a mixed civic/cluster uses the same precedence (`RICONTATTO_SCADUTO`, `NOTIZIA_NON_AGGIORNATA`, `MAI_CONTATTATO`, `ORDINARIO`) for its primary color. A purple ring is only a secondary Complex indicator.

## Derived operational status

Operational state is a projection of one `CensusRecord`, its real `CensusInterview` children, the persisted `stale_news_days` setting and an explicit Europe/Rome civil date. It is never stored on the contact. `deriveCensusOperationalStatus` is the shared domain function for lists, detail views and a future map consumer.

The precedence is `RICONTATTO_SCADUTO` → `NOTIZIA_NON_AGGIORNATA` → `MAI_CONTATTATO` → `ORDINARIO`. The booleans remain independent so that a stale Notizia with an overdue recall exposes both facts while presenting the recall as its primary state. “Mai contattato” means exactly zero real interview children. Days since last contact use the most recent interview date, never record timestamps or technical events.

A recall is overdue when its date is before today and there is no different interview dated on or after that recall date. An interview on the scheduled date therefore fulfils it. When several recalls remain unfulfilled, the oldest controls overdue days. A Notizia is stale only when it has an interview and its age is strictly greater than the configured threshold. The LAB default is 30 days and is editable; it is not embedded in the derivation.

## Important invariants

- `is_appraised` defaults false and is never derived from contact type.
- Active Italian territory is imported from the persisted official ISTAT/SITUAS archive, never from demo lists or live form-time network calls.
- Street membership is explicit and not permanently exclusive to a zone.
- A complex may span multiple civics and extensions.
- A census record is not automatically a `PropertyUnit`.
- A subject is not a census record and is never merged by name alone.
- Strong CF/P.IVA matches prompt reuse of the existing subject.
- One subject can link to many property contexts and one context to many subjects.
- A CensusRecord creation cannot create a CensusInterview.
- Operational flags and day counts are derived, never persisted on `census_records`.
- Streets are unique by municipality plus normalized name; civics by street plus normalized number/extension.
- Record duplicate protection prevents the same subject from being linked twice to the same location, building scope, floor and subaltern; subject uniqueness remains governed separately by strong identifiers.
- A cadastral WMS feature is external cartography and never creates a CensusRecord, property, subject or ownership link.
- A map click is an external preview. Only the separate confirmation command creates or corrects a CadastralAssociation.

## Future boundary (documentation only)

```text
CENSIMENTO ↔ CADASTRAL IDENTITY ↔ CADASTRAL CARTOGRAPHY
```

A future milestone may enrich the current minimal `CadastralAssociation` with provider-backed identity or geometry. Manual census data is not assumed to be the sole authoritative cadastral source, and a parcel is not assumed to represent one unit.
