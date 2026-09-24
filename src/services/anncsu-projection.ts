import proj4 from "proj4";
import { register } from "ol/proj/proj4.js";
import { transform } from "ol/proj.js";

// ANNCSU's declared horizontal frame is ETRS89-ITA/RDN2008 (EPSG:6706),
// not WGS84. Keep the source CRS explicit at the OpenLayers boundary.
proj4.defs("EPSG:6706", "+proj=longlat +ellps=GRS80 +no_defs +type=crs");
register(proj4);

export function anncsuToWebMercator(longitude:number,latitude:number):[number,number] {
  const [x,y]=transform([longitude,latitude],"EPSG:6706","EPSG:3857");
  return [x,y];
}

export function webMercatorToAnncsu(x:number,y:number):[number,number] {
  const [longitude,latitude]=transform([x,y],"EPSG:3857","EPSG:6706");
  return [longitude,latitude];
}
