"""Supabase 사용자 JWT (anon 발급 access_token) 검증."""

from __future__ import annotations

import time
from uuid import UUID

import jwt
from fastapi import HTTPException

from app.core.config import get_settings
from app.services.supabase_data import fetch_ledger_owner_mem_id, ledger_belongs_to_member


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


def mint_user_access_token(mem_id: UUID, *, ttl_seconds: int = 3600) -> str:
    """ledger 소유자용 Supabase access_token 형식 JWT (Swagger 등 Bearer 생략 시)."""
    s = get_settings()
    secret = s.supabase_jwt_secret
    if not secret or not secret.strip():
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_JWT_SECRET 미설정 — 자동 Bearer 발급 불가",
        )
    now = int(time.time())
    payload = {
        "sub": str(mem_id),
        "aud": "authenticated",
        "role": "authenticated",
        "iat": now,
        "exp": now + ttl_seconds,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def resolve_access_token(led_id: UUID, authorization: str | None) -> str:
    """Bearer 헤더가 없으면 led_id의 tb_ledger.mem_id로 access_token을 만든다."""
    token = bearer_token_from_header(authorization)
    if token:
        return token
    if not get_settings().supabase_configured():
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요",
        )
    owner = fetch_ledger_owner_mem_id(led_id)
    if owner is None:
        raise HTTPException(status_code=404, detail="ledger를 찾을 수 없습니다")
    return mint_user_access_token(owner)


def require_supabase_user_id(authorization: str | None) -> UUID:
    raw = bearer_token_from_header(authorization)
    if raw is None:
        raise HTTPException(
            status_code=401,
            detail="Authorization: Bearer <Supabase access token> 헤더가 필요합니다",
        )
    return supabase_user_id_from_access_token(raw)


def require_ledger_actor(led_id: UUID, authorization: str | None) -> UUID:
    """
    가계부 API용 actor(mem_id).

    Bearer 없으면 led_id로 tb_ledger.mem_id를 조회해 access_token을 발급·검증한다.
    """
    token = resolve_access_token(led_id, authorization)
    mem_id = supabase_user_id_from_access_token(token)
    if not ledger_belongs_to_member(led_id, mem_id):
        raise HTTPException(status_code=403, detail="이 가계부(ledger)에 대한 권한이 없습니다")
    return mem_id
