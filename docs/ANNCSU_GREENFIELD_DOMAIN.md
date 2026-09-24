# ANNCSU — Greenfield territorial domain model for A.R.E.A.

**Status:** approved architecture; first LAB implementation milestone authorized
**Date:** 2026-09-24
**Scope:** target production model for Censimento and GeoCensimento; LAB implementation and production binding are tracked separately

## 1. Executive summary

The recommended greenfield model has one territorial domain, not an ANNCSU catalog mapped to a duplicate A.R.E.A. street domain.

- `Street` is the canonical circulation-area entity. It represents either an official ANNCSU circulation area (`OFFICIAL_ANNCSU`) or an explicit operational exception (`MANUAL`).
- An official Street's authoritative business identity is `PROGRESSIVO_NAZIONALE`. Its UUID is only an internal relational key.
- Distinct ANNCSU progressives always remain distinct Streets, even with identical Municipality, odonym and locality.
- `AddressAccess` replaces `Civic` as the primary domain concept. It represents a physical external access and preserves every ANNCSU address field losslessly.
- An official AddressAccess's authoritative business identity is `PROGRESSIVO_ACCESSO`.
- Zone membership remains operational and many-to-many: `CensusZone ↔ Street`.
- ANNCSU official Streets and AddressAccesses are shared global reference data. Zones, manual exceptions, Complexes, CensusRecords, operator corrections and location choices are tenant operational data.
- `LOCALITA'` uses a hybrid model: the exact source value remains on Street, while a normalized `Locality` grouping supports navigation, filtering and search. The grouping is not an official ANNCSU identity.
- Coordinates are observations with provenance, not a mutable field on AddressAccess. A tenant-specific effective-location choice can preserve a manually verified correction across ANNCSU updates.
- Current demo Streets, Civics and Contacts do not constrain the design. A breaking LAB migration and regenerated seed are preferable after this model is approved.

No second operational Street or Civic is created for official ANNCSU data.

## 2. Decisions incorporated

The model incorporates the approved directions as follows:

1. ANNCSU is authoritative for Italian circulation areas and external accesses present in ANNCSU.
2. `PROGRESSIVO_NAZIONALE` identifies an official circulation area; name is never identity.
3. Locality is explicit, nullable and searchable, but never part of authoritative identity.
4. Different progressives remain different entities regardless of equal odonym/locality.
5. Zones remain A.R.E.A. operational entities and associate canonical Streets.
6. `MANUAL` is an explicit fallback within the same Street and AddressAccess domains.
7. `PROGRESSIVO_ACCESSO` identifies an official physical external access.
8. The access model retains CIVICO, ESPONENTE, SPECIFICITA, METRICO, PROGRESSIVO_SNC, coordinates, quota and method.
9. ANNCSU coordinates are a primary available source, not unquestionable truth.
10. Global reference data is imported once; tenant data stores only operational use and corrections.
11. Monthly sync remains snapshot-based, idempotent, auditable and non-destructive.
12. Demo data may be discarded and regenerated during a later approved implementation.
13. The domain is tenant-ready, but the LAB does not invent A.R.E.A.'s definitive tenant identifier, FK path or RLS architecture.
14. Original ANNCSU ZIP/snapshot artifacts have configurable retention with a 12-month default; hashes, import audit, presence state and relevant structured revisions are permanent.
15. Every MANUAL exception is motivated, authored, dated, reviewable and logically tenant-owned; a later official match starts an explicit audited reconciliation and never an automatic merge.
16. GeoCensimento's territorial base is the set of AddressAccesses on Streets assigned to the agency's Zones, including accesses with no CensusRecord.

## 3. Proposed domain model

### 3.1 Core design

The model uses shared entities with source-specific invariants:

```text
Street.source_kind        = OFFICIAL_ANNCSU | MANUAL
AddressAccess.source_kind = OFFICIAL_ANNCSU | MANUAL
```

This is one domain because both variants participate in the same relationships:

- a Zone associates Streets;
- a Street owns AddressAccesses;
- a Complex links AddressAccesses;
- a CensusRecord references an AddressAccess;
- GeoCensimento projects AddressAccesses.

Source kind changes identity rules and ownership scope, not the entity's business role.

### 3.2 Why there is no separate `anncsu_streets` plus operational `streets`

With no legacy preservation requirement, a second operational Street would add indirection without adding business meaning. The canonical ANNCSU row already is the Street selected by a Zone. A mapping layer would be justified only if A.R.E.A. needed to aggregate, reinterpret or tenant-copy official streets; the approved decisions explicitly reject those behaviors.

The unified Street still separates global official rows from tenant manual rows through strict source invariants and RLS. It does not merge their ownership or provenance.

## 4. Textual relational diagram

