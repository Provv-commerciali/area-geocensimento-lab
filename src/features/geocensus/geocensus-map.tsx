"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Map from "ol/Map.js";
import View from "ol/View.js";
import Feature from "ol/Feature.js";
import Point from "ol/geom/Point.js";
import ImageLayer from "ol/layer/Image.js";
import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector.js";
import ImageWMS from "ol/source/ImageWMS.js";
import OSM from "ol/source/OSM.js";
import VectorSource from "ol/source/Vector.js";
import Cluster from "ol/source/Cluster.js";
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style.js";
import { fromLonLat } from "ol/proj.js";
import { boundingExtent } from "ol/extent.js";
import type { CensusRecord, CensusZone, Civic, Complex, Operator, Street } from "@/domain/census";
import { CENSUS_OPERATIONAL_STATUS_VISUALS, deriveCensusOperationalStatus, operationalStatusLabel, unresolvedRecallDate, type CensusOperationalSettings } from "@/domain/census-operational-status";
import { geoCensusHref, markerColor, projectGeoCensus, type CivicMapFeature, type GeoCensusFilters } from "@/domain/geocensus";
import { italianRevenueCadastralProvider, osmBasemapProvider } from "@/services/map-providers";
import { ensureEtrs89Projection, ETRS89_CODE } from "@/services/map-projections";
import { resolveCadastralTerritory, type CadastralFeatureInfo } from "@/services/cadastral-feature";

type Props = { records: CensusRecord[]; civics: Civic[]; zones: CensusZone[]; streets: Street[]; complexes: Complex[]; operators: Operator[]; settings: CensusOperationalSettings; today: string; initialFilters: GeoCensusFilters };
type GeocodingResponse = { results?: Array<{ label: string; longitude: number; latitude: number }>; error?: string };

