import { describe, expect, it } from "vitest";
import ImageWMS from "ol/source/ImageWMS.js";
import { fromLonLat, get as getProjection } from "ol/proj.js";
import { ensureEtrs89Projection, ETRS89_CODE } from "@/services/map-projections";

describe("cadastral map projection", () => {
  it("registers ETRS89 and makes WMS requests in the provider CRS", () => {
    const projection = ensureEtrs89Projection();
    const source = new ImageWMS({ url: "/api/map/cadastral", projection, params: { LAYERS: "Cartografia_Catastale" }, ratio: 1 });
    const url = source.getFeatureInfoUrl(fromLonLat([11.3426, 44.4949]), 2, "EPSG:3857", { INFO_FORMAT: "text/plain" });

    expect(getProjection(ETRS89_CODE)).toBe(projection);
    expect(projection.getAxisOrientation()).toBe("neu");
    expect(url).toContain("CRS=EPSG%3A4258");
  });
});
