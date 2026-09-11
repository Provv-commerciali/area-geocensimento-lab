# Map architecture

Milestone 2 implements the reviewed OpenLayers boundary, civic PostGIS locations, OSM LAB basemap and official cadastral WMS proxy. See `ARCHITECTURE.md`, `GEOCENSIMENTO.md` and `MAP_SERVICES.md` for the authoritative implementation and verified-provider details. Paid provider calls remain absent and future paid calls must be explicit server-side actions with cache/audit controls, never pan/zoom effects.
