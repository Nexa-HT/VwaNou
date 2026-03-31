import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: str
    created_at: datetime
    trust_points: int


class UserSummary(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: str


class UserVerifyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    sub: str
    exp: int


class IncidentReportCreate(BaseModel):
    description: str | None = Field(default=None, max_length=2000)
    category: str | None = None
    lat: float
    lng: float
    image_url: str | None = None


class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    category: str
    description: str
    lat: float
    lng: float
    urgency: int
    confidence_score: float
    confirmations_count: int = 0
    reporter_name: str | None = None
    reporter_role: str | None = None
    image_url: str | None = None
    created_at: datetime


class IncidentConfirmResponse(BaseModel):
    incident_id: uuid.UUID
    confirmations_count: int


class AnalyzeMediaRequest(BaseModel):
    description: str | None = None
    media_url: str | None = None
    transcript: str | None = None


class AnalyzeMediaResponse(BaseModel):
    category: str
    urgency: int


class Token(BaseModel):
    lat: float
    lng: float
    intensity: float


class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    intensity: float


class IncidentCluster(BaseModel):
    lat: float
    lng: float
    count: int
    incident_ids: list[uuid.UUID]


class IncidentMapDataResponse(BaseModel):
    incidents: list[IncidentResponse]
    heatmap_points: list[HeatmapPoint]
    clusters: list[IncidentCluster]


class CertificationRequestCreate(BaseModel):
    profession: str = Field(min_length=2, max_length=120)
    organization: str | None = Field(default=None, max_length=160)
    proof_url: str = Field(min_length=8, max_length=500)
    details: str | None = Field(default=None, max_length=1000)


class CertificationRequestReview(BaseModel):
    status: str = Field(pattern="^(approved|rejected)$")
    admin_note: str | None = Field(default=None, max_length=600)


class CertificationRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    profession: str
    organization: str | None = None
    proof_url: str
    details: str | None = None
    status: str
    admin_note: str | None = None
    created_at: datetime
    reviewed_at: datetime | None = None
    reviewed_by: uuid.UUID | None = None
    user: UserSummary


class MetricCount(BaseModel):
    label: str
    count: int


class TrustedDashboardResponse(BaseModel):
    pending_unconfirmed_alerts: int
    alerts_by_category: list[MetricCount]
    latest_alerts: list[IncidentResponse]


class AdminUserListItem(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: str


class PromoteUserResponse(BaseModel):
    id: uuid.UUID
    role: str


class AdminDashboardResponse(BaseModel):
    pending_certification_requests: int
    unconfirmed_recent_alerts: int
    total_users: int
    verified_users: int
    admin_users: int
    regular_users: int
    total_alerts: int
    alerts_last_24h: int
    role_distribution: list[MetricCount]
    alerts_by_category: list[MetricCount]
    certification_status_counts: list[MetricCount]
    latest_alerts: list[IncidentResponse]
    latest_certification_requests: list[CertificationRequestResponse]


class ZoneBase(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    level: str = Field(pattern="^(low|medium|high)$")
    coordinates: list[list[float]]


class ZoneCreate(ZoneBase):
    pass


class ZoneResponse(ZoneBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    updated_at: datetime
