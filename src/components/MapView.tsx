import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import HeatLayer from "./HeatLayer";
import IncidentMarker from "./IncidentMarker";
import UserLocationMarker from "./UserLocationMarker";
import ZonePolygon from "./ZonePolygon";
import LiveMediaRecorder from "./LiveMediaRecorder";
import AlertBanner from "./AlertBanner";
import Sidebar from "./Sidebar";
import FloatingActions from "./FloatingActions";
import {
  api,
  type AdminDashboard,
  type AdminUserListItem,
  type AuthUser,
  type CertificationRequestItem,
  type HeatPoint,
  type TrustedDashboard,
} from "../services/api";
import type { Incident } from "../types/Incident";
import type { Zone } from "../types/Zone";
import { compressMediaFile } from "../utils/mediaCompression";

const HAITI_CENTER: [number, number] = [18.9712, -72.2852];
const USER_ZOOM_LEVEL = 15;
const CATEGORY_OPTIONS = [
  "fire",
  "gunshot",
  "flood",
  "kidnapping",
  "earthquake",
  "landslide",
  "accident",
  "civil unrest",
  "medical emergency",
  "other",
] as const;

const CATEGORY_BASE_LIFETIME_MINUTES: Record<string, number> = {
  fire: 70,
  gunshot: 110,
  flood: 180,
  kidnapping: 140,
  earthquake: 200,
  landslide: 130,
  accident: 75,
  "civil unrest": 100,
  "medical emergency": 90,
  other: 80,
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceKm(a: [number, number], b: [number, number]): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b[0] - a[0]);
  const dLng = toRadians(b[1] - a[1]);
  const lat1 = toRadians(a[0]);
  const lat2 = toRadians(b[0]);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return earthRadiusKm * c;
}

function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];

    const intersects = lngI > lng !== lngJ > lng && lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI + 1e-12) + latI;
    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function normalizeCategory(category: string): string {
  const value = category.trim().toLowerCase();
  return CATEGORY_OPTIONS.includes(value as (typeof CATEGORY_OPTIONS)[number]) ? value : "other";
}

function MapFloatingActions({ onReport }: { onReport: () => void }) {
  const map = useMap();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    let timeoutId: number;

    const fetchLocation = () => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const newLocation: [number, number] = [coords.latitude, coords.longitude];
          setUserLocation(newLocation);
          timeoutId = window.setTimeout(fetchLocation, 5000);
        },
        (error) => {
          console.error("Geolocation error:", error.message);
          timeoutId = window.setTimeout(fetchLocation, 10000);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5_000,
          timeout: 15_000,
        },
      );
    };

    fetchLocation();

    return () => clearTimeout(timeoutId);
  }, []);

  const returnToLocation = () => {
    if (userLocation) {
      map.flyTo(userLocation, USER_ZOOM_LEVEL);
    }
  };

  return <FloatingActions onReport={onReport} onLocate={returnToLocation} />;
}

interface MapViewProps {
  currentUser: AuthUser;
  authToken: string;
  onSignOut: () => void;
}

function MapCenterTracker({ onMoveEnd }: { onMoveEnd: (center: [number, number]) => void }) {
  useMapEvents({
    moveend: (e) => {
      const center = e.target.getCenter();
      onMoveEnd([center.lat, center.lng]);
    },
  });
  return null;
}

