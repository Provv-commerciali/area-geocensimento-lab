# GeoCensimento Milestone 2

GeoCensimento is the map projection of existing Censimento contacts. The page loads authenticated repository data on the server, serializes it to an isolated OpenLayers client, filters through the existing `filterCensusRecords`, and derives every operational state through `deriveCensusOperationalStatus`.

## Layers and interaction

1. Replaceable OSM LAB basemap with required attribution.
2. Toggleable official AdE `fabbricati` WMS through a same-origin proxy. At cadastral zoom it renders the orange building footprints over the basemap; the queryable parcel layer is used for point information. Failure leaves the app usable and is displayed.
3. One vector feature per geolocated civic. It contains references to all matching CensusRecords and any associated Complex names.
4. OpenLayers density clustering at 48 px. A cluster count is the number of contacts, not merely civic features. Click zooms into a multi-feature cluster; at detail scale it lists individual contacts.

The primary marker/cluster color follows operational precedence. A purple ring indicates at least one Complex without replacing operational meaning. The detail drawer shows address, contact/private-or-company display, type, operational state, latest interview, age, recall/overdue delay, Complex and links to the existing contact sheet. Cadastral click results are external information only.

## URL filters

Stable parameters are `zone`, `street`, `type`, `operator`, `activity` (`never`, `staleNews`, `recallOverdue`, `actionRequired`), `appraised`, `complex` and `q`. Contacts, Zone, Via and Complex pages provide contextual links. The browser updates the URL as map filters change, making the view reproducible. Changing Zone clears the dependent Via selection so an invisible stale street filter cannot suppress valid results.

## Location and performance

Migration `202609110009_geocensus_civic_locations.sql` adds one `geography(Point,4326)` per Civic, metadata and a GiST index. `NOT_GEOLOCATED` and `NEEDS_REVIEW` civics are counted explicitly and not rendered as markers. When matching records have no persisted coordinates, the UI performs one bounded lookup for the first matching address, centers at cadastral zoom and clearly states that the civic is still unverified and unsaved. Panning never calls geocoding and no lookup result is persisted automatically. This LAB loads one repository snapshot; future bounding-box reads can use the existing spatial index without changing the map projection contract.

## Security and hard stops

Supabase RLS and authenticated grants remain unchanged. The map receives no service-role credential. External inputs and responses are validated, WMS parameters/layers are allowlisted, and provider errors are bounded. OpenAPI Catasto, paid calls, visure, ownership, scraping and automatic parcel/property matching are not implemented.
