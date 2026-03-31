import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    role: Mapped[str] = mapped_column(String(20), default="regular", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    trust_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    reports: Mapped[list["Report"]] = relationship("Report", back_populates="user")
    certification_requests: Mapped[list["CertificationRequest"]] = relationship(
        "CertificationRequest",
        back_populates="user",
        foreign_keys="CertificationRequest.user_id",
    )
    reviewed_certification_requests: Mapped[list["CertificationRequest"]] = relationship(
        "CertificationRequest",
        back_populates="reviewed_by_user",
        foreign_keys="CertificationRequest.reviewed_by",
    )
    confirmations: Mapped[list["ReportConfirmation"]] = relationship("ReportConfirmation", back_populates="user")


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="unknown", nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    urgency: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship("User", back_populates="reports")
    confirmations: Mapped[list["ReportConfirmation"]] = relationship(
        "ReportConfirmation",
        back_populates="report",
        cascade="all, delete-orphan",
    )


class Zone(Base):
    __tablename__ = "zones"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    level: Mapped[str] = mapped_column(String(20), nullable=False)
    coordinates: Mapped[list[list[float]]] = mapped_column(JSONB, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class CertificationRequest(Base):
    __tablename__ = "certification_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    profession: Mapped[str] = mapped_column(String(120), nullable=False)
    organization: Mapped[str | None] = mapped_column(String(160), nullable=True)
    proof_url: Mapped[str] = mapped_column(String(500), nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="certification_requests", foreign_keys=[user_id])
    reviewed_by_user: Mapped[User | None] = relationship(
        "User",
        back_populates="reviewed_certification_requests",
        foreign_keys=[reviewed_by],
    )


class ReportConfirmation(Base):
    __tablename__ = "report_confirmations"
    __table_args__ = (UniqueConstraint("report_id", "user_id", name="uq_report_confirmations_report_user"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    report: Mapped[Report] = relationship("Report", back_populates="confirmations")
    user: Mapped[User] = relationship("User", back_populates="confirmations")
