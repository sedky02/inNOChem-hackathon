"""Password hashing, JWT issuance/verification, and the verification hash.

JWT defaults to HS256 with a shared secret (zero-setup). If JWT_ALGORITHM=RS256
and key paths are provided, asymmetric signing is used instead.
"""

from __future__ import annotations

import hashlib
import json
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from functools import lru_cache

import bcrypt
from jose import JWTError, jwt

from src.config.settings import settings

# bcrypt has a hard 72-byte limit on the input; truncate defensively.
_BCRYPT_MAX = 72


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode()[:_BCRYPT_MAX], bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode()[:_BCRYPT_MAX], hashed.encode())
    except ValueError:
        return False


@lru_cache
def _signing_key() -> str:
    if settings.jwt_algorithm == "RS256" and settings.jwt_private_key_path:
        with open(settings.jwt_private_key_path) as f:
            return f.read()
    return settings.jwt_secret


@lru_cache
def _verifying_key() -> str:
    if settings.jwt_algorithm == "RS256" and settings.jwt_public_key_path:
        with open(settings.jwt_public_key_path) as f:
            return f.read()
    return settings.jwt_secret


def create_access_token(user_id: str, org_id: str, role: str) -> tuple[str, str]:
    """Return (token, jti)."""
    now = datetime.now(timezone.utc)
    jti = uuid.uuid4().hex
    payload = {
        "sub": str(user_id),
        "org_id": str(org_id),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=settings.access_token_ttl_seconds)).timestamp()),
        "jti": jti,
    }
    token = jwt.encode(payload, _signing_key(), algorithm=settings.jwt_algorithm)
    return token, jti


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, _verifying_key(), algorithms=[settings.jwt_algorithm])
    except JWTError as exc:  # noqa: F841
        raise ValueError("TOKEN_INVALID") from exc


def new_refresh_token() -> str:
    return secrets.token_hex(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def compute_verification_hash(
    session_id: str, recommended_params: dict, verified_by_id: str, timestamp: str
) -> str:
    payload = json.dumps(
        {
            "session_id": str(session_id),
            "params": recommended_params,
            "verified_by": str(verified_by_id),
            "ts": timestamp,
        },
        sort_keys=True,
        default=str,
    )
    return hashlib.sha256(payload.encode()).hexdigest()
