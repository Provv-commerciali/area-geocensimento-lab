# GeoCensimento Milestone 2

GeoCensimento is the map projection of existing Censimento contacts. The page loads authenticated repository data on the server, serializes it to an isolated OpenLayers client, filters through the existing `filterCensusRecords`, and derives every operational state through `deriveCensusOperationalStatus`.

## Layers and interaction

1. Replaceable OSM LAB basemap with required attribution.
2. Toggleable official AdE `fabbricati` WMS through a public, same-origin, strictly allowlisted proxy. The route is independent from LAB session refresh, accepts only real PNG map responses, retries invalid provider responses and never caches errors. The shared image loader bounds the final reprojected request to the official 2048×2048 limit, preserving BBOX and correcting image resolution; disabling HiDPI alone does not bound reprojection. At cadastral zoom it renders the orange building footprints over the basemap; the queryable parcel layer is used for point information. Failure leaves the app usable and exposes an explicit retry.
3. One vector feature per geolocated civic. It contains references to all matching CensusRecords and any associated Complex names.
4. OpenLayers density clustering at 48 px. A cluster count is the number of contacts, not merely civic features. Click zooms into a multi-feature cluster; at detail scale it lists individual contacts.

The primary marker/cluster color follows operational precedence. A purple ring indicates at least one Complex without replacing operational meaning. Every feature also carries `VERIFIED` or `AUTO_GEOLOCATED`; counters separate verified, to-verify and missing civics, and the detail never presents an automatic point as certain. The persistence adapter accepts PostGIS points returned as GeoJSON, serialized GeoJSON, WKT or EWKB. Cadastral clicks on the general map remain informative only. The popup matches the provider’s cadastral municipality code with persisted Municipality data before displaying Province/Comune, preventing unrelated loaded zones from contaminating the result, and groups territory and parcel identifiers in a dedicated card.

## URL filters

Stable parameters are `zone`, `street`, `type`, `operator`, `activity` (`never`, `staleNews`, `recallOverdue`, `actionRequired`), `appraised`, `complex` and `q`. Contacts, Zone, Via and Complex pages provide contextual links. The browser updates the URL as map filters change, making the view reproducible. Changing Zone clears the dependent Via selection so an invisible stale street filter cannot suppress valid results.

The filter controls occupy a wrapping horizontal bar above the map. The map workspace uses the complete available content width; at narrower viewports the controls wrap without restoring a permanent side column.

## Location and performance

Migration `202609110009_geocensus_civic_locations.sql` adds one `geography(Point,4326)` per Civic and the GiST index; migration `202609110012_verified_locations_and_cadastral_associations.sql` makes its state machine explicit. Nuovo Contatto shows the selected civic’s state. Opening its picker performs at most one address lookup when needed and caches the result as `AUTO_GEOLOCATED`; clicking or dragging changes only the candidate until “Conferma posizione”, which writes `VERIFIED`. A second contact at the same civic reuses that row without another lookup. Panning never calls geocoding and proximity never verifies.

The Contact sheet provides the separate cadastral workflow. It centers on the civic point when available, activates the official orange overlay, validates `GetFeatureInfo`, previews municipality code/name, optional section, sheet, parcel and optional type, then requires “Conferma particella”. Cancel and ordinary map clicks write nothing. Manual correction repeats the same audited command.

## Security and hard stops

Supabase RLS and authenticated grants remain unchanged. The map receives no service-role credential. External inputs and responses are validated, WMS parameters/layers are allowlisted, and provider errors are bounded. OpenAPI Catasto, paid calls, visure, ownership, scraping and automatic parcel/property matching are not implemented.
