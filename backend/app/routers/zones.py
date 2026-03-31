import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Zone
from app.db.schemas import ZoneCreate, ZoneResponse

router = APIRouter(prefix="/zones", tags=["zones"])


@router.get("", response_model=list[ZoneResponse])
async def list_zones(db: Session = Depends(get_db)) -> list[Zone]:
    return db.query(Zone).order_by(Zone.updated_at.desc()).all()


@router.post("", response_model=ZoneResponse, status_code=status.HTTP_201_CREATED)
async def create_zone(payload: ZoneCreate, db: Session = Depends(get_db)) -> Zone:
    zone = Zone(name=payload.name, level=payload.level, coordinates=payload.coordinates)
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone


@router.get("/{zone_id}", response_model=ZoneResponse)
async def get_zone(zone_id: uuid.UUID, db: Session = Depends(get_db)) -> Zone:
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
    return zone
