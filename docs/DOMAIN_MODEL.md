# Domain model

## Territory

`Country → Region → Province → Municipality → CensusZone`. `CensusZone ↔ Street` uses `CensusZoneStreet`; `Street → Civic`, where `Civic.number` and optional free-text `Civic.extension` are distinct.

## Census

`CensusRecord` is the central aggregate and references a zone, street, civic, optional complex, responsible operator and contact type. It stores known person/property fields and the milestone's manual sheet, parcel, subaltern and cadastral category. `floor_label` is intentionally text; normalization is deferred until semantics are known.

`CensusRecord 1 → N CensusInterview` preserves history. Latest interview/operator/response and next recall are derived from ordered interviews, never destructive denormalization.

`Complex ↔ Civic` is many-to-many through `complex_civics`; creation may attach the first selected civic but does not designate a “primary” civic.

## Important invariants

- `is_appraised` defaults false and is never derived from contact type.
- Street membership is explicit and not permanently exclusive to a zone.
- A complex may span multiple civics and extensions.
- A census record is not automatically a `PropertyUnit`.

## Future boundary (documentation only)

```text
CENSIMENTO ↔ CADASTRAL IDENTITY ↔ CADASTRAL CARTOGRAPHY
```

A future milestone may introduce `CadastralIdentity`, `CadastralParcel`, geometry and source/provider. These do not exist in the current schema. Manual census data is not assumed to be the sole authoritative cadastral source, and a parcel is not assumed to represent one unit.