```text
GLOBAL REFERENCE DATA

Municipality 1 ──────── N Locality
Municipality 1 ──────── N Street [OFFICIAL_ANNCSU]
Locality     0..1 ───── N Street
Street       1 ──────── N AddressAccess [OFFICIAL_ANNCSU]
Street       1 ──────── N StreetOfficialRevision
AddressAccess 1 ─────── N AccessOfficialRevision
AddressAccess 1 ─────── N AccessLocationObservation [ANNCSU]
AnncsuImportRun 1 ───── N imported/revised Street, AddressAccess, observations

TENANT OPERATIONAL DATA

TenantScope 1 ───────── N CensusZone
TenantScope 1 ───────── N Street [MANUAL]
TenantScope 1 ───────── N AddressAccess [MANUAL]
CensusZone  N ───────── N Street           through CensusZoneStreet
AddressAccess 1 ─────── N AccessLocationObservation [GEOCODER/OPERATOR]
TenantScope + AddressAccess 1 ─ 0..1 AccessLocationSelection
CensusZone  1 ───────── N Complex
Complex     N ───────── N AddressAccess    through ComplexAddressAccess
CensusZone  1 ───────── N CensusRecord
AddressAccess 1 ─────── N CensusRecord
Complex     0..1 ────── N CensusRecord
Subject     N ───────── N CensusRecord     through CensusRecordSubject
CensusRecord 1 ──────── N CensusInterview
```

`TenantScope` is a logical boundary only. Its real table/key is not defined in the current LAB and must not be invented by the ANNCSU migration. This closes the architectural decision: the boundary is mandatory, while its physical production binding is explicitly deferred until A.R.E.A.'s real multi-tenant model is available.

## 5. Entity schema

### 5.1 Municipality

| Property | Proposal |
|---|---|
| Responsibility | Authoritative administrative parent for Localities, Streets and Zones. |
| PK | Internal UUID, as today. |
| Official identifiers | `istat_code` UNIQUE; `cadastral_code` additionally validated against ANNCSU `CODICE_COMUNE`. |
| FKs | Province/territorial unit. |
| Cardinality | One Municipality to many Localities, Streets and CensusZones. |
| Important nullable fields | `cadastral_code` may remain nullable only for incomplete reference data; ANNCSU import for that Municipality must then stop/quarantine. |
| Provenance | ISTAT/SITUAS source, release and active state. |
| Scope | Global reference data. |

ANNCSU import resolves Municipality by `CODICE_ISTAT` and requires `CODICE_COMUNE` to agree when both are populated. It never resolves a Municipality by name.

### 5.2 Locality

| Property | Proposal |
|---|---|
| Responsibility | Search/navigation grouping for an ANNCSU locality label inside one Municipality. It is not an authoritative territorial identity. |
| PK | Internal UUID. |
| Official identifiers | None: the open data provides no locality identifier. |
| FKs | `municipality_id` required. |
| Cardinality | Municipality 1:N Locality; Locality 1:N Street; Street has 0..1 normalized grouping. |
| UNIQUE | `(municipality_id, normalized_name)` for global derived groupings. |
| Important nullable fields | Geometry is absent/null; no boundary is inferred. |
| Provenance | `ANNCSU_DERIVED_LABEL`; first/last-seen run; source spellings may be retained as aliases. |
| Scope | Global derived reference data. A tenant-only manual label does not become a global Locality automatically. |

### 5.3 Street / Circulation Area

| Property | Proposal |
|---|---|
| Responsibility | Canonical circulation area selected by Zones and parent of external accesses. |
| PK | Internal UUID used by FKs. |
| Official identifier | `anncsu_progressivo_nazionale` for `OFFICIAL_ANNCSU`; immutable and globally UNIQUE. |
| FKs | Municipality required; Locality nullable; first/last ANNCSU import run for official rows; logical tenant ownership for manual rows. |
| Cardinality | Municipality 1:N Street; Street N:M Zone; Street 1:N AddressAccess. |
| UNIQUE | Partial UNIQUE on non-null `anncsu_progressivo_nazionale`. No uniqueness by odonym/locality. Manual identity is UUID plus tenant scope, not name. |
| Important nullable fields | `locality_id`, exact `locality_name`, municipal code and language variants. ANNCSU progressive is null only for MANUAL. |
| Provenance | `source_kind`, import runs for official rows; reason, author, creation time, review state and lifecycle audit for manual rows. |
| Scope | Official rows global; manual rows tenant operational. |

Official attributes include the exact current ANNCSU odonym, exact locality label, municipal odonym code, language variants, access total, first/last seen and current-snapshot presence.

Required checks:

