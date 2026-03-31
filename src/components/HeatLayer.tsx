import { Circle } from "react-leaflet";
import type { HeatPoint } from "../services/api";

interface HeatLayerProps {
  points: HeatPoint[];
}

function HeatLayer({ points }: HeatLayerProps) {
  if (points.length === 0) {
    return null;
  }

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

export default HeatLayer;
