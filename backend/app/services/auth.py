import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings
from app.db.schemas import TokenPayload

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, encoded: str) -> bool:
    try:
        return pwd_context.verify(password, encoded)
    except Exception:
        return False


def create_access_token(user_id: uuid.UUID) -> str:
    expire_at = datetime.now(tz=timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "exp": int(expire_at.timestamp()),
    }

    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> TokenPayload:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return TokenPayload(**payload)
    except JWTError as exc:
        raise ValueError("Invalid authentication token") from exc
