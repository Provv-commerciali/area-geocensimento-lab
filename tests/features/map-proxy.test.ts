import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/map/cadastral/route";

afterEach(() => vi.restoreAllMocks());

describe("cadastral WMS proxy", () => {
  const valid = "http://lab.test/api/map/cadastral?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=CP.CadastralParcel&CRS=EPSG%3A4258&BBOX=43.89,10.20,43.91,10.23&WIDTH=256&HEIGHT=256";

  it("forwards only the verified layer and forces safe output parameters", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(new Uint8Array([137, 80, 78, 71]), { status: 200, headers: { "Content-Type": "image/png" } }));
    const response = await GET(new Request(valid));
    expect(response.status).toBe(200);
    const upstream = new URL(String(fetchMock.mock.calls[0][0]));
    expect(upstream.hostname).toBe("wms.cartografia.agenziaentrate.gov.it");
    expect(upstream.searchParams.get("LAYERS")).toBe("CP.CadastralParcel");
    expect(upstream.searchParams.get("FORMAT")).toBe("image/png");
  });

  it("allows the verified cadastral building layer", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(new Uint8Array([137, 80, 78, 71]), { status: 200, headers: { "Content-Type": "image/png" } }));
    const response = await GET(new Request(valid.replace("CP.CadastralParcel", "fabbricati")));
    expect(response.status).toBe(200);
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("LAYERS")).toBe("fabbricati");
  });

  it("rejects unverified CRS, layers and oversized images before fetching", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    expect((await GET(new Request(valid.replace("EPSG%3A4258", "EPSG%3A3857")))).status).toBe(400);
    expect((await GET(new Request(valid.replace("CP.CadastralParcel", "unknown")))).status).toBe(400);
    expect((await GET(new Request(valid.replace("WIDTH=256", "WIDTH=4096")))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
