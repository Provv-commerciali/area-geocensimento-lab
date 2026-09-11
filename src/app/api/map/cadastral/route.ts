import { z } from "zod";
import { parseCadastralFeatureInfo } from "@/services/cadastral-feature";

const allowedLayers = new Set(["fabbricati", "CP.CadastralParcel"]);
const allowedRequests = new Set(["GetMap", "GetFeatureInfo"]);
const numberList = z.string().regex(/^-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?){3}$/);
const dimension = z.coerce.number().int().min(1).max(2048);

export async function GET(request: Request) {
  const incoming = new URL(request.url).searchParams;
  const operation = incoming.get("REQUEST") ?? incoming.get("request") ?? "GetMap";
  const layer = incoming.get("LAYERS") ?? incoming.get("layers") ?? "";
  if (!allowedRequests.has(operation) || !allowedLayers.has(layer)) return Response.json({ error: "Richiesta WMS non consentita" }, { status: 400 });
  const bbox = incoming.get("BBOX") ?? incoming.get("bbox");
  if (!bbox || !numberList.safeParse(bbox).success) return Response.json({ error: "BBOX non valido" }, { status: 400 });
  const width = incoming.get("WIDTH") ?? incoming.get("width"); const height = incoming.get("HEIGHT") ?? incoming.get("height");
  const crs = incoming.get("CRS") ?? incoming.get("crs");
  if (!dimension.safeParse(width).success || !dimension.safeParse(height).success || crs !== "EPSG:4258") return Response.json({ error: "Dimensioni o CRS WMS non consentiti" }, { status: 400 });
  const upstream = new URL("https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php");
  const allow = ["SERVICE", "VERSION", "REQUEST", "LAYERS", "QUERY_LAYERS", "STYLES", "FORMAT", "INFO_FORMAT", "TRANSPARENT", "CRS", "SRS", "BBOX", "WIDTH", "HEIGHT", "I", "J", "X", "Y"];
  allow.forEach((key) => { const value = incoming.get(key) ?? incoming.get(key.toLowerCase()); if (value !== null) upstream.searchParams.set(key, value); });
  upstream.searchParams.set("SERVICE", "WMS"); upstream.searchParams.set("VERSION", "1.3.0"); upstream.searchParams.set("LAYERS", layer); upstream.searchParams.set("language", "ita");
  upstream.searchParams.set("FORMAT", "image/png"); upstream.searchParams.set("TRANSPARENT", "TRUE");
  if (operation === "GetFeatureInfo") { upstream.searchParams.set("QUERY_LAYERS", layer); upstream.searchParams.set("INFO_FORMAT", "text/html"); }
  try {
    const response = await fetch(upstream, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (!response.ok) return Response.json({ error: `Servizio catastale non disponibile (${response.status})` }, { status: 502 });
    if (operation === "GetFeatureInfo") {
      const body = await response.text();
      try { return Response.json({ feature: parseCadastralFeatureInfo(body) }, { headers: { "Cache-Control": "private, max-age=60" } }); }
      catch { return Response.json({ feature: null }, { status: 200, headers: { "Cache-Control": "private, max-age=60" } }); }
    }
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    return new Response(response.body, { status: 200, headers: { "Content-Type": contentType, "Cache-Control": operation === "GetMap" ? "public, max-age=300" : "private, max-age=60", "X-Content-Type-Options": "nosniff" } });
  } catch { return Response.json({ error: "Servizio catastale temporaneamente non disponibile" }, { status: 502 }); }
}
