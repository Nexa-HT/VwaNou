import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import CertificationRequest, Report, ReportConfirmation, User
from app.db.schemas import (
    AdminDashboardResponse,
    AdminUserListItem,
    CertificationRequestResponse,
    IncidentResponse,
    MetricCount,
    PromoteUserResponse,
)
from app.routers.auth import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


def _incident_with_counts(report: Report, db: Session) -> IncidentResponse:
    confirmations_count = (
        db.query(func.count(ReportConfirmation.id)).filter(ReportConfirmation.report_id == report.id).scalar() or 0
    )
    return IncidentResponse(
        id=report.id,
        user_id=report.user_id,
        category=report.category,
        description=report.description,
        lat=report.lat,
        lng=report.lng,
        urgency=report.urgency,
        confidence_score=report.confidence_score,
        confirmations_count=int(confirmations_count),
        image_url=report.image_url,
        created_at=report.created_at,
    )


def _certification_payload(item: CertificationRequest) -> CertificationRequestResponse:
    user_payload = {
        "id": item.user.id,
        "name": item.user.name,
        "email": item.user.email,
        "role": item.user.role,
    }
    return CertificationRequestResponse(
        id=item.id,
        user_id=item.user_id,
        profession=item.profession,
        organization=item.organization,
        proof_url=item.proof_url,
        details=item.details,
        status=item.status,
        admin_note=item.admin_note,
        created_at=item.created_at,
        reviewed_at=item.reviewed_at,
        reviewed_by=item.reviewed_by,
        user=user_payload,
    )


@router.get("/dashboard", response_model=AdminDashboardResponse)
async def get_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AdminDashboardResponse:
    now = datetime.now(tz=timezone.utc)
    recent_cutoff = now - timedelta(hours=24)
    trusted_roles = {"verified", "police", "security", "journalist", "ong"}

    pending_count = db.query(func.count(CertificationRequest.id)).filter(CertificationRequest.status == "pending").scalar() or 0

    total_users = db.query(func.count(User.id)).scalar() or 0
    admin_users = db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0
    regular_users = db.query(func.count(User.id)).filter(User.role == "regular").scalar() or 0
    verified_users = db.query(func.count(User.id)).filter(User.role.in_(trusted_roles)).scalar() or 0

    role_distribution_rows = db.query(User.role, func.count(User.id)).group_by(User.role).order_by(func.count(User.id).desc()).all()
    role_distribution = [MetricCount(label=str(role), count=int(count)) for role, count in role_distribution_rows]

    total_alerts = db.query(func.count(Report.id)).scalar() or 0
    alerts_last_24h = db.query(func.count(Report.id)).filter(Report.created_at >= recent_cutoff).scalar() or 0

    alerts_by_category_rows = (
        db.query(Report.category, func.count(Report.id))
        .group_by(Report.category)
        .order_by(func.count(Report.id).desc())
        .limit(8)
        .all()
    )
    alerts_by_category = [MetricCount(label=str(category), count=int(count)) for category, count in alerts_by_category_rows]

    certification_status_rows = (
        db.query(CertificationRequest.status, func.count(CertificationRequest.id))
        .group_by(CertificationRequest.status)
        .all()
    )
    certification_status_counts = [MetricCount(label=str(status), count=int(count)) for status, count in certification_status_rows]

    latest_alert_rows = (
        db.query(Report)
        .order_by(Report.created_at.desc())
        .limit(12)
        .all()
    )
    latest_alerts = [_incident_with_counts(report, db) for report in latest_alert_rows]

    unconfirmed_recent_alerts = (
        db.query(func.count(Report.id))
        .outerjoin(
            ReportConfirmation,
            and_(Report.id == ReportConfirmation.report_id),
        )
        .filter(Report.created_at >= recent_cutoff)
        .group_by(Report.id)
        .having(func.count(ReportConfirmation.id) == 0)
        .count()
    )

    certification_rows = (
        db.query(CertificationRequest)
        .join(User, User.id == CertificationRequest.user_id)
        .order_by(CertificationRequest.created_at.desc())
        .limit(12)
        .all()
    )
    latest_requests = [_certification_payload(item) for item in certification_rows]

    return AdminDashboardResponse(
        pending_certification_requests=int(pending_count),
        unconfirmed_recent_alerts=int(unconfirmed_recent_alerts),
        total_users=int(total_users),
        verified_users=int(verified_users),
        admin_users=int(admin_users),
        regular_users=int(regular_users),
        total_alerts=int(total_alerts),
        alerts_last_24h=int(alerts_last_24h),
        role_distribution=role_distribution,
        alerts_by_category=alerts_by_category,
        certification_status_counts=certification_status_counts,
        latest_alerts=latest_alerts,
        latest_certification_requests=latest_requests,
    )


@router.delete("/incidents/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_incident(
    incident_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    report = db.query(Report).filter(Report.id == incident_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    db.delete(report)
    db.commit()


@router.get("/users", response_model=list[AdminUserListItem])
async def list_users_for_admin(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[AdminUserListItem]:
    rows = db.query(User).order_by(User.created_at.desc()).all()
    return [AdminUserListItem(id=user.id, name=user.name, email=user.email, role=user.role) for user in rows]


@router.patch("/users/{user_id}/promote-admin", response_model=PromoteUserResponse)
async def promote_user_to_admin(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> PromoteUserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.role = "admin"
    db.add(user)
    db.commit()
    db.refresh(user)
    return PromoteUserResponse(id=user.id, role=user.role)
