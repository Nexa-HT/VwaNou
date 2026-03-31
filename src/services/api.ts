import type { Incident } from "../types/Incident";
import type { Zone } from "../types/Zone";

export interface HeatPoint {
  lat: number;
  lng: number;
  intensity: number;
}

interface BackendIncident {
  id: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  confirmations_count?: number;
  reporter_name?: string;
  reporter_role?: string;
  image_url?: string;
  created_at?: string;
}

interface BackendMapData {
  incidents: BackendIncident[];
  heatmap_points: HeatPoint[];
}

interface BackendZone {
  id: string;
  name: string;
  level: "low" | "medium" | "high";
  coordinates: [number, number][];
}

interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: string;
  trust_points: number;
}

interface BackendAuthResponse {
  access_token: string;
  token_type: string;
  user: BackendUser;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  trustPoints: number;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

interface RegisterUserPayload {
  name: string;
  email: string;
  password: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface AnalyzeMediaPayload {
  description?: string;
  media_url?: string;
  transcript?: string;
}

interface IncidentCreatePayload {
  description: string;
  category: string;
  lat: number;
  lng: number;
  image_url?: string;
}

interface CertificationRequestPayload {
  profession: string;
  organization?: string;
  proof_url: string;
  details?: string;
}

export interface CertificationRequestItem {
  id: string;
  userId: string;
  profession: string;
  organization: string | null;
  proofUrl: string;
  details: string | null;
  status: "pending" | "approved" | "rejected";
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface BackendCertificationRequest {
  id: string;
  user_id: string;
  profession: string;
  organization: string | null;
  proof_url: string;
  details: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface BackendAdminDashboard {
  pending_certification_requests: number;
  unconfirmed_recent_alerts: number;
  total_users: number;
  verified_users: number;
  admin_users: number;
  regular_users: number;
  total_alerts: number;
  alerts_last_24h: number;
  role_distribution: { label: string; count: number }[];
  alerts_by_category: { label: string; count: number }[];
  certification_status_counts: { label: string; count: number }[];
  latest_alerts: BackendIncident[];
  latest_certification_requests: BackendCertificationRequest[];
}

interface BackendTrustedDashboard {
  pending_unconfirmed_alerts: number;
  alerts_by_category: { label: string; count: number }[];
  latest_alerts: BackendIncident[];
}

export interface AdminDashboard {
  pendingCertificationRequests: number;
  unconfirmedRecentAlerts: number;
  totalUsers: number;
  verifiedUsers: number;
  adminUsers: number;
  regularUsers: number;
  totalAlerts: number;
  alertsLast24h: number;
  roleDistribution: { label: string; count: number }[];
  alertsByCategory: { label: string; count: number }[];
  certificationStatusCounts: { label: string; count: number }[];
  latestAlerts: Incident[];
  latestCertificationRequests: CertificationRequestItem[];
}

export interface TrustedDashboard {
  pendingUnconfirmedAlerts: number;
  alertsByCategory: { label: string; count: number }[];
  latestAlerts: Incident[];
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
let unauthorizedHandler: (() => void) | null = null;

const zoneRiskLevelByBackendLevel: Record<BackendZone["level"], Zone["riskLevel"]> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (response.status === 401 && !path.startsWith("/auth/")) {
    unauthorizedHandler?.();
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}) for ${path}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function toIncident(incident: BackendIncident): Incident {
  return {
    id: incident.id,
    type: incident.category,
    description: incident.description,
    position: [incident.lat, incident.lng],
    confirmationsCount: incident.confirmations_count ?? 0,
    reporterName: incident.reporter_name,
    reporterRole: incident.reporter_role,
    createdAt: incident.created_at,
    mediaUrl: incident.image_url,
  };
}

function toCertificationRequest(item: BackendCertificationRequest): CertificationRequestItem {
  return {
    id: item.id,
    userId: item.user_id,
    profession: item.profession,
    organization: item.organization,
    proofUrl: item.proof_url,
    details: item.details,
    status: item.status,
    adminNote: item.admin_note,
    createdAt: item.created_at,
    reviewedAt: item.reviewed_at,
    user: item.user,
  };
}

function toZone(zone: BackendZone): Zone {
  return {
    id: zone.id,
    name: zone.name,
    riskLevel: zoneRiskLevelByBackendLevel[zone.level],
    coordinates: zone.coordinates,
  };
}

function toAuthUser(user: BackendUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    trustPoints: user.trust_points,
  };
}

function toAuthSession(response: BackendAuthResponse): AuthSession {
  return {
    token: response.access_token,
    user: toAuthUser(response.user),
  };
}

export const api = {
  setUnauthorizedHandler: (handler: (() => void) | null) => {
    unauthorizedHandler = handler;
  },

  getMapData: async (): Promise<{ incidents: Incident[]; heatPoints: HeatPoint[] }> => {
    const data = await requestJson<BackendMapData>("/incidents/map-data");
    return {
      incidents: data.incidents.map(toIncident),
      heatPoints: data.heatmap_points,
    };
  },

  getIncidents: async (): Promise<Incident[]> => {
    const incidents = await requestJson<BackendIncident[]>("/incidents");
    return incidents.map(toIncident);
  },

  getHeatPoints: async (): Promise<HeatPoint[]> => {
    const data = await requestJson<BackendMapData>("/incidents/map-data");
    return data.heatmap_points;
  },

  getZones: async (): Promise<Zone[]> => {
    const zones = await requestJson<BackendZone[]>("/zones");
    return zones.map(toZone);
  },

  signUp: async (payload: RegisterUserPayload): Promise<AuthSession> => {
    const response = await requestJson<BackendAuthResponse>("/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return toAuthSession(response);
  },

  signIn: async (payload: LoginPayload): Promise<AuthSession> => {
    const response = await requestJson<BackendAuthResponse>("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return toAuthSession(response);
  },

  uploadIncidentMedia: async (token: string, file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await requestJson<{ url: string }>("/incidents/upload-media", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return response;
  },

  analyzeMedia: async (token: string, payload: AnalyzeMediaPayload): Promise<{ category: string; urgency: number }> => {
    const response = await requestJson<{ category: string; urgency: number }>("/incidents/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return response;
  },

  submitIncident: async (token: string, payload: IncidentCreatePayload): Promise<Incident> => {
    const incident = await requestJson<BackendIncident>("/incidents/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    return toIncident(incident);
  },

  confirmIncident: async (token: string, incidentId: string): Promise<number> => {
    const response = await requestJson<{ confirmations_count: number }>(`/incidents/${incidentId}/confirm`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.confirmations_count;
  },

  submitCertificationRequest: async (
    token: string,
    payload: CertificationRequestPayload,
  ): Promise<CertificationRequestItem> => {
    const response = await requestJson<BackendCertificationRequest>("/certifications/apply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return toCertificationRequest(response);
  },

  getMyCertificationRequests: async (token: string): Promise<CertificationRequestItem[]> => {
    const response = await requestJson<BackendCertificationRequest[]>("/certifications/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.map(toCertificationRequest);
  },

  getAdminDashboard: async (token: string): Promise<AdminDashboard> => {
    const response = await requestJson<BackendAdminDashboard>("/admin/dashboard", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return {
      pendingCertificationRequests: response.pending_certification_requests,
      unconfirmedRecentAlerts: response.unconfirmed_recent_alerts,
      totalUsers: response.total_users,
      verifiedUsers: response.verified_users,
      adminUsers: response.admin_users,
      regularUsers: response.regular_users,
      totalAlerts: response.total_alerts,
      alertsLast24h: response.alerts_last_24h,
      roleDistribution: response.role_distribution,
      alertsByCategory: response.alerts_by_category,
      certificationStatusCounts: response.certification_status_counts,
      latestAlerts: response.latest_alerts.map(toIncident),
      latestCertificationRequests: response.latest_certification_requests.map(toCertificationRequest),
    };
  },

  getTrustedDashboard: async (token: string): Promise<TrustedDashboard> => {
    const response = await requestJson<BackendTrustedDashboard>("/trusted/dashboard", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      pendingUnconfirmedAlerts: response.pending_unconfirmed_alerts,
      alertsByCategory: response.alerts_by_category,
      latestAlerts: response.latest_alerts.map(toIncident),
    };
  },

  getAdminUsers: async (token: string): Promise<AdminUserListItem[]> => {
    return requestJson<AdminUserListItem[]>("/admin/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  promoteUserToAdmin: async (token: string, userId: string): Promise<void> => {
    await requestJson(`/admin/users/${userId}/promote-admin`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  reviewCertificationRequest: async (
    token: string,
    requestId: string,
    status: "approved" | "rejected",
    adminNote?: string,
  ): Promise<CertificationRequestItem> => {
    const response = await requestJson<BackendCertificationRequest>(`/admin/certification-requests/${requestId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, admin_note: adminNote || null }),
    });
    return toCertificationRequest(response);
  },

  deleteIncidentAsAdmin: async (token: string, incidentId: string): Promise<void> => {
    await requestJson(`/admin/incidents/${incidentId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