```text
OFFICIAL_ANNCSU ⇒ anncsu_progressivo_nazionale IS NOT NULL
OFFICIAL_ANNCSU ⇒ official import provenance IS NOT NULL
OFFICIAL_ANNCSU ⇒ tenant ownership IS NULL
MANUAL          ⇒ anncsu_progressivo_nazionale IS NULL
MANUAL          ⇒ logical tenant ownership, reason, author, creation time and review state ARE NOT NULL
```

An official Street cannot be renamed by ordinary application CRUD. Monthly sync may update its odonym under the same progressive. A manual Street may be renamed under tenant permissions.

### 5.4 AddressAccess

| Property | Proposal |
|---|---|
| Responsibility | Physical external access from a circulation area; primary address-location entity. |
| PK | Internal UUID used by FKs. |
| Official identifier | `anncsu_progressivo_accesso` for `OFFICIAL_ANNCSU`; immutable and globally UNIQUE. |
| FKs | Street required; first/last import run for official rows; logical tenant ownership for manual rows. |
| Cardinality | Street 1:N AddressAccess; AddressAccess 1:N CensusRecord; N:M Complex. |
| UNIQUE | Partial UNIQUE on non-null `anncsu_progressivo_accesso`. No uniqueness on visible civic fields. |
| Important nullable fields | `civico`, `esponente`, `specificita`, `metrico`, `progressivo_snc`, municipal access code, quota. |
| Provenance | Same official/manual source checks as Street, including reason, author, creation time, review state and lifecycle audit. |
| Scope | Official rows global; manual rows tenant operational. |

The entity stores ANNCSU values losslessly as text where the CSV is textual, even when metadata describes numeric content. Parsing/validation projections may add numeric values, but may not replace raw values.

The display label is derived. It is neither stored as identity nor unique.

Source consistency is mandatory: an `OFFICIAL_ANNCSU` AddressAccess must belong to an `OFFICIAL_ANNCSU` Street and must match the Street progressive supplied by the Indirizzario. A MANUAL AddressAccess may belong to an official or manual Street; when its parent Street is manual, both rows must belong to the same tenant scope.

### 5.5 AccessLocationObservation

| Property | Proposal |
|---|---|
| Responsibility | Immutable observation of an AddressAccess position with source, trust and time. |
| PK | UUID. |
| FKs | AddressAccess required; import run nullable; operator/user nullable; logical tenant scope nullable according to source. |
| Cardinality | AddressAccess 1:N observations. |
| UNIQUE | Source fingerprint/idempotency key, not coordinates alone. |
| Important nullable fields | Point, raw longitude/latitude, quota, accuracy/quality, ANNCSU method. |
| Provenance | `ANNCSU`, `GEOCODER`, `OPERATOR`; source reference, observed/imported time, source CRS, verification status. |
| Scope | ANNCSU observations global; geocoder/operator observations tenant operational. |

### 5.6 AccessLocationSelection

| Property | Proposal |
|---|---|
| Responsibility | Tenant decision selecting the effective observation for one access when the default ANNCSU location is not sufficient. |
| PK | Logical `(tenant scope, address_access_id)`. |
| FKs | AddressAccess and chosen AccessLocationObservation. |
| Cardinality | At most one active selection per tenant/access. |
| UNIQUE | One active selection per tenant/access. |
| Important nullable fields | Review note. |
| Provenance | selected by/at, reason and verification state. |
| Scope | Tenant operational. |

Absence of a tenant selection means “use the latest valid ANNCSU observation if available”. A manual verified selection remains effective when later ANNCSU imports add a different observation.

### 5.7 CensusZone

| Property | Proposal |
|---|---|
| Responsibility | Operational grouping of circulation areas for census work. |
| PK | UUID. |
| Official identifiers | None. |
| FKs | Municipality required; assignee operator; logical tenant scope. |
| Cardinality | Municipality 1:N Zone; Zone N:M Street; Zone 1:N CensusRecord; Zone 1:N Complex under the current approved operational behavior. |
| UNIQUE | `(tenant scope, municipality_id, normalized_name)`. |
| Important nullable fields | Assignee may be nullable only if unassigned zones are approved. |
| Provenance | creator/updater audit. |
| Scope | Tenant operational. |

### 5.8 CensusZoneStreet

| Property | Proposal |
|---|---|
| Responsibility | Explicit independent selection of a canonical Street for a Zone. |
| PK/UNIQUE | `(census_zone_id, street_id)`. |
| FKs | CensusZone and Street. |
| Cardinality | N:M. |
| Constraints | Same Municipality; official Street is globally visible; manual Street belongs to the same tenant as Zone. |
| Provenance | linked by/at and optional operational note. |
| Scope | Tenant operational. |

### 5.9 Complex

