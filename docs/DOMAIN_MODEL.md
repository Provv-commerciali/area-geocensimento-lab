# Domain model

## Territory

`Country → Region → Province → Municipality → CensusZone`. `Province` represents the ISTAT unità territoriale sovracomunale valida a fini statistici, including Province, Province autonome, Città metropolitane, Liberi consorzi and the statistical ex Province of Friuli-Venezia Giulia. Italian regions, intermediate units and municipalities carry stable official ISTAT codes, source release metadata and an active flag. NUTS3 is a separate one-to-many code relation because its boundaries are not always identical to the current ISTAT intermediate units. `CensusZone` stores only `municipality_id`: Region and Province are derived through real FKs rather than duplicated text. `CensusZone ↔ Street` uses `CensusZoneStreet`; `Street → Civic`, where `Civic.number` and optional free-text `Civic.extension` are distinct. A Street is the shared municipality identity: renaming it from an associated Zone updates that Street for every Zone and Contact that references it, while the authenticated command verifies the selected Zone association and municipality before writing.

## Subjects and census contexts

`Subject` is the unique registry entity. It is either `PRIVATO`, with personal name fields and optional tax code, or `AZIENDA`, with company name and optional VAT/tax identifiers. Normalized tax code and VAT number are strong duplicate signals and database uniqueness keys. Names and company names never trigger automatic merging.

`Subject.search_text` is a generated persistence-only search projection over names and strong identifiers. It supports bounded, on-demand registry lookup and is never authoritative domain state.

`CensusRecord` is exposed operationally as a Census Contact: one private person or company in one property/civic context, with its own contact classification and interview history. It references a zone, street, civic, optional complex and responsible operator. `CensusRecordSubject` implements the internal many-to-many registry relationship and carries the role `Proprietario`, `Comproprietario` or `Inquilino`; migrated legacy links may temporarily be `Non specificato` rather than inventing historical meaning. Therefore one registry subject may span different streets, zones and municipalities, and one context may have several related people or companies.

`CensusRecord.engagementType` is a controlled commercial outcome distinct from contact classification: `Nessuno`, `Incarico altre agenzie`, `In esclusiva`, `Verbale` or `Non esclusivo`. The last three identify an assignment held by the LAB agency; `Incarico altre agenzie` identifies competition already assigned elsewhere. Changing this field does not rewrite the original `Generico`, `Informatore`, `Informazione` or `Notizia` classification. `Incarico altre agenzie` and `In esclusiva` require `engagementExpiresOn`; every other value forbids it.

The creation-form cadastral selection remains draft input, not a new entity: the free WMS/GetFeatureInfo result may populate only `sheet` and `parcel`. A persistent `CadastralAssociation` still requires an existing CensusRecord and explicit confirmation.

Dashboard event attribution is explicit and immutable from ordinary UI intent: the authenticated Operator is captured when a CensusRecord is created, first becomes a Notizia, is marked appraised or first enters an agency-held engagement. Existing rows are not backfilled from their current responsible operator because that would invent history. Current overdue/expiry workload is attributed to `responsibleOperatorId`; monthly production uses the captured event actor and timestamp.

Legacy person columns remain on `census_records` only to preserve already-loaded LAB data and are no longer authoritative for new writes. Whole-building levels are distinct from the partial-building `floor_code`, `total_floors` and `is_top_floor` fields; `floor_label` remains only as backward-compatible legacy display data.

`Subject N ↔ N CensusRecord` is traversed internally in both directions. In the UX this appears inside the Contact sheet as “Altri immobili / contesti collegati”; there is no autonomous Subjects macro-area in Milestone 1. `CensusRecord 1 → N CensusInterview` preserves context-specific history: interviews never move to or become shared through the registry subject. A record starts with zero interviews; latest interview, next recall and “Non ancora contattato” remain derived from actual children.

New `CensusInterview.response` values are controlled as `Risposto` or `Nessuna risposta`. Historical free text is preserved and is not silently reclassified.

Editing a Contact is one atomic command over its primary `Subject`, `CensusRecord` and primary `CensusRecordSubject` relationship. Subject identity changes therefore remain shared registry changes, while address/property/operational changes remain scoped to the selected record. The command does not create, alter or synthesize interviews.

Deleting a Contact deletes the selected `CensusRecord` context after explicit operator confirmation. FK-owned interview, subject-link and cadastral-association children follow their declared lifecycle; the normalized `Subject` is intentionally retained because it may be shared by other contexts and remains a distinct registry entity.

