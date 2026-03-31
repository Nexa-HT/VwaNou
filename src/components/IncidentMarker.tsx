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
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

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

  const renderMedia = (url: string) => {
    const fullUrl = `${API_BASE_URL}${url}`;
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.endsWith(".mp4") || lowerUrl.endsWith(".webm") || lowerUrl.endsWith(".mov")) {
      return <video src={fullUrl} controls style={{ width: "100%", maxHeight: "140px", borderRadius: "4px" }} />;
    }
    if (lowerUrl.endsWith(".mp3") || lowerUrl.endsWith(".wav") || lowerUrl.endsWith(".ogg") || lowerUrl.endsWith(".m4a")) {
      return <audio src={fullUrl} controls style={{ width: "100%" }} />;
    }
    return <img src={fullUrl} alt="Preuve" style={{ width: "100%", maxHeight: "140px", objectFit: "cover", borderRadius: "4px" }} />;
  };

  return (
    <>
      {incidents.map((incident) => (
        <Marker key={incident.id} position={incident.position} icon={incidentIcon}>
          <Popup>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {incident.mediaUrl && renderMedia(incident.mediaUrl)}
              <div>
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
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export default IncidentMarker;