| Property | Proposal |
|---|---|
| Responsibility | Tenant-specific building/compound context spanning one or more external accesses. |
| PK | UUID. |
| FKs | CensusZone required under current behavior; logical tenant scope. |
| Cardinality | Zone 1:N Complex; Complex N:M AddressAccess; Complex 1:N optional CensusRecord references. |
| UNIQUE | `(tenant scope, census_zone_id, normalized_name)`. |
| Important nullable fields | Sheet, parcel, unit count and description. |
| Provenance | application audit. |
| Scope | Tenant operational. |

`ComplexAddressAccess` replaces `complex_civics`. A consistency rule requires every linked access's Street to belong to the Complex's Zone and Municipality. Whether a Complex may later span Zones remains outside the ANNCSU redesign and stays open only if product requirements change.

### 5.10 CensusRecord / censused property context

| Property | Proposal |
|---|---|
| Responsibility | Existing operational property/census context and contact history anchor. |
| PK | UUID. |
| FKs | CensusZone and AddressAccess required; Complex optional; operator/contact type; Subjects through the existing bridge. |
| Cardinality | Zone 1:N CensusRecord; AddressAccess 1:N CensusRecord; Subject N:M CensusRecord. |
| UNIQUE | Existing subject/property-context duplicate protection, rewritten around `address_access_id`; never based on a rendered address. |
| Important nullable fields | Complex and current property/cadastral attributes as today. |
| Provenance | Existing creation/event/operator audit. |
| Scope | Tenant operational. |

`street_id` should not remain on CensusRecord: it is functionally derived from `address_access_id`. Persisting both would allow contradictions. The write boundary verifies that the selected Zone contains the Access's Street and that an optional Complex contains the Access.

An AddressAccess is required. When ANNCSU lacks one, an explicit MANUAL AddressAccess is the fallback; a fake official civic is never created.

### 5.11 ANNCSU import run and revisions

| Property | Proposal |
|---|---|
| Responsibility | Audit and idempotency boundary for each regional/national snapshot. |
| PK | Bigint/UUID. |
| Official identifiers | Dataset type, territorial scope, release date and SHA-256. |
| UNIQUE | `(dataset_type, scope, sha256)` and a guarded rule for same release date with conflicting hash. |
| FKs | Referenced by official rows/revisions/observations. |
| Provenance | Source URL/file, parser version, counts, state, timestamps, safe failure. |
| Scope | Global private administrative data. |

Official revision rows are created only when source attributes change. The canonical Street/Access row stores the current projection; revisions and retained snapshots provide audit.

Retention policy:

- original ZIP/snapshot artifacts: configurable retention, default 12 months;
- snapshot SHA-256: permanent;
- `AnncsuImportRun` and audit: permanent;
- first-seen, last-seen and current-snapshot state: permanent;
- relevant structured Street and AddressAccess revisions: permanent.

No automatic destructive cleanup is part of the first implementation. Any future deletion job requires an explicit design covering eligibility, dry-run/reporting, failure recovery and audit.

## 6. Global data vs tenant data

| Global reference data | Tenant operational data |
|---|---|
| Municipality hierarchy | CensusZone |
| ANNCSU-derived Locality grouping | CensusZoneStreet |
| OFFICIAL_ANNCSU Street | MANUAL Street |
| OFFICIAL_ANNCSU AddressAccess | MANUAL AddressAccess |
| ANNCSU location observations | Geocoder/operator location observations |
| Import runs and official revisions | Effective location selections |
| Current-snapshot presence | Complex and ComplexAddressAccess |
| | CensusRecord, Subjects, interviews and operational audit |

The same tables may contain official and manual Street/AddressAccess variants, but source checks and RLS preserve the boundary. This avoids parallel domains while acknowledging different ownership.

The physical FK/policy for tenant ownership cannot be finalized until A.R.E.A.'s real tenant architecture is supplied. The LAB must preserve the logical boundary and keep tenant-owned writes behind its existing authenticated boundary, without presenting that temporary binding as the production architecture.

## 7. Locality model

### 7.1 Options evaluated

#### A. Fully normalized authoritative entity

Rejected. ANNCSU open data supplies only a nullable label, not an identifier, hierarchy, boundary or geometry. Treating a generated UUID as official identity would overstate data quality.

#### B. Street attribute only

Insufficient. It preserves source data but makes locality filtering, consistent search labels and future GeoCensimento grouping harder and repetitive.

#### C. Hybrid — recommended

Store both:

1. the exact `locality_name` on Street for lossless ANNCSU fidelity;
2. an optional FK to a normalized Municipality-scoped Locality grouping.

This supports search, UX and filters while remaining truthful about the lack of official locality identity. Normalization may group spelling/case equivalents, but the exact source string remains available. No polygon or centroid is inferred from the label.

### 7.2 Dataset evidence

- 23.075 of 87.147 Toscana Streets have `LOCALITA'`; therefore it is important but not universally present.
- Equal odonym can occur in multiple localities.
- Fifteen groups still contain distinct progressives with equal normalized odonym and equal normalized locality.
- The source exposes no locality ID.

