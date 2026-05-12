"""Supabase 사용자 JWT (anon 발급 access_token) 검증."""

from __future__ import annotations

from uuid import UUID

import jwt
from fastapi import HTTPException

from app.core.config import get_settings


def bearer_token_from_header(authorization: str | None) -> str | None:
    if not authorization:
        return None
    prefix = "bearer "
    if authorization.lower().startswith(prefix):
        return authorization[len(prefix) :].strip() or None
    return None


def supabase_user_id_from_access_token(access_token: str) -> UUID:
    """
    로그인 사용자 access_token 검증 후 auth.users(id) 에 해당하는 UUID 반환.

    거부: 서비스 롤 JWT, 만료, audience 불일치.
    """
    s = get_settings()
    secret = s.supabase_jwt_secret
    if not secret or not secret.strip():
        raise HTTPException(
            status_code=503,
            detail=(
                "서버에 SUPABASE_JWT_SECRET 미설정. "
                "Supabase Dashboard → Settings → API의 JWT Secret을 backend .env 에 넣으세요."
            ),
        )

    try:
        payload = jwt.decode(
            access_token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={
                "require": ["exp", "sub"],
                "verify_aud": True,
            },
        )
    except jwt.ExpiredSignatureError as e:
        raise HTTPException(status_code=401, detail="access token 만료") from e
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail="유효하지 않은 access token") from e

    if payload.get("role") == "service_role":
        raise HTTPException(
            status_code=403,
            detail="이 엔드포인트에는 로그인 사용자 access_token만 사용할 수 있습니다",
        )

    sub = payload.get("sub")
    if sub is None or not str(sub).strip():
        raise HTTPException(status_code=401, detail="token에 사용자 id(sub) 없음")

    try:
        return UUID(str(sub).strip())
    except ValueError as e:
        raise HTTPException(status_code=401, detail="token의 sub 형식 오류") from e


def require_supabase_user_id(authorization: str | None) -> UUID:
    raw = bearer_token_from_header(authorization)
    if raw is None:
        raise HTTPException(
            status_code=401,
            detail="Authorization: Bearer <Supabase access token> 헤더가 필요합니다",
        )
    return supabase_user_id_from_access_token(raw)
