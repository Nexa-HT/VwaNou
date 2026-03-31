import os
import shutil
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Report, ReportConfirmation, User
from app.db.schemas import (
    IncidentConfirmResponse,
    IncidentMapDataResponse,
    IncidentReportCreate,
    IncidentResponse,
    ReportFilters,
    AnalyzeMediaRequest,
    AnalyzeMediaResponse,
)
from app.routers.auth import get_current_user, require_super_user
from app.services.ai_client import classify_text
from app.services.trust_score import calculate_confidence_score
from app.utils.geo import cluster_incidents, prepare_heatmap_points

router = APIRouter(prefix="/incidents", tags=["incidents"])


def _estimate_urgency(description: str) -> int:
    lowered = description.lower()
    high_keywords = {"fire", "gun", "collapse", "shot", "flood", "injury", "explosion"}
    medium_keywords = {"protest", "blocked", "accident", "smoke", "violence"}

    if any(keyword in lowered for keyword in high_keywords):
        return 3
    if any(keyword in lowered for keyword in medium_keywords):
        return 2
    return 1


def _report_to_dict(report: Report) -> dict:
    return {
        "id": report.id,
        "user_id": report.user_id,
        "category": report.category,
        "description": report.description,
        "lat": report.lat,
        "lng": report.lng,
        "urgency": report.urgency,
        "confidence_score": report.confidence_score,
        "confirmations_count": getattr(report, "confirmations_count", 0),
        "reporter_name": getattr(report, "reporter_name", None),
        "reporter_role": getattr(report, "reporter_role", None),
        "image_url": report.image_url,
        "created_at": report.created_at,
    }


def _attach_confirmation_counts(db: Session, reports: list[Report]) -> None:
    if not reports:
        return

    report_ids = [report.id for report in reports]
    counts = dict(
        db.query(ReportConfirmation.report_id, func.count(ReportConfirmation.id))
        .filter(ReportConfirmation.report_id.in_(report_ids))
        .group_by(ReportConfirmation.report_id)
        .all()
    )

    for report in reports:
        report.confirmations_count = int(counts.get(report.id, 0))


def _attach_reporter_metadata(db: Session, reports: list[Report]) -> None:
    if not reports:
        return

    user_ids = list({report.user_id for report in reports})
    user_rows = db.query(User.id, User.name, User.role).filter(User.id.in_(user_ids)).all()
    users_by_id = {item.id: item for item in user_rows}

    for report in reports:
        reporter = users_by_id.get(report.user_id)
        report.reporter_name = reporter.name if reporter else None
        report.reporter_role = reporter.role if reporter else None


@router.post("/upload-media", status_code=status.HTTP_201_CREATED)
async def upload_incident_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    unique_filename = f"{uuid.uuid4()}.{ext}"
    os.makedirs("uploads", exist_ok=True)
    filepath = os.path.join("uploads", unique_filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"/uploads/{unique_filename}"}


@router.post("/analyze", response_model=AnalyzeMediaResponse)
async def analyze_incident_media(
    payload: AnalyzeMediaRequest,
    current_user: User = Depends(get_current_user),
) -> AnalyzeMediaResponse:
    ai_result = await classify_text(
        description=payload.description or "",
        media_url=payload.media_url,
        transcript=payload.transcript,
    )
    return AnalyzeMediaResponse(
        category=ai_result.get("category", "unknown"),
        urgency=int(ai_result.get("urgency", 1))
    )


@router.post("/report", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def report_incident(
    payload: IncidentReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Report:
    description_text = (payload.description or "").strip()

    if description_text:
        ai_result = await classify_text(description_text)
        inferred_category = ai_result.get("category", "unknown")
        inferred_urgency = int(ai_result.get("urgency", 1))
        basic_urgency = _estimate_urgency(description_text)
    else:
        inferred_category = "unknown"
        inferred_urgency = 1
        basic_urgency = 1

    urgency = max(1, min(3, max(basic_urgency, inferred_urgency)))
    category = payload.category or inferred_category or "unknown"

    confidence_score = calculate_confidence_score(
        db=db,
        user_role=current_user.role,
        lat=payload.lat,
        lng=payload.lng,
        urgency=urgency,
    )

    report = Report(
        user_id=current_user.id,
        description=description_text or "No description provided.",
        category=category,
        lat=payload.lat,
        lng=payload.lng,
        urgency=urgency,
        confidence_score=confidence_score,
        image_url=payload.image_url,
    )
    db.add(report)

    # Reward trustworthy and urgent reports with trust points.
    current_user.trust_points += int(round(confidence_score * 10))
    db.add(current_user)

    db.commit()
    db.refresh(report)
    _attach_confirmation_counts(db, [report])
    _attach_reporter_metadata(db, [report])
    return report


@router.get("", response_model=list[IncidentResponse])
async def list_incidents(db: Session = Depends(get_db)) -> list[Report]:
    reports = db.query(Report).order_by(Report.created_at.desc()).all()
    _attach_confirmation_counts(db, reports)
    _attach_reporter_metadata(db, reports)
    return reports


@router.get("/map-data", response_model=IncidentMapDataResponse)
async def get_incidents_map_data(db: Session = Depends(get_db)) -> IncidentMapDataResponse:
    reports = db.query(Report).order_by(Report.created_at.desc()).all()
    _attach_confirmation_counts(db, reports)
    _attach_reporter_metadata(db, reports)
    incidents = [_report_to_dict(report) for report in reports]

    heatmap_points = prepare_heatmap_points(incidents)
    clusters = cluster_incidents(incidents)

    return IncidentMapDataResponse(
        incidents=reports,
        heatmap_points=heatmap_points,
        clusters=clusters,
    )


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(incident_id: uuid.UUID, db: Session = Depends(get_db)) -> Report:
    report = db.query(Report).filter(Report.id == incident_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    _attach_confirmation_counts(db, [report])
    _attach_reporter_metadata(db, [report])
    return report


@router.post("/{incident_id}/confirm", response_model=IncidentConfirmResponse)
async def confirm_incident(
    incident_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_user),
) -> IncidentConfirmResponse:
    report = db.query(Report).filter(Report.id == incident_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    existing = (
        db.query(ReportConfirmation)
        .filter(ReportConfirmation.report_id == incident_id, ReportConfirmation.user_id == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Incident already confirmed by this user")

    db.add(ReportConfirmation(report_id=incident_id, user_id=current_user.id))
    db.commit()

    confirmations_count = (
        db.query(func.count(ReportConfirmation.id)).filter(ReportConfirmation.report_id == incident_id).scalar() or 0
    )
    return IncidentConfirmResponse(incident_id=incident_id, confirmations_count=int(confirmations_count))
