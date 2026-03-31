from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Report, ReportConfirmation, User
from app.db.schemas import IncidentResponse, MetricCount, TrustedDashboardResponse
from app.routers.auth import require_super_user

router = APIRouter(prefix="/trusted", tags=["trusted"])


@router.get("/dashboard", response_model=TrustedDashboardResponse)
async def trusted_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_super_user),
) -> TrustedDashboardResponse:
    now = datetime.now(tz=timezone.utc)
    recent_cutoff = now - timedelta(hours=24)

    latest_reports = db.query(Report).order_by(Report.created_at.desc()).limit(12).all()

    report_ids = [report.id for report in latest_reports]
    confirmations_count_map: dict = {}
    if report_ids:
        rows = (
            db.query(ReportConfirmation.report_id, func.count(ReportConfirmation.id))
            .filter(ReportConfirmation.report_id.in_(report_ids))
            .group_by(ReportConfirmation.report_id)
            .all()
        )
        confirmations_count_map = {report_id: int(count) for report_id, count in rows}

    latest_alerts = [
        IncidentResponse(
            id=report.id,
            user_id=report.user_id,
            category=report.category,
            description=report.description,
            lat=report.lat,
            lng=report.lng,
            urgency=report.urgency,
            confidence_score=report.confidence_score,
            confirmations_count=confirmations_count_map.get(report.id, 0),
            image_url=report.image_url,
            created_at=report.created_at,
        )
        for report in latest_reports
    ]

    unconfirmed_recent_alerts = (
        db.query(func.count(Report.id))
        .outerjoin(ReportConfirmation, and_(Report.id == ReportConfirmation.report_id))
        .filter(Report.created_at >= recent_cutoff)
        .group_by(Report.id)
        .having(func.count(ReportConfirmation.id) == 0)
        .count()
    )

    alerts_by_category_rows = (
        db.query(Report.category, func.count(Report.id))
        .group_by(Report.category)
        .order_by(func.count(Report.id).desc())
        .limit(8)
        .all()
    )
    alerts_by_category = [MetricCount(label=str(category), count=int(count)) for category, count in alerts_by_category_rows]

    return TrustedDashboardResponse(
        pending_unconfirmed_alerts=int(unconfirmed_recent_alerts),
        alerts_by_category=alerts_by_category,
        latest_alerts=latest_alerts,
    )
