import { useMemo } from "react";
import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import type { Incident } from "../types/Incident";

interface IncidentMarkerProps {
  incidents: Incident[];
  canConfirm: boolean;
  onConfirmIncident: (incidentId: string) => Promise<void>;
}

function IncidentMarker({ incidents, canConfirm, onConfirmIncident }: IncidentMarkerProps) {
  const trustedRoles = new Set(["verified", "police", "security", "journalist", "ong"]);

  const reporterBadge = (role: string | undefined) => {
    if (role === "admin") {
      return (
        <span className="incident-reporter-badge incident-reporter-admin">
          Verified <span className="incident-pin">|</span>
        </span>
      );
    }

    if (role && trustedRoles.has(role)) {
      return (
        <span className="incident-reporter-badge incident-reporter-verified">
          Verified <span className="incident-pin">|</span>
        </span>
      );
    }

    return null;
  };

  const incidentIcon = useMemo(
    () =>
      L.icon({
        iconUrl: "/icons/incident.png",
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -26],
      }),
    [],
  );

  return (
    <>
      {incidents.map((incident) => (
        <Marker key={incident.id} position={incident.position} icon={incidentIcon}>
          <Popup>
            <strong>{incident.type}</strong>
            <br />
            {incident.description}
            {reporterBadge(incident.reporterRole) && (
              <>
                <br />
                {reporterBadge(incident.reporterRole)}
              </>
            )}
            <br />
            <small>Confirmations: {incident.confirmationsCount ?? 0}</small>
            {canConfirm && (
              <>
                <br />
                <button type="button" className="incident-confirm-btn" onClick={() => void onConfirmIncident(incident.id)}>
                  Confirm alert
                </button>
              </>
            )}
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export default IncidentMarker;
