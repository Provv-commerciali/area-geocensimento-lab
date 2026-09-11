# Domain model

## Territory

`Country → Region → Province → Municipality → CensusZone`. `CensusZone ↔ Street` uses `CensusZoneStreet`; `Street → Civic`, where `Civic.number` and optional free-text `Civic.extension` are distinct.

## Census

`CensusRecord` is the central aggregate and references a zone, street, civic, optional complex, responsible operator and contact type. It stores known person/property fields and the milestone's manual sheet, parcel, subaltern and cadastral category. Whole-building levels are distinct from the partial-building `floor_code`, `total_floors` and `is_top_floor` fields; `floor_label` remains only as backward-compatible legacy display data.

`CensusRecord 1 → N CensusInterview` preserves history. A record starts with zero interviews. Interview creation is a separate explicit command; latest interview, next recall and “never contacted” are derived from actual children and never from mutable status text.

`Complex ↔ Civic` is many-to-many through `complex_civics`; creation may attach the first selected civic but does not designate a “primary” civic.

## Important invariants

- `is_appraised` defaults false and is never derived from contact type.
- Street membership is explicit and not permanently exclusive to a zone.
- A complex may span multiple civics and extensions.
- A census record is not automatically a `PropertyUnit`.
- A CensusRecord creation cannot create a CensusInterview.
- Streets are unique by municipality plus normalized name; civics by street plus normalized number/extension.
- Record duplicate protection uses normalized identity, location, building scope and floor, not a global person uniqueness rule.

## Future boundary (documentation only)

```text
CENSIMENTO ↔ CADASTRAL IDENTITY ↔ CADASTRAL CARTOGRAPHY
```

A future milestone may introduce `CadastralIdentity`, `CadastralParcel`, geometry and source/provider. These do not exist in the current schema. Manual census data is not assumed to be the sole authoritative cadastral source, and a parcel is not assumed to represent one unit.
