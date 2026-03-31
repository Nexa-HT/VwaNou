from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.db.models import Report
from app.utils.geo import calculate_distance

ROLE_WEIGHT = {"regular": 0.5, "verified": 1.0}


def _normalize_nearby_count(count: int) -> float:
    # Saturate at 5 nearby reports to keep score in the 0-1 range.
    return min(count / 5.0, 1.0)


def _normalize_urgency(urgency: int) -> float:
    urgency = max(1, min(urgency, 3))
    return urgency / 3.0


def _count_recent_reports_nearby(db: Session, lat: float, lng: float) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=2)
    recent_reports = db.query(Report).filter(Report.created_at >= cutoff).all()

    count = 0
    for report in recent_reports:
        distance = calculate_distance(lat, lng, report.lat, report.lng)
        if distance <= 200:
            count += 1

    return count


def calculate_confidence_score(
    db: Session,
    user_role: str,
    lat: float,
    lng: float,
    urgency: int,
) -> float:
    user_role_weight = ROLE_WEIGHT.get(user_role, 0.5)
    recent_reports_nearby = _count_recent_reports_nearby(db, lat, lng)
    nearby_score = _normalize_nearby_count(recent_reports_nearby)
    urgency_score = _normalize_urgency(urgency)

    score = (user_role_weight * 0.5) + (nearby_score * 0.3) + (urgency_score * 0.2)
    return round(min(max(score, 0.0), 1.0), 4)