export function GeoCensusMap({ records, civics, zones, streets, complexes, operators, settings, today, initialFilters }: Props) {
  const targetRef = useRef<HTMLDivElement>(null); const mapRef = useRef<Map | null>(null); const sourceRef = useRef(new VectorSource());
  const [filters, setFilters] = useState(initialFilters); const [filtersOpen, setFiltersOpen] = useState(true); const [cadastralVisible, setCadastralVisible] = useState(true);
  const [selected, setSelected] = useState<CivicMapFeature[]>([]); const [cadastralInfo, setCadastralInfo] = useState<CadastralFeatureInfo | "loading" | "empty" | "error" | null>(null); const [cadastralState, setCadastralState] = useState<"loading" | "ready" | "error">("loading");
  const [search, setSearch] = useState(initialFilters.query ?? ""); const [searchMessage, setSearchMessage] = useState("");
  const [contextState, setContextState] = useState<"idle" | "locating" | "centered" | "error">("idle");
  const projection = useMemo(() => projectGeoCensus({ records, civics, streets, complexes, filters, settings, today }), [records, civics, streets, complexes, filters, settings, today]);

  useEffect(() => {
    if (!targetRef.current || mapRef.current) return;
    ensureEtrs89Projection();
    const cadastral = new ImageWMS({ url: italianRevenueCadastralProvider.proxyUrl, projection: ETRS89_CODE, params: { LAYERS: italianRevenueCadastralProvider.layer }, serverType: "mapserver", attributions: italianRevenueCadastralProvider.attribution, ratio: 1 });
    const parcelInfo = new ImageWMS({ url: italianRevenueCadastralProvider.proxyUrl, projection: ETRS89_CODE, params: { LAYERS: italianRevenueCadastralProvider.queryLayer }, serverType: "mapserver", ratio: 1 });
    cadastral.on("imageloadstart", () => setCadastralState("loading")); cadastral.on("imageloadend", () => setCadastralState("ready")); cadastral.on("imageloaderror", () => setCadastralState("error"));
    const cluster = new Cluster({ distance: 48, minDistance: 18, source: sourceRef.current });
    const vector = new VectorLayer({ source: cluster, style: (feature) => {
      const children = feature.get("features") as Feature<Point>[]; const count = children.reduce((total, child) => total + (child.get("payload") as CivicMapFeature).records.length, 0);
      const payloads = children.map((child) => child.get("payload") as CivicMapFeature); const status = payloads.sort((a, b) => ["RICONTATTO_SCADUTO", "NOTIZIA_NON_AGGIORNATA", "MAI_CONTATTATO", "ORDINARIO"].indexOf(a.status) - ["RICONTATTO_SCADUTO", "NOTIZIA_NON_AGGIORNATA", "MAI_CONTATTATO", "ORDINARIO"].indexOf(b.status))[0]?.status ?? "ORDINARIO";
      const hasComplex = payloads.some((payload) => payload.complexNames.length > 0);const onlyAutomatic=payloads.every(payload=>payload.locationStatus==="AUTO_GEOLOCATED");
      return new Style({ image: new CircleStyle({ radius: Math.min(24, 10 + Math.sqrt(count) * 3), fill: new Fill({ color: markerColor(status) }), stroke: new Stroke({ color: hasComplex ? "#6f46a5" : onlyAutomatic ? "#f2a93b" : "white", width: hasComplex ? 4 : onlyAutomatic ? 3 : 2, lineDash: onlyAutomatic&&!hasComplex?[4,3]:undefined }) }), text: new Text({ text: String(count), fill: new Fill({ color: "white" }), font: "700 12px sans-serif" }) });
    } });
    const map = new Map({ target: targetRef.current, layers: [new TileLayer({ source: new OSM({ url: osmBasemapProvider.tileUrl, attributions: osmBasemapProvider.attribution }) }), new ImageLayer({ source: cadastral, opacity: 0.92, visible: true }), vector], view: new View({ center: fromLonLat([12.5, 42]), zoom: 6, minZoom: 5, maxZoom: 20 }) });
    map.on("singleclick", async (event) => {
      const hit = map.forEachFeatureAtPixel(event.pixel, (feature) => feature);
      if (hit) {
        const children = hit.get("features") as Feature<Point>[]; const payloads = children.map((child) => child.get("payload") as CivicMapFeature);
        if (children.length > 1 && (map.getView().getZoom() ?? 0) < 17) { map.getView().fit(boundingExtent(children.map((child) => (child.getGeometry() as Point).getCoordinates())), { padding: [80, 80, 80, 80], maxZoom: 17, duration: 250 }); return; }
        setSelected(payloads); setCadastralInfo(null); return;
      }
      const url = parcelInfo.getFeatureInfoUrl(event.coordinate, map.getView().getResolution()!, "EPSG:3857", { INFO_FORMAT: "text/html" });
      if (!url) return; setSelected([]); setCadastralInfo("loading");
      try { const response = await fetch(url); const body = await response.json() as { feature: CadastralFeatureInfo | null }; setCadastralInfo(response.ok && body.feature ? body.feature : "empty"); }
      catch { setCadastralInfo("error"); }
    });
    mapRef.current = map; return () => { map.setTarget(undefined); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const features = projection.features.map((payload) => { const feature = new Feature({ geometry: new Point(fromLonLat([payload.longitude, payload.latitude])) }); feature.set("payload", payload); return feature; });
    sourceRef.current.clear(); sourceRef.current.addFeatures(features);
    if (features.length && mapRef.current) mapRef.current.getView().fit(boundingExtent(features.map((feature) => (feature.getGeometry() as Point).getCoordinates())), { padding: [80, 80, 80, 80], maxZoom: 16, duration: 200 });
  }, [projection]);

  useEffect(() => { if (mapRef.current) (mapRef.current.getLayers().item(1) as ImageLayer<ImageWMS>).setVisible(cadastralVisible); }, [cadastralVisible]);
  useEffect(() => { window.history.replaceState(null, "", geoCensusHref(filters)); }, [filters]);

  useEffect(() => {
    if (projection.features.length > 0) { return; }
    const zone = zones.find((item) => item.id === filters.zoneId) ?? zones.find((item) => item.id === records[0]?.zoneId) ?? zones[0]; if (!zone) return;
    const street = streets.find((item) => item.id === filters.streetId);
    const query = `${projection.firstMissingAddress ?? street?.name ?? zone.name}, ${zone.municipality}, Italia`;
    const controller = new AbortController();
    void (async () => {
      setContextState("locating");
      try {
        const response = await fetch(`/api/geocoding/search?q=${encodeURIComponent(query)}`, { signal: controller.signal }); const body = await response.json() as GeocodingResponse; const first = body.results?.[0];
        if (!response.ok || !first) throw new Error();
        mapRef.current?.getView().animate({ center: fromLonLat([first.longitude, first.latitude]), zoom: projection.firstMissingAddress ? 18 : 16, duration: 350 }); setContextState("centered");
      } catch (error) { if ((error as Error).name !== "AbortError") setContextState("error"); }
    })();
    return () => controller.abort();
  }, [filters.streetId, filters.zoneId, projection.features.length, projection.firstMissingAddress, records, streets, zones]);

  const update = (key: keyof GeoCensusFilters, value: string | boolean) => {
    setSelected([]); setContextState("idle");
    setFilters((current) => ({ ...current, [key]: value || undefined, ...(key === "zoneId" ? { streetId: undefined } : {}) }));
  };
  async function runSearch(event: React.FormEvent) {
    event.preventDefault(); const needle = search.trim().toLocaleLowerCase("it"); if (!needle) return;
    const internal = projection.features.find((feature) => feature.address.toLocaleLowerCase("it").includes(needle));
    if (internal && mapRef.current) { mapRef.current.getView().animate({ center: fromLonLat([internal.longitude, internal.latitude]), zoom: 18, duration: 250 }); setSearchMessage("Civico trovato nei dati Censimento."); return; }
    setSearchMessage("Ricerca esterna in corso…");
    try { const response = await fetch(`/api/geocoding/search?q=${encodeURIComponent(search)}`); const body = await response.json() as GeocodingResponse; const first = body.results?.[0]; if (!response.ok || !first) throw new Error(); mapRef.current?.getView().animate({ center: fromLonLat([first.longitude, first.latitude]), zoom: 17, duration: 300 }); setSearchMessage(first.label); }
    catch { setSearchMessage("Località non trovata o provider non disponibile."); }
  }
  const cadastralZone=cadastralInfo&&typeof cadastralInfo==="object"?resolveCadastralTerritory(zones,cadastralInfo.municipalityCode):undefined;

  return <div className="geocensus-layout">
    <aside className={`map-filters ${filtersOpen ? "" : "collapsed"}`}><button className="button secondary full" onClick={() => setFiltersOpen((value) => !value)}>{filtersOpen ? "Nascondi filtri" : "Mostra filtri"}</button>{filtersOpen && <>
      <form className="map-search" onSubmit={runSearch}><label>Ricerca indirizzo, località o civico<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="es. Via Rizzoli 8, Bologna"/></label><button className="button primary" type="submit">Cerca</button>{searchMessage && <small>{searchMessage}</small>}</form>
      <label>Zona<select aria-label="Zona mappa" value={filters.zoneId ?? ""} onChange={(event) => update("zoneId", event.target.value)}><option value="">Tutte</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
      <label>Via<select aria-label="Via mappa" value={filters.streetId ?? ""} onChange={(event) => update("streetId", event.target.value)}><option value="">Tutte</option>{streets.filter((street) => !filters.zoneId || zones.find((zone) => zone.id === filters.zoneId)?.streetIds.includes(street.id)).map((street) => <option key={street.id} value={street.id}>{street.name}</option>)}</select></label>
      <label>Tipologia<select aria-label="Tipologia mappa" value={filters.contactType ?? ""} onChange={(event) => update("contactType", event.target.value)}><option value="">Tutte</option>{["Generico", "Informatore", "Informazione", "Notizia"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Responsabile<select aria-label="Responsabile mappa" value={filters.operatorId ?? ""} onChange={(event) => update("operatorId", event.target.value)}><option value="">Tutti</option>{operators.map((operator) => <option key={operator.id} value={operator.id}>{operator.name}</option>)}</select></label>
      <label>Attività<select aria-label="Attività mappa" value={filters.operationalStatus ?? ""} onChange={(event) => update("operationalStatus", event.target.value)}><option value="">Tutte</option><option value="never">Mai contattati</option><option value="staleNews">Notizie non aggiornate</option><option value="recallOverdue">Ricontatti scaduti</option><option value="actionRequired">Solo attività da fare</option></select></label>
      <label>Perizia<select aria-label="Perizia mappa" value={filters.appraised ?? ""} onChange={(event) => update("appraised", event.target.value)}><option value="">Tutte</option><option value="true">Sì</option><option value="false">No</option></select></label>
      <label className="map-checkbox"><input type="checkbox" checked={Boolean(filters.onlyComplexes)} onChange={(event) => update("onlyComplexes", event.target.checked)}/> Solo contatti in Complessi</label>
      <button className="text-button" onClick={() => { setSelected([]); setContextState("idle"); setFilters({}); }}>Reimposta filtri</button>
    </>}</aside>
    <section className="map-workspace">
      <div className="map-toolbar"><strong>{projection.visibleRecordCount} contatti · {projection.verifiedCivicCount} civici verificati</strong><span>{projection.autoGeolocatedCivicCount} da verificare · {projection.notGeolocatedCivicCount} non localizzati</span><label><input type="checkbox" checked={cadastralVisible} onChange={(event) => setCadastralVisible(event.target.checked)}/> Cartografia catastale</label><small className={`service-state ${cadastralState}`}>{cadastralState === "ready" ? "Cartografia catastale disponibile" : cadastralState === "error" ? "Sovrapposizione catastale temporaneamente non disponibile" : "Caricamento cartografia catastale"}</small></div>
      <div ref={targetRef} className="geocensus-map" aria-label="Mappa GeoCensimento"/>
      {projection.visibleRecordCount > 0 && projection.features.length === 0 && <div className="map-empty-notice"><strong>{filters.zoneId ? "Filtro applicato" : "Risultati caricati"}: i civici non hanno ancora coordinate persistenti.</strong><span>{contextState === "locating" ? "Centro la vista sul primo indirizzo…" : contextState === "centered" ? "Vista centrata sull’indirizzo. I fabbricati catastali ufficiali sono evidenziati in arancione; il civico resta da verificare e salvare." : contextState === "error" ? "Non è stato possibile centrare automaticamente il contesto." : "I record restano conteggiati e non vengono nascosti."}</span></div>}
      <div className="map-legend"><strong>Legenda</strong>{Object.entries(CENSUS_OPERATIONAL_STATUS_VISUALS).map(([status, visual]) => <span key={status}><i style={{ background: visual.markerColor }}/>{visual.label}</span>)}<span><i className="automatic-ring"/> Posizione da verificare</span><span><i className="complex-ring"/> Complesso</span></div>
      {(selected.length > 0 || cadastralInfo) && <aside className="map-detail">{selected.flatMap((feature) => feature.records).map((record) => { const status = deriveCensusOperationalStatus({ contactType: record.contactType, interviews: record.interviews, staleNewsDays: settings.staleNewsDays, today }); const recall = unresolvedRecallDate(record.interviews, today); return <article key={record.id}><strong>{record.lastName} {record.firstName}</strong><span>{record.streetName}, {record.civicNumber}{record.civicExtension ? `/${record.civicExtension}` : ""}</span><small>Posizione {selected[0]?.locationStatus === "VERIFIED" ? "verificata" : "automatica, da verificare"}</small><small>{record.subjectType ? (record.subjectType === "AZIENDA" ? "Azienda" : "Privato") : "Soggetto"} · {record.contactType} · {operationalStatusLabel(status)}</small><small>Ultima intervista: {status.lastInterviewAt ?? "mai"} · Giorni: {status.daysSinceLastInterview ?? "—"}</small><small>Ricontatto: {status.isRecallOverdue ? `scaduto da ${status.overdueRecallDays} gg` : recall ?? "—"}</small>{record.complexName && <small>Complesso: {record.complexName}</small>}<Link href={`/censimento/contatti/${record.id}`}>Apri contatto</Link></article>; })}{selected.reduce((total, item) => total + item.records.length, 0) > 1 && selected[0] && <Link className="button secondary full" href={`/censimento/zone/${selected[0].zoneId}/vie/${selected[0].streetId}?q=${encodeURIComponent(selected[0].records[0].civicNumber)}`}>Visualizza contatti del civico</Link>}{cadastralInfo && <article className="cadastral-detail-card"><header><span>Catasto ufficiale</span><strong>Identificativi dell’edificio</strong></header>{typeof cadastralInfo === "object" ? <dl><div className="territory-field"><dt>Provincia</dt><dd>{cadastralZone?.province ? `${cadastralZone.province}${cadastralZone.provinceCode?` (${cadastralZone.provinceCode})`:""}` : "Non determinabile"}</dd></div><div className="territory-field"><dt>Comune</dt><dd>{cadastralZone?.municipality??cadastralInfo.municipalityName??"Non determinabile"}</dd></div><div><dt>Codice catastale</dt><dd>{cadastralInfo.municipalityCode}</dd></div>{cadastralInfo.municipalityName&&cadastralInfo.municipalityName!==cadastralZone?.municipality&&<div><dt>Denominazione catastale</dt><dd>{cadastralInfo.municipalityName}</dd></div>}<div><dt>Sezione</dt><dd>{cadastralInfo.section ?? "Non restituita"}</dd></div><div><dt>Foglio</dt><dd>{cadastralInfo.sheet}</dd></div><div><dt>Particella</dt><dd>{cadastralInfo.parcel}</dd></div><div><dt>Tipologia immobile</dt><dd>{cadastralInfo.featureType ?? "Non restituita"}</dd></div></dl> : <p>{cadastralInfo === "loading" ? "Interrogazione particella…" : cadastralInfo === "empty" ? "Nessuna particella disponibile in questo punto." : "Servizio catastale temporaneamente non disponibile."}</p>}<footer>Consultazione informativa · nessuna associazione viene salvata</footer></article>}</aside>}
    </section>
  </div>;
}
