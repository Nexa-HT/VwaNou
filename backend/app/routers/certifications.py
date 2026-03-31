import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import CertificationRequest, User
from app.db.schemas import CertificationRequestCreate, CertificationRequestResponse, CertificationRequestReview
from app.routers.auth import get_current_user, require_admin

router = APIRouter(prefix="/certifications", tags=["certifications"])
admin_router = APIRouter(prefix="/admin/certification-requests", tags=["admin"])


def _with_user_payload(item: CertificationRequest) -> CertificationRequestResponse:
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


@router.post("/apply", response_model=CertificationRequestResponse, status_code=status.HTTP_201_CREATED)
async def apply_for_certification(
    payload: CertificationRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CertificationRequestResponse:
    existing_pending = (
        db.query(CertificationRequest)
        .filter(CertificationRequest.user_id == current_user.id, CertificationRequest.status == "pending")
        .first()
    )
    if existing_pending:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A pending certification request already exists")

    request_item = CertificationRequest(
        user_id=current_user.id,
        profession=payload.profession,
        organization=payload.organization,
        proof_url=payload.proof_url,
        details=payload.details,
        status="pending",
    )
    db.add(request_item)
    db.commit()
    db.refresh(request_item)
    db.refresh(current_user)
    request_item.user = current_user
    return _with_user_payload(request_item)


@router.get("/me", response_model=list[CertificationRequestResponse])
async def list_my_certification_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CertificationRequestResponse]:
    items = (
        db.query(CertificationRequest)
        .filter(CertificationRequest.user_id == current_user.id)
        .order_by(CertificationRequest.created_at.desc())
        .all()
    )
    for item in items:
        item.user = current_user
    return [_with_user_payload(item) for item in items]


@admin_router.get("", response_model=list[CertificationRequestResponse])
async def list_certification_requests(
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[CertificationRequestResponse]:
    query = db.query(CertificationRequest).join(User, User.id == CertificationRequest.user_id)
    if status_filter:
        query = query.filter(CertificationRequest.status == status_filter)

    items = query.order_by(CertificationRequest.created_at.desc()).all()
    return [_with_user_payload(item) for item in items]


@admin_router.patch("/{request_id}", response_model=CertificationRequestResponse)
async def review_certification_request(
    request_id: uuid.UUID,
    payload: CertificationRequestReview,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin),
) -> CertificationRequestResponse:
    item = db.query(CertificationRequest).filter(CertificationRequest.id == request_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certification request not found")

    if item.status != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Certification request already reviewed")

    item.status = payload.status
    item.admin_note = payload.admin_note
    item.reviewed_by = admin_user.id
    item.reviewed_at = datetime.now(tz=timezone.utc)

    applicant = db.query(User).filter(User.id == item.user_id).first()
    if not applicant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Applicant not found")

    if payload.status == "approved":
        applicant.role = "verified"
        db.add(applicant)

    db.add(item)
    db.commit()
    db.refresh(item)
    db.refresh(applicant)
    item.user = applicant
    return _with_user_payload(item)
