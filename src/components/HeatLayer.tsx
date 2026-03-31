import { type ComponentType, useEffect, useState } from "react";
import { Circle } from "react-leaflet";
import type { HeatPoint } from "../services/api";

type HeatmapComponentType = ComponentType<{
  points: HeatPoint[];
  longitudeExtractor: (point: HeatPoint) => number;
  latitudeExtractor: (point: HeatPoint) => number;
  intensityExtractor: (point: HeatPoint) => number;
  fitBoundsOnLoad?: boolean;
  fitBoundsOnUpdate?: boolean;
  radius?: number;
  blur?: number;
  max?: number;
}>;

interface HeatLayerProps {
  points: HeatPoint[];
}

function HeatLayer({ points }: HeatLayerProps) {
  const [HeatmapLayerComponent, setHeatmapLayerComponent] =
    useState<HeatmapComponentType | null>(null);

  useEffect(() => {
    // This library targets older React/React-Leaflet combinations.
    // Load it lazily so the map still renders if it cannot run at runtime.
    void import("react-leaflet-heatmap-layer")
      .then((mod) => {
        setHeatmapLayerComponent(() => mod.default as HeatmapComponentType);
      })
      .catch((error) => {
        console.warn("Heatmap layer unavailable, using circle fallback:", error);
      });
  }, []);

  if (points.length === 0) {
    return null;
  }

  if (!HeatmapLayerComponent) {
    return (
      <>
        {points.map((point, index) => (
          <Circle
            key={`${point.lat}-${point.lng}-${index}`}
            center={[point.lat, point.lng]}
            radius={260 * (0.45 + point.intensity)}
            pathOptions={{ color: "#f97316", fillColor: "#fb923c", fillOpacity: 0.24 }}
          />
        ))}
      </>
    );
  }

  return (
    <HeatmapLayerComponent
      fitBoundsOnLoad
      fitBoundsOnUpdate
      points={points}
      longitudeExtractor={(point) => point.lng}
      latitudeExtractor={(point) => point.lat}
      intensityExtractor={(point) => point.intensity}
      radius={14}
      blur={12}
      max={1}
    />
  );
}

export default HeatLayer;
