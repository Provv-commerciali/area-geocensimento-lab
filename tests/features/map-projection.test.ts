import { describe, expect, it, vi } from "vitest";
import ImageWMS from "ol/source/ImageWMS.js";
import { fromLonLat, get as getProjection } from "ol/proj.js";
import { ensureEtrs89Projection, ETRS89_CODE } from "@/services/map-projections";
import { createCadastralImageSource } from "@/services/cadastral-image-source";

describe("cadastral map projection", () => {
  it.each([[1530,610,1],[3440,1440,2],[800,2400,2]])("bounds reprojected Tuscany images for viewport %ix%i at DPR %i", async (width,height,dpr) => {
    ensureEtrs89Projection();
    const load=vi.spyOn(HTMLImageElement.prototype,"src","set").mockImplementation(()=>{});
    const source=createCadastralImageSource();
    const [x,y]=fromLonLat([10.26,43.91]);const resolution=2.3886571339;
    source.getImage([x-width*resolution/2,y-height*resolution/2,x+width*resolution/2,y+height*resolution/2],resolution,dpr,getProjection("EPSG:3857")!).load();
    await vi.waitFor(()=>expect(load).toHaveBeenCalled());
    const url=new URL(load.mock.calls[0][0]);
    expect(Number(url.searchParams.get("WIDTH"))).toBeLessThanOrEqual(2048);
    expect(Number(url.searchParams.get("HEIGHT"))).toBeLessThanOrEqual(2048);
    const bbox=url.searchParams.get("BBOX")!.split(",").map(Number);
    expect(bbox[0]).toBeLessThan(43.91);expect(bbox[2]).toBeGreaterThan(43.91);
    expect(bbox[1]).toBeLessThan(10.26);expect(bbox[3]).toBeGreaterThan(10.26);
    load.mockRestore();
  });
  it("registers ETRS89 and makes WMS requests in the provider CRS", () => {
    const projection = ensureEtrs89Projection();
    const source = new ImageWMS({ url: "/api/map/cadastral", projection, params: { LAYERS: "fabbricati" }, hidpi:false, ratio: 1 });
    const url = source.getFeatureInfoUrl(fromLonLat([11.3426, 44.4949]), 2, "EPSG:3857", { INFO_FORMAT: "text/plain" });

    expect(getProjection(ETRS89_CODE)).toBe(projection);
    expect(projection.getAxisOrientation()).toBe("neu");
    expect(url).toContain("CRS=EPSG%3A4258");
  });
});
