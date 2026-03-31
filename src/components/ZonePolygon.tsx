import { Polygon, Popup } from "react-leaflet";
import type { Zone } from "../types/Zone";

interface ZonePolygonProps {
  zones: Zone[];
}

function ZonePolygon({ zones }: ZonePolygonProps) {

  return (
    <>
      {zones.map((zone) => (
        <Polygon
          key={zone.id}
          positions={zone.coordinates}
          pathOptions={{ color: "#b91c1c", weight: 2, fillColor: "#ef4444", fillOpacity: 0.18 }}
        >
          <Popup>
            <strong>{zone.name}</strong>
            <br />
            Risk level: {zone.riskLevel}
          </Popup>
        </Polygon>
      ))}
    </>
  );
}

export default ZonePolygon;