Locality can disambiguate presentation, never establish Street identity.

## 8. Street model

### 8.1 Canonical identity

For `OFFICIAL_ANNCSU`, identity is the immutable national progressive. Odonym, locality, municipal code, language values and access count are mutable attributes of that identity.

For `MANUAL`, identity is the internal UUID within tenant ownership. It has no ANNCSU progressive and must show a visible manual-source badge/reason.

### 8.2 No name-based uniqueness

The current LAB unique key `(municipality, normalized_name)` must not survive. Real Toscana data contains:

- 413 Municipality+normalized-odonym collision groups;
- 925 Street rows within those groups;
- 15 collision groups even after adding normalized locality.

Name/locality indexes are for lookup only. Independent progressives can be independently associated with Zones.

### 8.3 Manual-to-official lifecycle

If a later snapshot introduces an official Street corresponding to a manual exception:

1. create/import the official row normally;
2. propose an administrative replacement;
3. explicitly repoint Zone and dependent manual Access relationships after review;
4. mark the manual Street retired/superseded;
5. never mutate a tenant-owned manual row into a global official row in place.

The same rule applies to a MANUAL AddressAccess. Candidate detection may propose a reconciliation, but it must not merge rows, rewrite operational FKs, delete the manual entity or select the official entity automatically. A responsible/master capability must explicitly approve, modify, retire or replace the exception; the LAB records the workflow state and audit but does not invent the definitive production RBAC.

This is not a second domain: both rows are Streets, but they have different identity histories and scopes. Automatic conversion would be unsafe across tenants.

## 9. Access/Civic model

### 9.1 Primary term

The domain should use `AddressAccess` (Italian UI: “Accesso / civico”). ANNCSU describes a physical external access, not merely the printed civic label.

`Civic` may remain a UI shorthand or derived label, but must not be the entity name or identity rule.

### 9.2 Lossless fields

An official AddressAccess retains:

- `PROGRESSIVO_ACCESSO`;
- `CODICE_COMUNALE_ACCESSO`;
- `CIVICO`;
- `ESPONENTE`;
- `SPECIFICITA`;
- `METRICO`;
- `PROGRESSIVO_SNC`;
- quota and location observations;
- current-source presence and import provenance.

No concatenated `number + extension` replaces these fields.

### 9.3 Equal visible labels

Two different progressives always remain two AddressAccesses. In Toscana:

- ignoring `PROGRESSIVO_SNC`, 24.777 Street+visible-field groups contain multiple access progressives, covering 68.059 rows;
- the full combination including `PROGRESSIVO_SNC` is unique in the examined snapshot, but it is still not the authoritative identity.

The UI must retain the access progressive internally and show an SNC discriminator when necessary. Maps aggregate Contacts by AddressAccess ID, not by rendered label.

### 9.4 Manual accesses

A manual AddressAccess belongs to a manual or official Street but to one tenant scope. It stores the same structured address attributes where applicable, plus required reason, author, creation time, review state and lifecycle audit. It never receives a fabricated ANNCSU progressive. An operator may propose/create the motivated exception; approval, modification, retirement or replacement is a distinct responsible/master action whose definitive role binding remains deferred.

## 10. Coordinates and provenance

### 10.1 Observation model

Coordinates must be appendable observations, not last-write-wins columns. Each observation records:

- raw longitude/latitude and source CRS declaration;
- canonical PostGIS point after the approved CRS transformation;
- source (`ANNCSU`, `GEOCODER`, `OPERATOR`);
- ANNCSU method 1–5 where applicable;
- source/import timestamp;
- optional quality/accuracy;
- verification state and operator audit where applicable;
- a fingerprint for idempotency.

Trust and provenance are separate dimensions. `ANNCSU` means officially supplied, not operator-verified.

### 10.2 Effective location

Resolution rule:

1. if the tenant has an explicit active `AccessLocationSelection`, use it;
2. otherwise use the latest valid ANNCSU observation;
3. otherwise the access is unlocated; a geocoder result remains a candidate until selected/persisted under approved rules.

A manually verified selection is not overwritten when ANNCSU changes. The new official coordinate remains visible for comparison and review.

### 10.3 Dataset evidence

- 1.555.651 of 1.901.458 Toscana accesses have coordinates (about 81.8%); missing coordinates are normal.
- Coordinates and method are consistently populated together in the examined file.
- Three points lie outside a deliberately broad Toscana bounding box; two are clearly in other Italian regions.

ANNCSU coordinates can be the primary default, but validation and operator correction are necessary.

### 10.4 CRS

#### Recommended canonical representation

