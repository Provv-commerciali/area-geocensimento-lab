# Project specification

## Goal and boundaries

Milestone 0 establishes a deployable Next.js/Supabase foundation. Milestone 1 reproduces only the known Censimento domain: LAB login, zones and their streets, civics, contacts (`CensusRecord`), interview history, complexes with multiple civics, filters, contextual street views and controlled seed data.

Milestone 2 adds GeoCensimento as a geographic projection of this same domain. It introduces OpenLayers, cached civic points, an OSM LAB basemap, the official free cadastral WMS and map filters. It does not introduce cadastral identity/property ownership, paid APIs or a parallel map database.

## Confirmed flows

- Unauthenticated users are directed to login; authenticated LAB users enter Censimento. In missing-env demo mode, reviewers can enter a clearly labeled read-only demonstration.
- A zone is created from country, region, province, municipality, name and assignee. The user can save and return or save then define streets.
- A contact combines person, pre-existing location/property and manual cadastral data. It starts with zero interviews; each interview is created only by a later explicit operator action.
- A street view inherits zone and street context and exposes only the remaining relevant filters.
- A complex links to one or more civics and “Mostra interni” lists associated CensusRecords.
- `Notizia` makes the appraisal control contextually relevant but never selects it automatically.

## Deferred

Excel export is deferred for this milestone. Detailed unknown behavior is catalogued in `OPEN_QUESTIONS.md` and does not block the POC.
