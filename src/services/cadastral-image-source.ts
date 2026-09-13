import ImageWMS from "ol/source/ImageWMS.js";
import type ImageWrapper from "ol/Image.js";
import { ensureEtrs89Projection } from "./map-projections";
import { italianRevenueCadastralProvider } from "./map-providers";

// AdE advertises a hard 2048x2048 limit. Reprojection can enlarge even a
// non-HiDPI viewport; preserve its geographic extent while reducing pixels.
export function loadCadastralImage(image: ImageWrapper, src: string) {
  const url = new URL(src, window.location.origin);
  const width = Number(url.searchParams.get("WIDTH"));
  const height = Number(url.searchParams.get("HEIGHT"));
  const scale = Math.min(1, 2048 / Math.max(width, height));
  if (scale < 1) {
    const boundedWidth = Math.max(1, Math.floor(width * scale));
    const boundedHeight = Math.max(1, Math.floor(height * scale));
    url.searchParams.set("WIDTH", String(boundedWidth));
    url.searchParams.set("HEIGHT", String(boundedHeight));
    const extent = image.getExtent();
    image.setResolution([(extent[2] - extent[0]) / boundedWidth, (extent[3] - extent[1]) / boundedHeight]);
  }
  (image.getImage() as HTMLImageElement).src = url.toString();
}

export function createCadastralImageSource() {
  return new ImageWMS({
    url: italianRevenueCadastralProvider.proxyUrl,
    projection: ensureEtrs89Projection(),
    params: { LAYERS: italianRevenueCadastralProvider.layer },
    hidpi: false, ratio: 1,
    attributions: italianRevenueCadastralProvider.attribution,
    imageLoadFunction: loadCadastralImage,
  });
}