Use `geometry(Point, 6706)` as the canonical operational point. EPSG:6706 is the geographic 2D CRS **ETRS89-ITA [RDN2008]**, the Italian realization ETRF2000 at epoch 2008.0 named by the ANNCSU specification. This preserves the declared horizontal frame instead of silently relabeling the values as WGS84/EPSG:4326. PostGIS `ST_SetSRID` is used only to tag parsed source ordinates that are already EPSG:6706; `ST_Transform` is required whenever coordinates are converted to a different CRS.

ANNCSU columns are explicitly longitude then latitude. Geometry construction therefore uses `Point(longitude, latitude)` (`X=longitude`, `Y=latitude`) even though the formal EPSG axis description is latitude/longitude; this GIS-friendly order must be documented and tested at every serialization boundary.

Do not store the ANNCSU quota as Z in the EPSG:6706 point. ANNCSU declares an orthometric height in the applicable national vertical system but does not identify one uniform vertical CRS in the open-data row. Preserve the exact quota separately with its raw value, unit, source declaration and provenance until a valid compound/vertical CRS can be identified.

#### Lossless source preservation and precision

Each ANNCSU observation preserves:

- the exact CSV longitude, latitude and quota strings;
- parsed longitude and latitude as `numeric(10,7)`, matching the published seven decimal places;
- parsed quota without destructive rounding;
- source CRS code `EPSG:6706` plus the label `ETRF2000 epoch 2008.0 / RDN2008`;
- method 1–5, import run, source hash and observation fingerprint;
- canonical `geometry(Point,6706)` in PostGIS double precision.

Seven decimal digits are a serialization precision, not a claim of centimetric accuracy. Operational quality follows ANNCSU `METODO` and validation state. Derived browser coordinates must never replace the raw values.

#### Transformation pipeline

1. Parse decimal-comma fields losslessly and validate coordinate pairing, ranges and method.
2. Build `ST_SetSRID(ST_MakePoint(longitude, latitude), 6706)`; never use `ST_SetSRID(...,4326)` and never use relabeling as a transformation.
3. Validate against the Municipality/region expected envelope. Territorial anomalies enter warning/quarantine and do not become the default effective location blindly.
4. Persist the immutable source observation and canonical EPSG:6706 point.
5. Resolve the tenant effective observation. A selected operator-verified observation remains effective across later ANNCSU snapshots.
6. For browser rendering, explicitly transform EPSG:6706 to the OpenLayers view CRS EPSG:3857. Register EPSG:6706 through the existing `proj4`/OpenLayers projection boundary and call `transform(..., 'EPSG:6706', 'EPSG:3857')`; do not use `fromLonLat`, whose geographic input contract is WGS84/EPSG:4326.
7. Keep cadastral WMS requests in their approved EPSG:4258 contract; transform extents explicitly at the layer boundary. Do not treat 4258, 6706 and 4326 as interchangeable merely because coordinate differences may be small at display scale.

The current stack already has PostGIS, OpenLayers 10.10, `proj4`, an EPSG:3857 map view and cadastral EPSG:4258 support, so no stack change is required.

#### Numeric validation tests required before migration

- **Known point:** ANNCSU sample `lon=11.0094693`, `lat=43.9015994` must create `SRID=6706;POINT(11.0094693 43.9015994)` with exact raw/numeric round-trip.
- **Web Mercator control:** the same point transformed to EPSG:3857 must be approximately `X=1225568.516380178`, `Y=5450227.069928512`; PostGIS and OpenLayers/proj4 results must agree within `0.01 m`.
- **Inverse round-trip:** EPSG:6706 → EPSG:3857 → EPSG:6706 must differ by at most `1e-7` degree per ordinate, without altering stored raw values.
- **Axis-order guard:** swapping the sample ordinates must fail the Italian territory validation; serializers always emit/accept the documented `longitude, latitude` order.
- **Territory gates:** valid Toscana boundary/control points pass; the three known outliers in the examined snapshot produce deterministic warnings/quarantine rather than silent acceptance or whole-run failure.
- **Missing/partial data:** both coordinates absent remains a valid unlocated access; one coordinate without the other, an invalid method or a non-finite/out-of-range value is rejected/quarantined.
- **Selection stability:** importing a changed ANNCSU point adds an observation but leaves an operator-verified effective selection unchanged.

