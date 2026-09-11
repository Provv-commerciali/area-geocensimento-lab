export interface BasemapProvider { id: string; attribution: string; tileUrl: string }
export interface CadastralMapProvider { id: string; title: string; proxyUrl: string; layer: string; queryLayer: string; version: "1.3.0"; attribution: string }

export const osmBasemapProvider: BasemapProvider = {
  id: "osm-standard", tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "© OpenStreetMap contributors",
};

export const italianRevenueCadastralProvider: CadastralMapProvider = {
  id: "ade-inspire-wms", title: "Fabbricati catastali — Agenzia delle Entrate", proxyUrl: "/api/map/cadastral",
  layer: "fabbricati", queryLayer: "CP.CadastralParcel", version: "1.3.0", attribution: "Agenzia delle Entrate — CC BY 4.0",
};