`Complex ↔ Civic` is many-to-many through `complex_civics`; creation may attach the first selected civic but does not designate a “primary” civic.

`CensusRecord.staircase` and `CensusRecord.unitIdentifier` are optional operator-entered Scala and Interno labels inside the existing property/civic context. They do not create a `PropertyUnit`, are not ownership evidence and are not globally unique. Several Subjects may intentionally have separate CensusRecords carrying the same Scala/Interno/Piano context.

## Complex photos and doorbell acquisition

`ComplexPhoto` belongs to one Complex and is either `COMPLEX` or `DOORBELL`. The private Storage object has metadata, an opaque path and upload audit. A building photo is documentation only and never triggers OCR. A doorbell photo may join an `AcquisitionSession`, have explicit processing attempts and produce immutable detections. `UPLOADED`, `PROCESSING`, `PROCESSED`, `NEEDS_REVIEW` and `FAILED` are technical photo states, not contact states.

`DoorbellContactProposal` is editable staging linked through `DoorbellProposalSource` to one or more OCR detections. Merge and split operate only on proposals and preserve sources. `PERSON`, `COMPANY` and `UNKNOWN` are recognition proposals; only operator-confirmed `PRIVATO` or `AZIENDA` enters the existing Subject domain. A name alone is only a possible match and never causes an automatic Subject merge.

Photo ≠ proposal ≠ Contact. Final confirmation atomically calls the normal `create_census_record_lab` workflow for every selected proposal and records the resulting `census_record_id`. No `CensusInterview` is created; each result remains `MAI_CONTATTATO` until a real interview. A doorbell name never implies Proprietario: the operator chooses the existing Qualifica, including Inquilino when appropriate.

## GeoCensimento civic location

`Civic` optionally owns one cached `geography(Point, 4326)` plus source, method, timestamp, optional 0–1 quality and the explicit state `NOT_GEOLOCATED`, `AUTO_GEOLOCATED` or `VERIFIED`. `GEOCODER` may only produce an automatic candidate; only an explicit operator confirmation with `MANUAL_MAP` or `CADASTRAL` may produce `VERIFIED`. Contacts and Subjects never store duplicate coordinates. Several contacts at one civic reuse the same point and become one civic feature; automatic features remain visibly uncertain and verified features have priority.

`CadastralAssociation` belongs one-to-one to a `CensusRecord`, because a parcel selection describes the property/census context rather than a person and is distinct from the civic point. It stores only attributes actually returned and explicitly confirmed from the free AdE WMS: cadastral municipality code/name, optional section, sheet, parcel, optional feature type, source/layer, query reference and verification audit. Confirmation synchronizes the existing canonical `CensusRecord.sheet` and `parcel`; it never invents or overwrites unavailable subaltern, category, ownership or visura data. A later paid enrichment must extend this association rather than create a parallel identity.

Map operational status is not new domain state. Each associated record is passed to `deriveCensusOperationalStatus`; a mixed civic/cluster uses the same precedence (`RICONTATTO_SCADUTO`, `NOTIZIA_NON_AGGIORNATA`, `MAI_CONTATTATO`, `ORDINARIO`) for its primary color. A purple ring is only a secondary Complex indicator.

## Derived operational status

Operational state is a projection of one `CensusRecord`, its real `CensusInterview` children, the persisted `stale_news_days` setting and an explicit Europe/Rome civil date. It is never stored on the contact. `deriveCensusOperationalStatus` is the shared domain function for lists, detail views and a future map consumer.

The precedence is `RICONTATTO_SCADUTO` → `NOTIZIA_NON_AGGIORNATA` → `MAI_CONTATTATO` → `ORDINARIO`. The booleans remain independent so that a stale Notizia with an overdue recall exposes both facts while presenting the recall as its primary state. “Mai contattato” means exactly zero real interview children. Days since last contact use the most recent interview date, never record timestamps or technical events.

A recall is overdue when its date is before today and there is no different interview dated on or after that recall date. An interview on the scheduled date therefore fulfils it. When several recalls remain unfulfilled, the oldest controls overdue days. A Notizia is stale only when it has an interview and its age is strictly greater than the configured threshold. The LAB default is 30 days and is editable; it is not embedded in the derivation.

Dashboard Notizia management is a separate mutually exclusive projection over the earliest unfulfilled recall: before today is `SCADUTA`; today through seven days inclusive is `IN_SCADENZA`; later than seven days is `GESTITA_CORRETTAMENTE`; no unfulfilled recall is `SENZA_RICONTATTO`.

