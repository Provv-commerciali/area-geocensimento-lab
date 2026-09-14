# Project specification

## Goal and boundaries

Milestone 0 establishes a deployable Next.js/Supabase foundation. Milestone 1 reproduces only the known Censimento domain: LAB login, zones and their streets, civics, contacts (`CensusRecord`), interview history, complexes with multiple civics, filters, contextual street views and controlled seed data.

Milestone 2 adds GeoCensimento as a geographic projection of this same domain. It introduces OpenLayers, cached civic points, an OSM LAB basemap, the official free cadastral WMS and map filters. The verified-location increment adds explicit automatic/operator states and a minimal confirmed cadastral association on the existing property context. It does not introduce ownership, visure, paid APIs or a parallel map database.

Milestone 3 extends only Complex management with private building/doorbell photos and operator-assisted contact acquisition. OCR output is staging data, never a Contact. An authenticated operator must review identity, civic, Scala, Interno, Piano, Qualifica and other canonical fields before a normal zero-interview Census Contact is created.

The approved OpenAPI Catasto milestone enriches the existing `CadastralAssociation`; it does not create a second cadastral domain. The free AdE map click remains unchanged and never triggers a paid call. An explicitly authorized operator may confirm distinct server-side operations for property units, holders or an ordinary report. Requests, provider IDs, states, canonical parameters, results and costs are audited and cached. The same application service is consumed by GeoCensimento and Contact detail.

## Confirmed flows

- Unauthenticated users are directed to login; authenticated LAB users enter Censimento. In missing-env demo mode, reviewers can enter a clearly labeled read-only demonstration.
- A zone is created from country, region, province, municipality, name and assignee. The user can save and return or save then define streets.
- A contact combines person, pre-existing location/property and manual cadastral data. It starts with zero interviews; each interview is created only by a later explicit operator action.
- A street view inherits zone and street context and exposes only the remaining relevant filters.
- A complex links to one or more civics and “Mostra interni” lists associated CensusRecords.
- `Notizia` makes the appraisal control contextually relevant but never selects it automatically.

## Deferred

Excel export is deferred for this milestone. Detailed unknown behavior is catalogued in `OPEN_QUESTIONS.md` and does not block the POC.
