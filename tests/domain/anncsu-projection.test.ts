import { describe, expect, it } from "vitest";
import { anncsuToWebMercator, webMercatorToAnncsu } from "@/services/anncsu-projection";

describe("explicit EPSG:6706 browser projection",()=>{
  it("matches the approved numeric Toscana control and round-trips",()=>{
    const longitude=11.0094693, latitude=43.9015994;
    const [x,y]=anncsuToWebMercator(longitude,latitude);
    expect(Math.abs(x-1225568.516380178)).toBeLessThan(0.01);
    expect(Math.abs(y-5450227.069928512)).toBeLessThan(0.01);
    const [roundLon,roundLat]=webMercatorToAnncsu(x,y);
    expect(Math.abs(roundLon-longitude)).toBeLessThanOrEqual(1e-7);
    expect(Math.abs(roundLat-latitude)).toBeLessThanOrEqual(1e-7);
  });
});