function MapView({ currentUser, authToken, onSignOut }: MapViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(HAITI_CENTER);
  const [mapZoom, setMapZoom] = useState(10);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [heatPoints, setHeatPoints] = useState<HeatPoint[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDescription, setReportDescription] = useState("");
  const [reportCategory, setReportCategory] = useState<string>("other");
  const [reportLat, setReportLat] = useState<string>(String(HAITI_CENTER[0]));
  const [reportLng, setReportLng] = useState<string>(String(HAITI_CENTER[1]));
  const [reportError, setReportError] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportMedia, setReportMedia] = useState<File | null>(null);
  const [reportMediaPreview, setReportMediaPreview] = useState<string | null>(null);
  const [reportMediaUrl, setReportMediaUrl] = useState<string | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userModifiedCategory, setUserModifiedCategory] = useState(false);
  const [certificationOpen, setCertificationOpen] = useState(false);
  const [certificationProfession, setCertificationProfession] = useState("");
  const [certificationOrganization, setCertificationOrganization] = useState("");
  const [certificationProofUrl, setCertificationProofUrl] = useState("");
  const [certificationDetails, setCertificationDetails] = useState("");
  const [certificationError, setCertificationError] = useState<string | null>(null);
  const [isSubmittingCertification, setIsSubmittingCertification] = useState(false);
  const [myCertificationRequests, setMyCertificationRequests] = useState<CertificationRequestItem[]>([]);
  const [adminDashboardOpen, setAdminDashboardOpen] = useState(false);
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboard | null>(null);
  const [trustedDashboardOpen, setTrustedDashboardOpen] = useState(false);
  const [trustedDashboard, setTrustedDashboard] = useState<TrustedDashboard | null>(null);
  const [isLoadingTrustedDashboard, setIsLoadingTrustedDashboard] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isLoadingAdminDashboard, setIsLoadingAdminDashboard] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUserListItem[]>([]);

  const loadMapData = useCallback(async () => {
    setIsLoadingData(true);
    setDataError(null);

    try {
      const [mapData, nextZones] = await Promise.all([api.getMapData(), api.getZones()]);
      setIncidents(mapData.incidents);
      setHeatPoints(mapData.heatPoints);
      setZones(nextZones);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load map data.";
      setDataError(message);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  const isAdmin = currentUser.role === "admin";
  const isSuperUser = ["admin", "verified", "police", "security", "journalist", "ong"].includes(currentUser.role);
  const isVerifiedOnly = !isAdmin && isSuperUser;

  const loadMyCertificationRequests = useCallback(async () => {
    if (!authToken) return;
    try {
      const requests = await api.getMyCertificationRequests(authToken);
      setMyCertificationRequests(requests);
    } catch {
      // Ignore this secondary panel error to avoid blocking map rendering.
    }
  }, [authToken]);

  const loadAdminDashboard = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    setIsLoadingAdminDashboard(true);
    setAdminError(null);
    try {
      const dashboard = await api.getAdminDashboard(authToken);
      setAdminDashboard(dashboard);
      const users = await api.getAdminUsers(authToken);
      setAdminUsers(users);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load admin dashboard.";
      setAdminError(message);
    } finally {
      setIsLoadingAdminDashboard(false);
    }
  }, [authToken, isAdmin]);

  const loadTrustedDashboard = useCallback(async () => {
    if (!isSuperUser) {
      return;
    }

    setIsLoadingTrustedDashboard(true);
    setDataError(null);
    try {
      const dashboard = await api.getTrustedDashboard(authToken);
      setTrustedDashboard(dashboard);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load trusted dashboard.";
      setDataError(message);
    } finally {
      setIsLoadingTrustedDashboard(false);
    }
  }, [authToken, isSuperUser]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location: [number, number] = [coords.latitude, coords.longitude];
        setMapCenter(location);
        setMapZoom(USER_ZOOM_LEVEL);
      },
      (error) => {
        console.error("Geolocation error:", error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      },
    );
  }, []);

  useEffect(() => {
    if (!userModifiedCategory) {
      if (reportDescription.trim().length <= 3) {
        setReportCategory("other");
        return;
      }

      const lowerDesc = reportDescription.toLowerCase();
      const keywordMap: Record<string, string[]> = {
        "gunshot": ["tirs", "tir", "arme", "fusillade", "gang", "balle", "agression", "braquage", "vol", "zam", "tire", "bal", "kout zam", "vòlè", "asasen", "brakaj"],
        "fire": ["feu", "incendie", "brûle", "fumée", "dife", "boule", "lafimen"],
        "accident": ["accident", "circulation", "voiture", "moto", "aksidan", "machin", "kamyon"],
        "civil unrest": ["bloqué", "blocus", "barricade", "manifestation", "pneu", "grève", "bloke", "barikad", "manifestasyon", "kawotchou", "grev", "fè nwa"],
        "medical emergency": ["blessé", "sang", "hopital", "malaise", "mort", "urgence", "frappe", "violences", "blese", "san", "lopital", "mouri", "malad"],
        "kidnapping": ["kidnapping", "enlèvement", "otage", "kidnape", "kidnapin"],
        "earthquake": ["séisme", "tremblement", "secousse", "tranbleman", "tè tranble"],
        "landslide": ["glissement", "éboulement", "eboulman", "tè glise", "te glise"],
        "flood": ["inondation", "eau", "crue", "rivière", "ouragan", "tempête", "inondasyon", "dlo desann", "dlo", "rivyè", "lavalas", "siklon", "tanpèt"],
        "other": ["suspect", "rôde", "inconnu", "disparu", "sispèk", "moun pèdi", "vòlò"],
      };

      let matched = "other";
      for (const [cat, words] of Object.entries(keywordMap)) {
        if (words.some((w) => lowerDesc.includes(w))) {
          matched = cat;
          break;
        }
      }
      setReportCategory(matched);
    }
  }, [reportDescription, userModifiedCategory]);

  useEffect(() => {
    void loadMapData();
  }, [loadMapData]);

  useEffect(() => {
    void loadMyCertificationRequests();
  }, [loadMyCertificationRequests]);

  const openReportForm = () => {
    setMenuOpen(false);
    setReportError(null);
    setReportLat(mapCenter[0].toFixed(6));
    setReportLng(mapCenter[1].toFixed(6));
    setReportOpen(true);
  };

  const closeReportForm = () => {
    setReportOpen(false);
    setReportError(null);
    setReportCategory("other");
    setReportDescription("");
    setReportMedia(null);
    setReportMediaPreview(null);
    setReportMediaUrl(null);
    setShowRecorder(false);
    setIsAnalyzing(false);
    setUserModifiedCategory(false);
  };

  const openCertificationForm = () => {
    setMenuOpen(false);
    setCertificationError(null);
    setCertificationOpen(true);
  };

  const closeCertificationForm = () => {
    setCertificationOpen(false);
    setCertificationError(null);
  };

  const openAdminDashboard = () => {
    setMenuOpen(false);
    setAdminDashboardOpen(true);
    void loadAdminDashboard();
  };

  const openTrustedDashboard = () => {
    setMenuOpen(false);
    setTrustedDashboardOpen(true);
    void loadTrustedDashboard();
  };

  const submitReport = async () => {
    const lat = Number(reportLat);
    const lng = Number(reportLng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setReportError("Latitude and longitude must be valid numbers.");
      return;
    }

    setIsSubmittingReport(true);
    setReportError(null);

    try {
      await api.submitIncident(authToken, {
        description: reportDescription.trim(),
        category: normalizeCategory(reportCategory),
        lat,
        lng,
        image_url: reportMediaUrl || undefined,
      });
      setReportOpen(false);
      setReportCategory("other");
      setReportDescription("");
      setReportMedia(null);
      setReportMediaPreview(null);
      setReportMediaUrl(null);
      setShowRecorder(false);
      setIsAnalyzing(false);
      await loadMapData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit report right now.";
      setReportError(message);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const submitCertificationRequest = async () => {
    if (!certificationProfession.trim() || !certificationProofUrl.trim()) {
      setCertificationError("Profession and proof URL are required.");
      return;
    }

    setIsSubmittingCertification(true);
    setCertificationError(null);
    try {
      await api.submitCertificationRequest(authToken, {
        profession: certificationProfession.trim(),
        organization: certificationOrganization.trim() || undefined,
        proof_url: certificationProofUrl.trim(),
        details: certificationDetails.trim() || undefined,
      });
      setCertificationOpen(false);
      setCertificationProfession("");
      setCertificationOrganization("");
      setCertificationProofUrl("");
      setCertificationDetails("");
      await loadMyCertificationRequests();
      if (isAdmin) {
        await loadAdminDashboard();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit certification request right now.";
      setCertificationError(message);
    } finally {
      setIsSubmittingCertification(false);
    }
  };

  const confirmIncident = async (incidentId: string) => {
    try {
      const confirmationsCount = await api.confirmIncident(authToken, incidentId);
      setIncidents((previous) =>
        previous.map((item) => (item.id === incidentId ? { ...item, confirmationsCount } : item)),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to confirm this alert.";
      setDataError(message);
    }
  };

  const removeAlertAsAdmin = async (incidentId: string) => {
    try {
      await api.deleteIncidentAsAdmin(authToken, incidentId);
      await loadMapData();
      await loadAdminDashboard();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to remove alert.";
      setAdminError(message);
    }
  };

  const reviewCertificationRequest = async (requestId: string, status: "approved" | "rejected") => {
    try {
      await api.reviewCertificationRequest(authToken, requestId, status);
      await loadAdminDashboard();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to review certification request.";
      setAdminError(message);
    }
  };

  const promoteToAdmin = async (userId: string) => {
    try {
      await api.promoteUserToAdmin(authToken, userId);
      await loadAdminDashboard();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to promote user.";
      setAdminError(message);
    }
  };

  const menuItems = useMemo(() => {
    const base = [
      { label: "Profile", hint: "Identity and trust score" },
      { label: "Report Alert", hint: "Create a new incident report" },
      { label: "Certified Mode", hint: "Apply as a trusted professional" },
      { label: "Alerts Feed", hint: "Live alerts near you" },
      { label: "My Reports", hint: "Track submitted reports" },
      { label: "Safe Zones", hint: "Nearest safer areas" },
      { label: "Settings", hint: "Language and notifications" },
      { label: "Help", hint: "Emergency numbers and guidance" },
    ];

    if (isAdmin) {
      return [{ label: "Admin Dashboard", hint: "Moderate alerts, users, and upgrade requests" }, ...base];
    }

    if (isVerifiedOnly) {
      return [{ label: "Trusted Dashboard", hint: "Confirm incoming alerts" }, ...base];
    }

    return base;
  }, [isAdmin, isVerifiedOnly]);

  const roleDistributionMax = Math.max(...(adminDashboard?.roleDistribution.map((item) => item.count) ?? [1]));
  const categoryDistributionMax = Math.max(...(adminDashboard?.alertsByCategory.map((item) => item.count) ?? [1]));
  const certificationTotal =
    adminDashboard?.certificationStatusCounts.reduce((sum, item) => sum + item.count, 0) ?? 0;

  const visibleIncidents = useMemo<Incident[]>(() => {
    const nowMs = Date.now();
    const computed = incidents
      .map((incident) => {
        const category = normalizeCategory(incident.type);
        const createdAtMs = incident.createdAt ? new Date(incident.createdAt).getTime() : nowMs;
        const ageMinutes = Math.max(0, (nowMs - createdAtMs) / 60000);

        const zoneId =
          zones.find((zone) => isPointInPolygon(incident.position, zone.coordinates))?.id ??
          `${incident.position[0].toFixed(2)}:${incident.position[1].toFixed(2)}`;

        const sameAreaCategoryCount = incidents.filter((other) => {
          if (normalizeCategory(other.type) !== category) {
            return false;
          }

          const otherZoneId =
            zones.find((zone) => isPointInPolygon(other.position, zone.coordinates))?.id ??
            `${other.position[0].toFixed(2)}:${other.position[1].toFixed(2)}`;
          return otherZoneId === zoneId || distanceKm(incident.position, other.position) <= 1.2;
        }).length;

        const baseLifetime = CATEGORY_BASE_LIFETIME_MINUTES[category] ?? CATEGORY_BASE_LIFETIME_MINUTES.other;
        const extendedLifetime = baseLifetime * (1 + Math.min(6, Math.max(0, sameAreaCategoryCount - 1)) * 0.35);

        if (ageMinutes >= extendedLifetime) {
          return null;
        }

        const fadeStart = extendedLifetime * 0.55;
        const opacity =
          ageMinutes <= fadeStart ? 1 : Math.max(0.08, 1 - (ageMinutes - fadeStart) / Math.max(1, extendedLifetime - fadeStart));

        return {
          ...incident,
          type: category,
          displayOpacity: opacity,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return computed;
  }, [incidents, zones]);

  const dynamicHeatPoints = useMemo<HeatPoint[]>(
    () =>
      visibleIncidents.map((incident) => ({
        lat: incident.position[0],
        lng: incident.position[1],
        intensity: Math.max(0.12, incident.displayOpacity ?? 0.7),
      })),
    [visibleIncidents],
  );


  const pendingMyCertification = myCertificationRequests.some((item) => item.status === "pending");
  const unconfirmedAlertsForSuperUsers = visibleIncidents.filter((incident) => (incident.confirmationsCount ?? 0) === 0).length;

  const initials = currentUser.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="map-shell">
      <AlertBanner incidents={visibleIncidents} />
      <Sidebar incidents={visibleIncidents} zones={zones} />
      <MapContainer center={mapCenter} zoom={mapZoom} className="map-container" scrollWheelZoom>
        <MapCenterTracker onMoveEnd={setMapCenter} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HeatLayer points={dynamicHeatPoints.length > 0 ? dynamicHeatPoints : heatPoints} />
        <IncidentMarker incidents={visibleIncidents} canConfirm={isSuperUser} onConfirmIncident={confirmIncident} />
        <UserLocationMarker />
        <ZonePolygon zones={zones} />
        <MapFloatingActions onReport={openReportForm} />
      </MapContainer>

      {isSuperUser && unconfirmedAlertsForSuperUsers > 0 && (
        <div className="map-status map-status-superuser">
          {unconfirmedAlertsForSuperUsers} new alerts awaiting trusted confirmation
        </div>
      )}

      {isLoadingData && <div className="map-status map-status-loading">Loading incidents and zones...</div>}

      {dataError && (
        <div className="map-status map-status-error" role="alert">
          <span>{dataError}</span>
          <button type="button" onClick={() => void loadMapData()}>
            Retry
          </button>
        </div>
      )}



      {reportOpen && (
        <div className="report-modal-backdrop" role="presentation" onClick={closeReportForm}>
          <section
            className="report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="report-modal-title">Submit incident report</h2>
            <p>Reports are linked to your account and analyzed for urgency.</p>

            <label>
              Description (optionnel)
              <textarea
                value={reportDescription}
                onChange={(event) => setReportDescription(event.target.value)}
                placeholder="Décrivez ce qu'il se passe..."
              />
            </label>

            <label>
              Category
              <select
                value={reportCategory}
                onChange={(event) => {
                  setReportCategory(event.target.value);
                  setUserModifiedCategory(true);
                }}
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            {showRecorder ? (
              <LiveMediaRecorder 
                onCapture={async (file, transcript) => {
                  try {
                    setIsAnalyzing(true);
                    setReportError(null);
                    setShowRecorder(false);
                    
                    if (file.type.startsWith("image/")) {
                      setReportMediaPreview(URL.createObjectURL(file));
                    } else {
                      setReportMediaPreview(null);
                    }
                    setReportMedia(file);

                    const compressed = await compressMediaFile(file);
                    const uploadResult = await api.uploadIncidentMedia(authToken, compressed);
                    setReportMediaUrl(uploadResult.url);

                    let desc = reportDescription;
                    if (transcript) {
                      desc = desc ? `${desc}\n[Vocal]: ${transcript}` : `[Vocal]: ${transcript}`;
                      setReportDescription(desc);
                    }

                    const analyzeResult = await api.analyzeMedia(authToken, {
                       description: desc,
                       media_url: uploadResult.url,
                       transcript: transcript
                    });
                    
                    if (analyzeResult.category && analyzeResult.category !== "unknown") {
                       setReportCategory(analyzeResult.category);
                    }
                  } catch (e) {
                     console.error("Erreur d'analyse IA:", e);
                  } finally {
                    setIsAnalyzing(false);
                  }
                }} 
                onCancel={() => setShowRecorder(false)} 
              />
            ) : (
              <div className="report-media-upload" style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px", marginBottom: "16px" }}>
                <label style={{ fontSize: "14px", fontWeight: "600", color: "white" }}>
                  Preuve Vérifiée On-site (Live) - Optionnel
                </label>
                {!reportMedia && !isAnalyzing && (
                  <button 
                    type="button" 
                    className="report-secondary" 
                    onClick={() => setShowRecorder(true)} 
                    style={{ marginTop: "4px", padding: "10px", display: "flex", justifyContent: "center", gap: "8px", alignItems: "center" }}
                  >
                    <span>🔴 Capturer (Caméra / Micro)</span>
                  </button>
                )}
                {isAnalyzing && (
                  <p style={{ fontSize: "12px", color: "var(--accent-teal)", margin: "0" }}>
                    🤖 Analyse IA de la preuve en cours...
                  </p>
                )}
                {reportMediaPreview && !isAnalyzing && (
                  <img 
                    src={reportMediaPreview} 
                    alt="Aperçu" 
                    style={{ width: "100%", maxHeight: "160px", objectFit: "cover", borderRadius: "6px" }} 
                  />
                )}
                {reportMedia && !reportMediaPreview && !isAnalyzing && (
                  <p style={{ fontSize: "12px", color: "var(--accent-teal)", margin: "0" }}>
                    Fichier capturé : {reportMedia.name}
                  </p>
                )}
                {reportMedia && !isAnalyzing && (
                  <button type="button" onClick={() => { setReportMedia(null); setReportMediaPreview(null); setReportMediaUrl(null); }} style={{ background: "transparent", color: "#ef4444", border: "none", alignSelf: "flex-start", fontSize: "12px", cursor: "pointer", padding: "0" }}>
                    ✕ Supprimer la preuve
                  </button>
                )}
              </div>
            )}

            {reportError && (
              <p className="report-modal-error" role="alert">
                {reportError}
              </p>
            )}

            <div className="report-modal-actions">
              <button type="button" className="report-secondary" onClick={closeReportForm}>
                Cancel
              </button>
              <button
                type="button"
                className="report-primary"
                onClick={() => void submitReport()}
                disabled={isSubmittingReport}
              >
                {isSubmittingReport ? "Submitting..." : "Submit report"}
              </button>
            </div>
          </section>
        </div>
      )}

      {certificationOpen && (
        <div className="report-modal-backdrop" role="presentation" onClick={closeCertificationForm}>
          <section
            className="report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="certification-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="certification-modal-title">Apply for Certified User mode</h2>
            <p>For ONG, journalists, police, and other trusted professionals. Add proof for review by VwaNou admins.</p>

            <label>
              Profession
              <input
                type="text"
                value={certificationProfession}
                onChange={(event) => setCertificationProfession(event.target.value)}
                placeholder="Journalist, ONG, police..."
                required
              />
            </label>

            <label>
              Organization (optional)
              <input
                type="text"
                value={certificationOrganization}
                onChange={(event) => setCertificationOrganization(event.target.value)}
                placeholder="Organization or institution"
              />
            </label>

            <label>
              Proof URL
              <input
                type="url"
                value={certificationProofUrl}
                onChange={(event) => setCertificationProofUrl(event.target.value)}
                placeholder="Link to badge, credential, or profile"
                required
              />
            </label>

            <label>
              Additional details (optional)
              <textarea
                value={certificationDetails}
                onChange={(event) => setCertificationDetails(event.target.value)}
                placeholder="Any context for admin review"
              />
            </label>

            {certificationError && (
              <p className="report-modal-error" role="alert">
                {certificationError}
              </p>
            )}

            <div className="report-modal-actions">
              <button type="button" className="report-secondary" onClick={closeCertificationForm}>
                Cancel
              </button>
              <button
                type="button"
                className="report-primary"
                onClick={() => void submitCertificationRequest()}
                disabled={isSubmittingCertification}
              >
                {isSubmittingCertification ? "Submitting..." : "Submit request"}
              </button>
            </div>
          </section>
        </div>
      )}

      {adminDashboardOpen && (
        <div className="report-modal-backdrop" role="presentation" onClick={() => setAdminDashboardOpen(false)}>
          <section
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-dashboard-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="admin-dashboard-title">VwaNou Admin Dashboard</h2>
            <p>Moderate alerts, process certification upgrades, and monitor trusted confirmations.</p>

            {adminError && <p className="report-modal-error">{adminError}</p>}

            {isLoadingAdminDashboard && <p>Loading dashboard...</p>}

            {adminDashboard && (
              <>
                <div className="admin-kpis">
                  <article>
                    <strong>{adminDashboard.pendingCertificationRequests}</strong>
                    <span>Pending certified requests</span>
                  </article>
                  <article>
                    <strong>{adminDashboard.unconfirmedRecentAlerts}</strong>
                    <span>Recent alerts without confirmations</span>
                  </article>
                  <article>
                    <strong>{adminDashboard.totalUsers}</strong>
                    <span>Total registered users</span>
                  </article>
                  <article>
                    <strong>{adminDashboard.verifiedUsers}</strong>
                    <span>Verified and trusted users</span>
                  </article>
                  <article>
                    <strong>{adminDashboard.totalAlerts}</strong>
                    <span>Total alerts reported</span>
                  </article>
                  <article>
                    <strong>{adminDashboard.alertsLast24h}</strong>
                    <span>Alerts reported in last 24h</span>
                  </article>
                </div>

                <div className="admin-charts">
                  <section>
                    <h3>User distribution</h3>
                    <div className="admin-chart-list">
                      {adminDashboard.roleDistribution.map((item) => (
                        <div key={item.label} className="admin-chart-row">
                          <div className="admin-chart-label">
                            <span>{item.label}</span>
                            <strong>{item.count}</strong>
                          </div>
                          <div className="admin-chart-track">
                            <div
                              className="admin-chart-bar admin-chart-bar-users"
                              style={{ width: `${Math.max(8, (item.count / roleDistributionMax) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="admin-mini-stats">
                      <span>Admins: {adminDashboard.adminUsers}</span>
                      <span>Regular: {adminDashboard.regularUsers}</span>
                    </div>
                  </section>

                  <section>
                    <h3>Alerts by category</h3>
                    <div className="admin-chart-list">
                      {adminDashboard.alertsByCategory.map((item) => (
                        <div key={item.label} className="admin-chart-row">
                          <div className="admin-chart-label">
                            <span>{item.label}</span>
                            <strong>{item.count}</strong>
                          </div>
                          <div className="admin-chart-track">
                            <div
                              className="admin-chart-bar admin-chart-bar-alerts"
                              style={{ width: `${Math.max(8, (item.count / categoryDistributionMax) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3>Certification request statuses</h3>
                    <div className="admin-chart-list">
                      {adminDashboard.certificationStatusCounts.map((item) => {
                        const ratio = certificationTotal ? (item.count / certificationTotal) * 100 : 0;
                        return (
                          <div key={item.label} className="admin-chart-row">
                            <div className="admin-chart-label">
                              <span>{item.label}</span>
                              <strong>{item.count}</strong>
                            </div>
                            <div className="admin-chart-track">
                              <div
                                className="admin-chart-bar admin-chart-bar-certifications"
                                style={{ width: `${Math.max(8, ratio)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>

                <div className="admin-grid">
                  <section>
                    <h3>Latest alerts</h3>
                    <ul>
                      {adminDashboard.latestAlerts.map((alert) => (
                        <li key={alert.id}>
                          <div>
                            <strong>{alert.type}</strong>
                            <small>{alert.description}</small>
                            <small>Confirmations: {alert.confirmationsCount ?? 0}</small>
                          </div>
                          <button type="button" onClick={() => void removeAlertAsAdmin(alert.id)}>
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h3>Certification requests</h3>
                    <ul>
                      {adminDashboard.latestCertificationRequests.map((request) => (
                        <li key={request.id}>
                          <div>
                            <strong>
                              {request.user.name} - {request.profession}
                            </strong>
                            <small>{request.user.email}</small>
                            <small>Status: {request.status}</small>
                            <a href={request.proofUrl} target="_blank" rel="noreferrer">
                              View proof
                            </a>
                          </div>

                          {request.status === "pending" && (
                            <div className="admin-actions-inline">
                              <button type="button" onClick={() => void reviewCertificationRequest(request.id, "approved")}>
                                Approve
                              </button>
                              <button type="button" onClick={() => void reviewCertificationRequest(request.id, "rejected")}>
                                Reject
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                <section className="admin-user-management">
                  <h3>Admin user management</h3>
                  <p>Promote trusted users to admin role.</p>
                  <ul>
                    {adminUsers.map((userItem) => (
                      <li key={userItem.id}>
                        <div>
                          <strong>{userItem.name}</strong>
                          <small>{userItem.email}</small>
                          <small>Role: {userItem.role}</small>
                        </div>
                        {userItem.role !== "admin" && (
                          <button type="button" onClick={() => void promoteToAdmin(userItem.id)}>
                            Make admin
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}

            <div className="report-modal-actions">
              <button type="button" className="report-secondary" onClick={() => setAdminDashboardOpen(false)}>
                Close
              </button>
              <button type="button" className="report-primary" onClick={() => void loadAdminDashboard()}>
                Refresh
              </button>
            </div>
          </section>
        </div>
      )}

      {trustedDashboardOpen && (
        <div className="report-modal-backdrop" role="presentation" onClick={() => setTrustedDashboardOpen(false)}>
          <section
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trusted-dashboard-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="trusted-dashboard-title">Trusted User Dashboard</h2>
            <p>Focused view for verified users to validate new alerts quickly.</p>

            {isLoadingTrustedDashboard && <p>Loading trusted dashboard...</p>}

            {trustedDashboard && (
              <>
                <div className="admin-kpis">
                  <article>
                    <strong>{trustedDashboard.pendingUnconfirmedAlerts}</strong>
                    <span>Alerts pending trusted confirmation</span>
                  </article>
                </div>

                <div className="admin-charts">
                  <section>
                    <h3>Alerts by category</h3>
                    <div className="admin-chart-list">
                      {trustedDashboard.alertsByCategory.map((item) => (
                        <div key={item.label} className="admin-chart-row">
                          <div className="admin-chart-label">
                            <span>{item.label}</span>
                            <strong>{item.count}</strong>
                          </div>
                          <div className="admin-chart-track">
                            <div className="admin-chart-bar admin-chart-bar-alerts" style={{ width: `${Math.max(8, item.count * 10)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="admin-grid">
                  <section>
                    <h3>Latest alerts to review</h3>
                    <ul>
                      {trustedDashboard.latestAlerts.map((alert) => (
                        <li key={alert.id}>
                          <div>
                            <strong>{alert.type}</strong>
                            <small>{alert.description}</small>
                            <small>Confirmations: {alert.confirmationsCount ?? 0}</small>
                          </div>
                          <button type="button" onClick={() => void confirmIncident(alert.id)}>
                            Confirm
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </>
            )}

            <div className="report-modal-actions">
              <button type="button" className="report-secondary" onClick={() => setTrustedDashboardOpen(false)}>
                Close
              </button>
              <button type="button" className="report-primary" onClick={() => void loadTrustedDashboard()}>
                Refresh
              </button>
            </div>
          </section>
        </div>
      )}

      <div className="map-menu">
        <button
          type="button"
          className="map-menu-trigger"
          onClick={() => setMenuOpen((current) => !current)}
          aria-expanded={menuOpen}
          aria-controls="map-user-menu"
        >
          <span className="map-menu-avatar">{initials || "U"}</span>
          <span className="map-menu-trigger-label">Menu</span>
        </button>

        {menuOpen && (
          <div id="map-user-menu" className="map-menu-panel">
            <div className="map-menu-profile">
              <strong>{currentUser.name}</strong>
              <small>{currentUser.role} reporter</small>
              {pendingMyCertification && <small>Certification request pending review</small>}
            </div>

            <ul className="map-menu-list">
              {menuItems.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    className="map-menu-item"
                    onClick={() => {
                      if (item.label === "Report Alert") {
                        openReportForm();
                      }
                      if (item.label === "Certified Mode") {
                        openCertificationForm();
                      }
                      if (item.label === "Admin Dashboard" && isAdmin) {
                        openAdminDashboard();
                      }
                      if (item.label === "Trusted Dashboard" && isVerifiedOnly) {
                        openTrustedDashboard();
                      }
                    }}
                  >
                    <span>{item.label}</span>
                    <small>{item.hint}</small>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" className="map-menu-item" onClick={onSignOut}>
                  <span>Sign out</span>
                  <small>Return to login screen</small>
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapView;
