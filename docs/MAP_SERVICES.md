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
- Visual layer: `fabbricati`, whose verified default style produces orange building footprints at scale denominator 20–5000. Point information uses queryable `CP.CadastralParcel` (`Particelle`). The composite parent is intentionally not used because its territorial labels obscure the basemap.
- Advertised CRS: EPSG:6706, 4258, 3044, 3045, 3046, 25832, 25833 and 25834. EPSG:3857 is not advertised.
- Coverage described by the service: Italy except the autonomous provinces of Trento and Bolzano.
- Live close-scale `fabbricati` `GetMap` probe in EPSG:4258: HTTP 200, `image/png`, 184,372 bytes, with orange footprints over transparency.
- Live `GetFeatureInfo` probe in EPSG:4258: plain text identified a feature but exposed no attributes; HTML returned the official `Label` and `NationalCadastralReference` (`1` and `G628_001800.1` at the verified sample). The proxy therefore requests HTML and normalizes that reference to cadastral code `G628`, sheet `18`, parcel `1`.
- CORS: the responses did not expose `Access-Control-Allow-Origin`; the app therefore uses `/api/map/cadastral` with an operation/layer/parameter allowlist and a 12-second timeout.
- Same-origin proxy probe: the valid EPSG:4258 request returned HTTP 200 and the same 2,747-byte PNG; an EPSG:3857 request was rejected locally with HTTP 400.
- Projection and load strategy: the app explicitly registers EPSG:4258 (including WMS 1.3 axis order) before creating one `ImageWMS` per view. OpenLayers reprojects it onto EPSG:3857. A single image avoids the burst of concurrent tile requests that caused intermittent upstream 502 responses.
- Attribution: `Agenzia delle Entrate — CC BY 4.0`.
- `GetFeatureInfo` plain text is parsed and runtime-validated into only municipality code/name, optional section, sheet, parcel and optional type. The general map remains read-only; the Contact picker creates/corrects an association only after a separate confirmation.

Other advertised layers include the composite parent, `CP.CadastralZoning`, `province`, `acque`, `strade`, `codice_plla`, `simbolo_graffa` and `copyright`; they are not silently added to the visual overlay.

## WFS

The probed endpoint `https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/ows01.php` returned `Access Denied` for `GetCapabilities`. No WFS endpoint, feature type, attribute contract or browser capability is declared operational in this milestone.

## Geocoding

`GeocodingProvider` separates external search from the domain. The LAB adapter uses Nominatim for explicit searches and at most one picker lookup for an unlocated civic. Requests are restricted to Italy and at most five results. It sends an identifying User-Agent, never runs on pan and does not perform bulk geocoding. A candidate is cached once as `AUTO_GEOLOCATED`; only explicit operator confirmation changes it to `VERIFIED`.

A single identified live search probe returned HTTP 200 and one structured Italian result. This verifies limited on-demand search availability, not a production SLA or permission for batch use.

## OpenAPI Catasto paid data

Documentation verified 2026-09-14 against the official OpenAPI Catasto documentation and FAQ. Production is `https://catasto.openapi.it`; sandbox is `https://test.catasto.openapi.it`. The implementation defaults to sandbox and selects production only through `OPENAPI_CATASTO_ENV=production`.

- `POST /richiesta/elenco_immobili/`: explicit unit search from building cadastre, province, municipality, sheet and parcel.
- `POST /richiesta/prospetto_catastale/`: explicit selected-unit request including subaltern, returning unit detail and all available holders/right/share data.
- `GET /richiesta/{id}`: controlled status/result polling for the two request operations.
- `POST /visura_catastale`: explicit ordinary property report by provider property ID.
- `GET /visura_catastale/{id}` and `/documento`: report status and authenticated PDF retrieval.

No test calls these endpoints. The token is server-only and never appears in client props, logs or responses.