Technical references: [ANNCSU 2024 specification](https://www.istat.it/wp-content/uploads/2022/05/Specifiche-tecniche-anccsu-2024.pdf), [PROJ CRS Explorer — EPSG:6706](https://crs-explorer.proj.org/?activeTypes=GEOGRAPHIC_2D_CRS&allowDeprecated=false&authorities=EPSG&ignoreWorld=false), [PostGIS `ST_Transform`](https://postgis.net/docs/manual-dev/en/ST_Transform.html), [OpenLayers projection API](https://openlayers.org/en/latest/apidoc/module-ol_proj.html).

## 11. Census Zones

Zones remain independent A.R.E.A. operational entities.

- A Zone belongs to exactly one Municipality and one tenant scope.
- A Zone selects Streets, never copies them.
- Every ANNCSU progressive is a separate selectable row, even when labels collide.
- Search results show odonym, locality, source, access count and a short progressive suffix/full ID for disambiguation.
- The same official Street may belong to several Zones if A.R.E.A. allows overlapping operational coverage.
- Association does not imply ownership of the global Street.
- A later ANNCSU rename changes the official label everywhere while Zone membership remains stable by Street ID/progressive.
- A disappeared progressive remains associated but is visibly marked “not present in latest snapshot”.

## 12. Complexes and Contacts

### 12.1 Complex

The current business behavior—one Complex assigned to one Zone and linked to multiple accesses—remains coherent and is retained in this proposal. The link target changes from Civic to AddressAccess.

The Zone/Street consistency rule prevents a Complex from silently linking an access outside its operational Zone. If production later needs a Complex across multiple Zones, that is a separate product decision, not an ANNCSU requirement.

### 12.2 CensusRecord

`CensusRecord` remains the censused property/contact context. It references:

- one Zone;
- one AddressAccess;
- optionally one Complex;
- one or more Subjects through the existing relationship.

Street and Municipality are derived through AddressAccess. This removes contradictory duplicated FKs while preserving Zone as the operational assignment.

Contacts at the same AddressAccess may remain distinct by Subject, unit/floor/subaltern and property context. Interview history remains owned by CensusRecord.

### 12.3 Cadastral boundary

AddressAccess identity is neither a parcel nor a property unit. Existing `CadastralAssociation` and provider-backed units remain separate. ANNCSU changes the territorial/address anchor only.

## 13. GeoCensimento impact

GeoCensimento becomes a projection of AddressAccess rather than Civic.

- Its territorial base is every AddressAccess whose Street is assigned to one of the agency's Zones, even when the access has no CensusRecord.
- One feature per AddressAccess ID, not per formatted civic label.
- Official, geocoder and manual observations can be compared without losing history.
- Effective location is resolved in tenant context.
- Contacts and Complexes aggregate onto the selected AddressAccess.
- Equal labels with different access IDs remain distinct; coincident points may overlap or cluster but are not merged.
- Locality filtering uses the normalized grouping while labels retain exact source values.
- Street filtering uses Street IDs/progressives, never names.
- `is_present_in_latest_snapshot` and source kind can be exposed as non-blocking quality/status indicators.
- Viewport movement still causes no provider calls; all official data is local snapshot data.

`CensusRecord`, `Complex`, commercial state and Catasto are informational/operational layers over that territorial base. None determines whether an AddressAccess exists or is visible. This supersedes the previous LAB paradigm in which the map was primarily generated from Civics already referenced by Censimento records.

No geometry for Street or Locality is invented. The current dataset supplies access points only.

## 14. ANNCSU import strategy

### 14.1 Pipeline

1. server-side/offline importer fetches or receives the official ZIP;
2. compute SHA-256 and register a `STARTED` run;
3. stream CSV into staging with exact text values;
4. validate encoding, headers, column counts, identifier uniqueness, Municipality codes and field shapes;
5. for Indirizzario validate every Street FK, access uniqueness, total-access counts, paired coordinates and method 1–5;
6. quarantine/report spatial anomalies and code mismatches;
7. abort without canonical writes when blocking validation fails;
8. upsert official Street by `PROGRESSIVO_NAZIONALE`;
9. upsert official AddressAccess by `PROGRESSIVO_ACCESSO`;
10. append revisions/coordinate observations only when source values change;
11. set first/last seen and latest-snapshot presence within the successful scope;
12. mark missing progressives not current only after a complete validated snapshot;
13. commit canonical writes and run state atomically;
14. expose a diff/report; never modify Zones, manual rows, selections, Complexes or CensusRecords.
15. retain source artifacts according to the configured policy (12 months by default) while retaining hashes, audit, presence state and relevant structured revisions permanently.

### 14.2 Idempotency and concurrency

- same dataset/scope/hash already `APPLIED` ⇒ no-op;
- upserts use official IDs only;
- observation/revision fingerprints prevent duplicates;
- advisory lock per dataset+territorial scope;
- different hash for the same nominal release ⇒ stop for operator review;
- no destructive delete; source disappearance changes only current-snapshot presence.

### 14.3 Runtime access

Official Street/Access/Locality projections are read-only to the browser under RLS. Import credentials remain offline/server-only, following the existing ISTAT importer boundary.

## 15. What to eliminate or change in the current LAB

After approval, the implementation plan should replace rather than preserve:

- the current Street identity rule based on `(municipality_id, normalized_name)`;
- name-based Street upsert and ordinary rename of official Streets;
- the current `civics(number, extension)` entity as the canonical access model;
- unique Civic constraints based only on number/extension;
- single mutable location/provenance columns on Civic;
- `census_records.street_id` as a redundant stored FK;
- `complex_civics` in favor of `complex_address_accesses`;
- domain/repository/UI types where `Civic` means entity rather than display concept;
- demo seeds whose addresses have no official/manual source discipline;
- tests that assert name uniqueness instead of official-ID identity.

The concepts to retain are Municipality, Zone, Zone↔Street many-to-many, Complex↔access many-to-many, CensusRecord, Subject relationships, interviews and cadastral separation.

## 16. LAB migration strategy — plan only

No preservation migration is required for demo rows. A later implementation may use a controlled breaking sequence:

1. use the approved model and recorded tenant/retention/manual/CRS decisions as migration prerequisites;
2. introduce source enums, import audit, unified Street, Locality, AddressAccess and location tables;
3. import one validated Toscana Stradario snapshot and verify counts/collisions;
4. import the Indirizzario and verify the 1:N relationship and coordinate gates;
5. replace Zone/Complex/CensusRecord FKs and RPC invariants;
6. regenerate deterministic demo Zones, manual exceptions, Complexes, Subjects and CensusRecords against official IDs;
7. update domain types, repositories, runtime validators and UI terminology;
8. update GeoCensimento aggregation and effective-location resolution;
9. replace tests and seed contracts;
10. only after successful cutover remove legacy Street/Civic columns/tables;
11. run full lint, typecheck, unit/integration, Playwright, build and live RLS/import verification.

Whether this is delivered as one baseline reset or staged versioned migrations is an implementation/release choice. The target schema must not contain compatibility artifacts whose only purpose is demo preservation.

## 17. Residual risks and edge cases

| Risk/case | Required behavior |
|---|---|
| Same Municipality, odonym and locality, different progressives | Distinct Streets and independent Zone selection. |
| Same visible access label, different access progressives | Distinct AddressAccesses; display discriminator and ID-safe selection. |
| Official rename | Update attributes under same progressive; keep all operational FKs. |
| Progressive disappears | Mark not current; do not delete or detach. |
| Manual exception later appears in ANNCSU | Propose an explicit audited reconciliation; no automatic merge, FK rewrite, deletion or scope conversion. |
| Street/Access source accidentally changed | Reject; source kind and official ID are identity invariants. |
| Locality spelling changes | Preserve raw value, update/relink derived grouping with audit. |
| Locality assumed to have geometry | Reject unless a future authoritative geometry source is approved. |
| ANNCSU coordinate differs from manual verified point | Keep both; tenant selection remains effective until reviewed. |
| ANNCSU coordinate outside expected territory | Quarantine/warning; do not make it effective blindly. |
| Coordinate absent | Access remains valid and unlocated. |
| Manual row visible across tenants | Enforce the logical LAB boundary; production exposure requires binding to the real tenant FK/RLS before deployment. |
| Official reference read modified by browser | Deny writes; importer-only mutation. |
| Zone links a Street from another Municipality | Database-level rejection. |
| Complex/Record links an Access outside Zone Street membership | Database-level rejection. |

## 18. Deferred production bindings, not architecture blockers

The ANNCSU architecture now has no unresolved domain, identity, retention or CRS decision. Two production bindings remain intentionally deferred because the LAB must not invent them:

1. the physical tenant FK and RLS path to A.R.E.A.'s future authoritative multi-tenant model;
2. the definitive RBAC identities for operator proposal and responsible/master approval.

These do not block implementation of the global ANNCSU catalog/import, source invariants, audit, retention metadata, reconciliation state machine or the logical tenant boundary in the LAB. They do block claiming production-ready tenant isolation or enabling production MANUAL approval mutations until the real A.R.E.A. contracts exist.

## Approved architecture summary

The approved target architecture is:

```text
one unified Street domain
  OFFICIAL_ANNCSU: global, identity = PROGRESSIVO_NAZIONALE
  MANUAL: tenant-owned, identity = internal UUID, no ANNCSU claim

one unified AddressAccess domain
  OFFICIAL_ANNCSU: global, identity = PROGRESSIVO_ACCESSO, lossless fields
  MANUAL: tenant-owned fallback

hybrid Locality
  exact nullable source label on Street
  normalized Municipality-scoped grouping without official-identity claims

tenant Zone ↔ canonical Street
tenant CensusRecord → Zone + AddressAccess
multi-observation coordinates + tenant effective-location selection
```

The first LAB implementation milestone was authorized on 2026-09-24. Versioned migrations, a local Toscana snapshot importer and Zone/Access UI are being built against this approved model. Production tenant FK/RLS and responsible/master RBAC binding remain deferred; database application and release require verification against a dedicated LAB target.
