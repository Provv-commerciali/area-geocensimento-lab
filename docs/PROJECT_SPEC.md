# Project specification

## Goal and boundaries

Milestone 0 establishes a deployable Next.js/Supabase foundation. Milestone 1 reproduces only the known Censimento domain: LAB login, zones and their streets, civics, contacts (`CensusRecord`), interview history, complexes with multiple civics, filters, contextual street views and controlled seed data.

The current delivery must stop before GeoCensimento. It contains no maps, map engines, WMS/WFS, cadastral API, cadastral identity/parcel implementation, geometry, geocoding or thematic overlays.

## Confirmed flows

- Unauthenticated users are directed to login; authenticated LAB users enter Censimento. In missing-env demo mode, reviewers can enter a clearly labeled read-only demonstration.
- A zone is created from country, region, province, municipality, name and assignee. The user can save and return or save then define streets.
- A contact combines person, location/property, manual cadastral data and zero or more interviews.
- A street view inherits zone and street context and exposes only the remaining relevant filters.
- A complex links to one or more civics and “Mostra interni” lists associated CensusRecords.
- `Notizia` makes the appraisal control contextually relevant but never selects it automatically.

## Deferred

Excel export is deferred for this milestone. Detailed unknown behavior is catalogued in `OPEN_QUESTIONS.md` and does not block the POC.
