"use client";

import { useEffect, useRef, useState } from "react";
import Map from "ol/Map.js";
import View from "ol/View.js";
import Feature from "ol/Feature.js";
import Point from "ol/geom/Point.js";
import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector.js";
import OSM from "ol/source/OSM.js";
import VectorSource from "ol/source/Vector.js";
import Translate from "ol/interaction/Translate.js";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style.js";
import { fromLonLat, toLonLat } from "ol/proj.js";
import { MapPin, X } from "lucide-react";
import type { Civic } from "@/domain/census";
import { osmBasemapProvider } from "@/services/map-providers";
import { saveCivicLocationAction } from "./geography-actions";

type Props = { civic: Civic; address: string; databaseMode: boolean; onClose(): void; onSaved(status: "AUTO_GEOLOCATED" | "VERIFIED", longitude: number, latitude: number): void };
type GeocodingResponse = { results?: Array<{ label: string; longitude: number; latitude: number }> };

export function CivicLocationPicker({ civic, address, databaseMode, onClose, onSaved }: Props) {
  const targetRef=useRef<HTMLDivElement>(null);const mapRef=useRef<Map|null>(null);const sourceRef=useRef(new VectorSource());const autoAttempted=useRef(false);const initialCoordinateRef=useRef<[number,number]|null>(civic.location?[civic.location.longitude,civic.location.latitude]:null);
  const [coordinate,setCoordinate]=useState<[number,number]|null>(civic.location?[civic.location.longitude,civic.location.latitude]:null);
  const [message,setMessage]=useState(civic.location?"Sposta il marcatore o clicca il punto corretto, poi conferma.":"Ricerca dell’indirizzo in corso…");const [saving,setSaving]=useState(false);

  useEffect(()=>{if(!targetRef.current||mapRef.current)return;const initial=initialCoordinateRef.current;const markerLayer=new VectorLayer({source:sourceRef.current,style:new Style({image:new CircleStyle({radius:10,fill:new Fill({color:"#15aebb"}),stroke:new Stroke({color:"white",width:3})})})});const map=new Map({target:targetRef.current,layers:[new TileLayer({source:new OSM({url:osmBasemapProvider.tileUrl,attributions:osmBasemapProvider.attribution})}),markerLayer],view:new View({center:fromLonLat(initial??[12.5,42]),zoom:initial?19:6,maxZoom:20})});map.on("singleclick",event=>setCoordinate(toLonLat(event.coordinate) as [number,number]));const translate=new Translate({layers:[markerLayer]});translate.on("translateend",event=>{const feature=event.features.item(0);const point=feature?.getGeometry() as Point|undefined;if(point)setCoordinate(toLonLat(point.getCoordinates()) as [number,number])});map.addInteraction(translate);mapRef.current=map;return()=>{map.setTarget(undefined);mapRef.current=null}},[]);
  useEffect(()=>{sourceRef.current.clear();if(!coordinate)return;sourceRef.current.addFeature(new Feature({geometry:new Point(fromLonLat(coordinate))}));mapRef.current?.getView().animate({center:fromLonLat(coordinate),zoom:Math.max(17,mapRef.current.getView().getZoom()??17),duration:250})},[coordinate]);
  useEffect(()=>{if(coordinate||autoAttempted.current)return;autoAttempted.current=true;const controller=new AbortController();void(async()=>{try{const response=await fetch(`/api/geocoding/search?q=${encodeURIComponent(address)}`,{signal:controller.signal});const body=await response.json() as GeocodingResponse;const found=body.results?.[0];if(!response.ok||!found)throw new Error();const next:[number,number]=[found.longitude,found.latitude];setCoordinate(next);setMessage(`Posizione automatica proposta: ${found.label}. Verificala sulla mappa.`);if(databaseMode){const result=await saveCivicLocationAction({civicId:civic.id,longitude:found.longitude,latitude:found.latitude,status:"AUTO_GEOLOCATED",method:"GEOCODER",source:"NOMINATIM"});if(result.ok)onSaved("AUTO_GEOLOCATED",...next)}}catch(error){if((error as Error).name!=="AbortError")setMessage("Indirizzo non trovato automaticamente. Clicca il punto corretto sulla mappa.")}})();return()=>controller.abort()},[address,civic.id,coordinate,databaseMode,onSaved]);
  async function confirm(){if(!coordinate)return;setSaving(true);const result=await saveCivicLocationAction({civicId:civic.id,longitude:coordinate[0],latitude:coordinate[1],status:"VERIFIED",method:"MANUAL_MAP",source:"OPERATORE_MAPPA"});setSaving(false);if(!result.ok){setMessage(result.error);return}onSaved("VERIFIED",...coordinate);onClose()}

  return <div className="picker-backdrop" role="dialog" aria-modal="true" aria-label="Individua posizione sulla mappa"><section className="picker-card"><header><div><strong><MapPin size={18}/> Posizione geografica del civico</strong><span>{address}</span></div><button type="button" className="icon-button" aria-label="Annulla selezione posizione" onClick={onClose}><X/></button></header><p className="picker-message">{message}</p><div ref={targetRef} className="picker-map" aria-label="Mappa per verificare il civico"/><footer><button type="button" className="button secondary" onClick={onClose}>Annulla</button><button type="button" className="button primary" disabled={!coordinate||saving||!databaseMode} onClick={()=>void confirm()}>{saving?"Salvataggio…":"Conferma posizione"}</button></footer></section></div>;
}
