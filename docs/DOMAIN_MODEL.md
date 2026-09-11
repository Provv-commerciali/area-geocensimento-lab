# Domain model

## Territory

`Country → Region → Province → Municipality → CensusZone`. `CensusZone ↔ Street` uses `CensusZoneStreet`; `Street → Civic`, where `Civic.number` and optional free-text `Civic.extension` are distinct.

## Subjects and census contexts

`Subject` is the unique registry entity. It is either `PRIVATO`, with personal name fields and optional tax code, or `AZIENDA`, with company name and optional VAT/tax identifiers. Normalized tax code and VAT number are strong duplicate signals and database uniqueness keys. Names and company names never trigger automatic merging.

`CensusRecord` is exposed operationally as a Census Contact: one private person or company in one property/civic context, with its own contact classification and interview history. It references a zone, street, civic, optional complex and responsible operator. `CensusRecordSubject` implements the internal many-to-many registry relationship and carries the role `Proprietario`, `Comproprietario` or `Inquilino`; migrated legacy links may temporarily be `Non specificato` rather than inventing historical meaning. Therefore one registry subject may span different streets, zones and municipalities, and one context may have several related people or companies.

Legacy person columns remain on `census_records` only to preserve already-loaded LAB data and are no longer authoritative for new writes. Whole-building levels are distinct from the partial-building `floor_code`, `total_floors` and `is_top_floor` fields; `floor_label` remains only as backward-compatible legacy display data.

`Subject N ↔ N CensusRecord` is traversed internally in both directions. In the UX this appears inside the Contact sheet as “Altri immobili / contesti collegati”; there is no autonomous Subjects macro-area in Milestone 1. `CensusRecord 1 → N CensusInterview` preserves context-specific history: interviews never move to or become shared through the registry subject. A record starts with zero interviews; latest interview, next recall and “Non ancora contattato” remain derived from actual children.

`Complex ↔ Civic` is many-to-many through `complex_civics`; creation may attach the first selected civic but does not designate a “primary” civic.

## Important invariants

- `is_appraised` defaults false and is never derived from contact type.
- Street membership is explicit and not permanently exclusive to a zone.
- A complex may span multiple civics and extensions.
- A census record is not automatically a `PropertyUnit`.
- A subject is not a census record and is never merged by name alone.
- Strong CF/P.IVA matches prompt reuse of the existing subject.
- One subject can link to many property contexts and one context to many subjects.
- A CensusRecord creation cannot create a CensusInterview.
- Streets are unique by municipality plus normalized name; civics by street plus normalized number/extension.
- Record duplicate protection prevents the same subject from being linked twice to the same location, building scope, floor and subaltern; subject uniqueness remains governed separately by strong identifiers.

## Future boundary (documentation only)

```text
CENSIMENTO ↔ CADASTRAL IDENTITY ↔ CADASTRAL CARTOGRAPHY
```

A future milestone may introduce `CadastralIdentity`, `CadastralParcel`, geometry and source/provider. These do not exist in the current schema. Manual census data is not assumed to be the sole authoritative cadastral source, and a parcel is not assumed to represent one unit.
