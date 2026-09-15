"use client";

import { useEffect, useRef, useState } from "react";
import Map from "ol/Map.js";
import View from "ol/View.js";
import ImageLayer from "ol/layer/Image.js";
import TileLayer from "ol/layer/Tile.js";
import ImageWMS from "ol/source/ImageWMS.js";
import { createCadastralImageSource } from "@/services/cadastral-image-source";
import OSM from "ol/source/OSM.js";
import { fromLonLat, toLonLat } from "ol/proj.js";
import { Layers, X } from "lucide-react";
import type { Civic } from "@/domain/census";
import type { CadastralFeatureInfo } from "@/services/cadastral-feature";
import { ensureEtrs89Projection, ETRS89_CODE } from "@/services/map-projections";
import { italianRevenueCadastralProvider, osmBasemapProvider } from "@/services/map-providers";
import { confirmCadastralAssociationAction } from "./geography-actions";

type Props={recordId?:string;civic?:Civic;address:string;databaseMode?:boolean;onClose():void;onSaved(feature:CadastralFeatureInfo):void};
type GeocodingResponse={results?:Array<{longitude:number;latitude:number}>};

export function CadastralPicker({recordId,civic,address,databaseMode=false,onClose,onSaved}:Props){
  const targetRef=useRef<HTMLDivElement>(null);const mapRef=useRef<Map|null>(null);
  const [feature,setFeature]=useState<CadastralFeatureInfo|null>(null);const [clickPoint,setClickPoint]=useState<[number,number]|null>(null);const [message,setMessage]=useState("Clicca una geometria catastale arancione per vedere i dati prima di confermare.");const [saving,setSaving]=useState(false);
  useEffect(()=>{if(!targetRef.current||mapRef.current)return;ensureEtrs89Projection();const cadastral=createCadastralImageSource();const info=new ImageWMS({url:italianRevenueCadastralProvider.proxyUrl,projection:ETRS89_CODE,params:{LAYERS:italianRevenueCadastralProvider.queryLayer},hidpi:false,ratio:1});const initial=civic?.location?[civic.location.longitude,civic.location.latitude] as [number,number]:[12.5,42] as [number,number];const map=new Map({target:targetRef.current,layers:[new TileLayer({source:new OSM({url:osmBasemapProvider.tileUrl,attributions:osmBasemapProvider.attribution})}),new ImageLayer({source:cadastral,opacity:.88})],view:new View({center:fromLonLat(initial),zoom:civic?.location?19:6,maxZoom:20})});map.on("singleclick",async event=>{const url=info.getFeatureInfoUrl(event.coordinate,map.getView().getResolution()!,"EPSG:3857",{INFO_FORMAT:"text/html"});if(!url)return;setFeature(null);setMessage("Interrogazione della particella…");try{const response=await fetch(url);const body=await response.json() as {feature:CadastralFeatureInfo|null};if(!response.ok||!body.feature){setMessage("Nessuna particella disponibile in questo punto.");return}setFeature(body.feature);setClickPoint(toLonLat(event.coordinate) as [number,number]);setMessage("Controlla gli attributi restituiti dal servizio; il click non ha ancora salvato nulla.")}catch{setMessage("Servizio catastale temporaneamente non disponibile.")}});mapRef.current=map;if(!civic?.location){const controller=new AbortController();void(async()=>{try{const response=await fetch(`/api/geocoding/search?q=${encodeURIComponent(address)}`,{signal:controller.signal});const body=await response.json() as GeocodingResponse;const found=body.results?.[0];if(found)map.getView().animate({center:fromLonLat([found.longitude,found.latitude]),zoom:18,duration:300})}catch{}})();return()=>{controller.abort();map.setTarget(undefined);mapRef.current=null}}return()=>{map.setTarget(undefined);mapRef.current=null}},[address,civic?.location]);
  async function confirm(){if(!feature)return;if(recordId){setSaving(true);const result=await confirmCadastralAssociationAction({recordId,...feature,...(clickPoint?{sourceReference:{longitude:clickPoint[0],latitude:clickPoint[1]}}:{})});setSaving(false);if(!result.ok){setMessage(result.error);return}}onSaved(feature);onClose()}
  const draftMode=!recordId;
  return <div className="picker-backdrop" role="dialog" aria-modal="true" aria-label={draftMode?"Importa dati catastali da GeoCensimento":"Individua particella sulla mappa"}><section className="picker-card"><header><div><strong><Layers size={18}/> {draftMode?"Importa dal GeoCensimento":"Individua particella sulla mappa"}</strong><span>{address} · cartografia catastale gratuita attiva</span></div><button type="button" className="icon-button" aria-label="Annulla selezione particella" onClick={onClose}><X/></button></header><p className="picker-message">{message}</p><div ref={targetRef} className="picker-map" aria-label="Mappa per associare la particella"/>{feature&&<div className="cadastral-preview"><strong>Anteprima — dati effettivamente restituiti</strong><dl><div><dt>Comune catastale</dt><dd>{feature.municipalityName??"non restituito"} ({feature.municipalityCode})</dd></div><div><dt>Sezione</dt><dd>{feature.section??"non restituita"}</dd></div><div><dt>Foglio</dt><dd>{feature.sheet}</dd></div><div><dt>Particella</dt><dd>{feature.parcel}</dd></div><div><dt>Tipo</dt><dd>{feature.featureType??"non restituito"}</dd></div></dl><small>Subalterno, categoria, titolarità e visure non sono restituiti e non vengono creati.</small></div>}<footer><button type="button" className="button secondary" onClick={onClose}>Annulla</button><button type="button" className="button primary" disabled={!feature||saving||(!draftMode&&!databaseMode)} onClick={()=>void confirm()}>{saving?"Salvataggio…":draftMode?"Importa foglio e particella":"Conferma associazione"}</button></footer></section></div>}
