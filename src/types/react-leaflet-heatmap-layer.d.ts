declare module "react-leaflet-heatmap-layer" {
  import type { FC } from "react";

  export interface HeatmapLayerProps<T = unknown> {
    points: T[];
    longitudeExtractor: (point: T) => number;
    latitudeExtractor: (point: T) => number;
    intensityExtractor?: (point: T) => number;
    radius?: number;
    blur?: number;
    max?: number;
    maxZoom?: number;
    minOpacity?: number;
    fitBoundsOnLoad?: boolean;
    fitBoundsOnUpdate?: boolean;
  }

  const HeatmapLayer: FC<HeatmapLayerProps<any>>;
  export default HeatmapLayer;
}
