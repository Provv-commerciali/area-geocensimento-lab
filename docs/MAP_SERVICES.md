# Verified map services

Verification date: 2026-09-11. These facts come from live official capabilities and request probes, not assumed endpoint conventions.

## OpenStreetMap LAB basemap

- Provider adapter: `osm-standard` through OpenLayers `OSM` source.
- URL: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`.
- Attribution rendered by OpenLayers: `© OpenStreetMap contributors`.
- Limit: the public tile service is suitable only for modest LAB review. It is not the selected production capacity plan.

## Agenzia delle Entrate cadastral WMS

- Official endpoint: `https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php`.
- Verified `GetCapabilities`: HTTP 200, WMS 1.3.0, title `Cartografia Catastale`, CC BY 4.0, public data, mandatory owner citation, maximum width/height 2048.
- Supported operations: `GetMap` PNG/JPEG and `GetFeatureInfo` HTML, plain text or GML.
- Visual layer: `Cartografia_Catastale`, the verified composite parent that exposes scale-appropriate roads, waters, buildings, parcel codes and boundaries. Point information uses queryable `CP.CadastralParcel` (`Particelle`).
- Advertised CRS: EPSG:6706, 4258, 3044, 3045, 3046, 25832, 25833 and 25834. EPSG:3857 is not advertised.
- Coverage described by the service: Italy except the autonomous provinces of Trento and Bolzano.
- Live `GetMap` probe in EPSG:4258: HTTP 200, `image/png`, 2,747 bytes.
- Live `GetFeatureInfo` probe in EPSG:4258/plain text: HTTP 200; the sample point returned no feature, which is a valid empty result.
- CORS: the responses did not expose `Access-Control-Allow-Origin`; the app therefore uses `/api/map/cadastral` with an operation/layer/parameter allowlist and a 12-second timeout.
- Same-origin proxy probe: the valid EPSG:4258 request returned HTTP 200 and the same 2,747-byte PNG; an EPSG:3857 request was rejected locally with HTTP 400.
- Projection and load strategy: the app explicitly registers EPSG:4258 (including WMS 1.3 axis order) before creating one `ImageWMS` per view. OpenLayers reprojects it onto EPSG:3857. A single image avoids the burst of concurrent tile requests that caused intermittent upstream 502 responses.
- Attribution: `Agenzia delle Entrate — CC BY 4.0`.
- `GetFeatureInfo` output is shown as external data and never creates internal entities.

The composite visual layer contains advertised children including `CP.CadastralZoning`, `province`, `acque`, `strade`, `fabbricati`, `codice_plla`, `simbolo_graffa` and `copyright`; individual children are not exposed as independently selectable application layers.

## WFS

The probed endpoint `https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/ows01.php` returned `Access Denied` for `GetCapabilities`. No WFS endpoint, feature type, attribute contract or browser capability is declared operational in this milestone.

## Geocoding

`GeocodingProvider` separates external search from the domain. The LAB adapter uses Nominatim for user searches and a single lookup after an explicit Zone/Via context produces only unlocated matches. Requests are restricted to Italy and at most five results. It sends an identifying User-Agent, never runs on pan and does not perform bulk geocoding. Context lookup only centers the view; accepted civic coordinates must be cached in PostGIS through the still-TBD human acceptance workflow.

A single identified live search probe returned HTTP 200 and one structured Italian result. This verifies limited on-demand search availability, not a production SLA or permission for batch use.
