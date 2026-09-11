import Projection from "ol/proj/Projection.js";
import { addCoordinateTransforms, addProjection, fromLonLat, get as getProjection, toLonLat } from "ol/proj.js";

export const ETRS89_CODE = "EPSG:4258";

export function ensureEtrs89Projection(): Projection {
  const existing = getProjection(ETRS89_CODE);
  if (existing) return existing;
  const projection = new Projection({ code: ETRS89_CODE, units: "degrees", axisOrientation: "neu", extent: [2, 33, 19, 48], worldExtent: [2, 33, 19, 48] });
  addProjection(projection);
  addCoordinateTransforms(projection, "EPSG:3857", (coordinate) => fromLonLat(coordinate), (coordinate) => toLonLat(coordinate));
  return projection;
}
