"""Password hashing (bcrypt) and JWT creation/validation (PyJWT)."""
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings


class InvalidTokenError(Exception):
    """Raised when a token is malformed, tampered with, or expired."""


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(
    subject: str, role: str, expires_delta: timedelta | None = None
) -> str:
    expires = expires_delta or timedelta(minutes=settings.access_token_minutes)
    payload = {
        "sub": subject,
        "role": role,
        "exp": datetime.now(timezone.utc) + expires,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise InvalidTokenError(str(exc)) from exc