## Important invariants

- `is_appraised` defaults false and is never derived from contact type.
- Active Italian territory is imported from the persisted official ISTAT/SITUAS archive, never from demo lists or live form-time network calls.
- Street membership is explicit and not permanently exclusive to a zone.
- A complex may span multiple civics and extensions.
- A census record is not automatically a `PropertyUnit`.
- A subject is not a census record and is never merged by name alone.
- Strong CF/P.IVA matches prompt reuse of the existing subject.
- One subject can link to many property contexts and one context to many subjects.
- Qualification statistics count distinct CensusRecords matching at least one relationship role, so co-ownership never duplicates the property count. `Libero` is the exact occupancy value used for vacant-property statistics; `Libero al rogito` remains separate.
- A CensusRecord creation cannot create a CensusInterview.
- Operational flags and day counts are derived, never persisted on `census_records`.
- Streets are unique by municipality plus normalized name; civics by street plus normalized number/extension.
- Record duplicate protection prevents the same subject from being linked twice to the same location, building scope, floor and subaltern; subject uniqueness remains governed separately by strong identifiers.
- A cadastral WMS feature is external cartography and never creates a CensusRecord, property, subject or ownership link.
- A map click is an external preview. Only the separate confirmation command creates or corrects a CadastralAssociation.
- Complex/doorbell images are private personal-data-bearing artifacts; neither image nor OCR text becomes authoritative Subject data without operator confirmation.
- OCR confidence may guide review but never blocks correction or creates/merges a Contact automatically.

## Future boundary (documentation only)

```text
CENSIMENTO ↔ CADASTRAL IDENTITY ↔ CADASTRAL CARTOGRAPHY
```

A future milestone may enrich the current minimal `CadastralAssociation` with provider-backed identity or geometry. Manual census data is not assumed to be the sole authoritative cadastral source, and a parcel is not assumed to represent one unit.

## Paid cadastral enrichment

`CadastralAssociation` remains the cadastral identity anchor. `CadastralRequest` is the cost/cache/audit aggregate: operation, canonical parameters and hash, provider request ID, requester, timestamps, status, structured result and optional estimated/known cost. One partial unique index admits at most one active equal provider operation. A completed equal request is reused until an operator explicitly chooses “Aggiorna dati”.

`CadastralPropertyUnit` is a provider-backed unit returned for a parcel and stores only available subaltern, address, zone, category, class, consistency, income, registry lot and provider property ID. It may be related to a CensusRecord but does not replace it. A CensusRecord retains its existing unit fields and may explicitly import a provider snapshot, preserving source request and acquisition time. `CadastralOwnershipRight` relates a unit to one returned holder and losslessly retains provider right/share strings, acquisition source/date and optional link to the existing Subject. Multiple rights per unit are expected. Strong CF/P.IVA can propose an existing Subject; no automatic merge occurs. `CadastralDocument` references an ordinary report in private Storage; it is never public.

`CensusRecordPhoto` is a private JPG/PNG/WebP photograph of a Contact context. It is optional, size-limited and stored in the private `contact-photos` bucket; a primary signed URL may be projected into GeoCensimento. Sandbox Catasto responses are demonstrative and are never importable into a Contact.

`RealEstateComparableRequest` is an auditable, cached OpenAPI Real Estate search associated with one Contact and its civic coordinate. It stores only the explicit search parameters and returned market listings; it never overwrites Contact or cadastral data.

An OpenAPI holder is not an interview and never creates one. An imported holder enters only through the canonical Contact workflow. Non-ownership rights such as usufruct are not falsely normalized into `Proprietario`; the original provider value remains authoritative for the enrichment.

`Operator` owns paid-service governance in addition to its explicit access grant: a monthly budget, a per-request ceiling and a separate manager permission. `CadastralRequest.estimated_cost` is the configured price at creation; it is used to reserve the operator budget before the provider call. Completed, active requests count in the calendar-month total, while cached requests create no new spend. `known_cost`, when a provider contract exposes it, supersedes the estimate for reporting.

One map marker remains one `Civic` projection. The marker's building panel lists every CensusRecord already associated with that civic; Catasto property units are matched only when sheet, parcel and subaltern all agree. A match opens the existing Contact; an unmatched Catasto unit can enter the normal New Contact workflow. No automatic CensusRecord or unit merge is introduced.
