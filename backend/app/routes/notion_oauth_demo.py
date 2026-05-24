"""
Notion Public integration OAuth — 로컬 검증 전용 라우트.

환경변수(backend/.env):
  NOTION_OAUTH_CLIENT_ID      노션 포털 Public integration 클라이언트 ID (UUID 문자열)
  NOTION_OAUTH_CLIENT_SECRET 인티그레이션 클라이언트 시크릿
  NOTION_OAUTH_REDIRECT_URI  이 서버의 콜백 URL 전체 문자열 — 포털 «Redirect URIs» 와 문자 단위 동일해야 함.
                              예: http://localhost:8000/api/notion/oauth-demo/callback
  NOTION_OAUTH_FRONTEND_RESULT_URL (선택) 토큰 교환 후 프론트로 돌려보낼 URL.
                              예: http://localhost:3000/dev/notion-oauth/result

주의:
  `/result` JSON에는 access_token 전체가 포함됩니다. 운영·공개망에서는 사용하지 마세요.
"""

from __future__ import annotations

import base64
import logging
import secrets
import threading
import time
from typing import Any
from urllib.parse import quote, urlencode

import httpx
from fastapi import APIRouter, Cookie, HTTPException
from fastapi.responses import JSONResponse, RedirectResponse

from app.core.config import get_settings

logger = logging.getLogger(__name__)

NOTION_AUTH = "https://api.notion.com/v1/oauth/authorize"
NOTION_TOKEN = "https://api.notion.com/v1/oauth/token"
NOTION_VERSION = "2026-03-11"

DEMO_SID_COOKIE = "myseed_notion_demo_sid"
COOKIE_PATH = "/api/notion/oauth-demo"
RESULT_TTL_SEC = 600.0

router = APIRouter(prefix="/notion/oauth-demo", tags=["notion-oauth-demo"])

_lock = threading.Lock()
_pending: dict[str, str] = {}
_results: dict[str, tuple[float, dict[str, Any]]] = {}


def _monotonic_deadline() -> float:
    return time.monotonic() + RESULT_TTL_SEC


def _register_pending(oauth_state: str, demo_sid: str) -> None:
    with _lock:
        _pending[oauth_state] = demo_sid


def _consume_pending(oauth_state: str) -> str | None:
    with _lock:
        return _pending.pop(oauth_state, None)


def _store_result(demo_sid: str, payload: dict[str, Any]) -> None:
    with _lock:
        _results[demo_sid] = (_monotonic_deadline(), payload)


def _pop_result(demo_sid: str) -> dict[str, Any] | None:
    now = time.monotonic()
    with _lock:
        expired_keys = [
            sid for sid, (deadline, _) in _results.items() if deadline < now
        ]
        for sid in expired_keys:
            del _results[sid]

        tup = _results.pop(demo_sid, None)
        if not tup:
            return None
        deadline, payload = tup
        if deadline < now:
            return None
        return payload


@router.get("/status")
async def notion_oauth_demo_status() -> dict[str, Any]:
    """클라이언트 노출용 설정 여부 확인 (비밀값 없음)."""
    s = get_settings()
    return {
        "configured": s.notion_oauth_demo_configured(),
        "redirect_uri_registered_hint": (
            s.notion_oauth_redirect_uri if s.notion_oauth_demo_configured() else None
        ),
    }


@router.get("/start")
async def notion_oauth_demo_start() -> RedirectResponse:
    """노션 동의 페이지로 리다이렉트합니다. 브라우저 주소창으로 접속해야 쿠키가 붙습니다."""
    s = get_settings()
    if not s.notion_oauth_demo_configured():
        raise HTTPException(
            status_code=503,
            detail=(
                "Set NOTION_OAUTH_CLIENT_ID, NOTION_OAUTH_CLIENT_SECRET, "
                "NOTION_OAUTH_REDIRECT_URI in backend .env"
            ),
        )

    assert s.notion_oauth_client_id
    assert s.notion_oauth_redirect_uri

    oauth_state = secrets.token_urlsafe(32)
    demo_sid = secrets.token_urlsafe(24)
    _register_pending(oauth_state, demo_sid)

    query = urlencode(
        {
            "client_id": s.notion_oauth_client_id,
            "redirect_uri": s.notion_oauth_redirect_uri,
            "response_type": "code",
            "owner": "user",
            "state": oauth_state,
        }
    )
    location = f"{NOTION_AUTH}?{query}"
    resp = RedirectResponse(url=location, status_code=302)
    resp.set_cookie(
        key=DEMO_SID_COOKIE,
        value=demo_sid,
        max_age=int(RESULT_TTL_SEC),
        httponly=True,
        samesite="lax",
        path=COOKIE_PATH,
    )
    return resp


@router.get("/callback")
async def notion_oauth_demo_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
) -> RedirectResponse | JSONResponse:
    """노션이 사용자를 돌려보내는 주소입니다. 노션 포털에 등록한 redirect_uri 와 동일해야 합니다."""

    settings = get_settings()
    fr_base = (settings.notion_oauth_frontend_result_url or "").strip()

    if error:
        logger.info("Notion OAuth error param: %s — %s", error, error_description)
        msg = quote(error_description or error, safe="")
        if fr_base:
            sep = "&" if "?" in fr_base else "?"
            loc = f"{fr_base}{sep}notion_error={quote(error, safe='')}&notion_error_description={msg}"
            return RedirectResponse(url=loc, status_code=302)
        return JSONResponse(
            {"ok": False, "error": error, "error_description": error_description},
            status_code=400,
        )

    def _frontend_redirect() -> RedirectResponse:
        assert fr_base
        return RedirectResponse(url=fr_base, status_code=302)

    if not code or not state:
        raise HTTPException(
            status_code=400,
            detail="missing code or state",
        )

    demo_sid = _consume_pending(state)
    if not demo_sid:
        raise HTTPException(
            status_code=400,
            detail="invalid or expired oauth state — open /start again from this browser",
        )

    if not settings.notion_oauth_demo_configured():
        raise HTTPException(status_code=503, detail="oauth server env not configured")

    assert settings.notion_oauth_client_id
    assert settings.notion_oauth_client_secret
    assert settings.notion_oauth_redirect_uri

    basic = base64.b64encode(
        f"{settings.notion_oauth_client_id}:{settings.notion_oauth_client_secret}".encode(),
    ).decode()

    payload_body = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.notion_oauth_redirect_uri,
    }

    async with httpx.AsyncClient() as client:
        tr = await client.post(
            NOTION_TOKEN,
            headers={
                "Authorization": f"Basic {basic}",
                "Content-Type": "application/json",
                "Notion-Version": NOTION_VERSION,
            },
            json=payload_body,
            timeout=30.0,
        )

    if tr.status_code != 200:
        logger.warning("Notion token exchange failed: %s %s", tr.status_code, tr.text)
        raise HTTPException(
            status_code=502,
            detail={"message": tr.text, "status_code": tr.status_code},
        )

    token_json: dict[str, Any] = tr.json()
    _store_result(demo_sid, token_json)

    if not fr_base.strip():
        return JSONResponse(
            {
                "ok": True,
                "note": (
                    "Set NOTION_OAUTH_FRONTEND_RESULT_URL to redirect after success. "
                    "Using raw JSON fallback."
                ),
                "token_exchange": token_json,
            },
        )

    return _frontend_redirect()


@router.get("/result")
async def notion_oauth_demo_result(
    demo_sid: str | None = Cookie(None, alias=DEMO_SID_COOKIE),
) -> dict[str, Any]:
    """
    브라우저가 같은 주소(backend) 도메인에 대해 들고 있는 `myseed_notion_demo_sid` 쿠키로,
    노션 OAuth 직후 `/callback` 에서 채워 둔 토큰 페이로드를 반환합니다(일회 소비).

    ⚠ 로컬 데모용: 전체 access_token 포함.
    """
    if not demo_sid:
        raise HTTPException(
            status_code=401,
            detail="missing demo cookie; start from GET /start in this browser profile",
        )

    data = _pop_result(demo_sid)
    if not data:
        raise HTTPException(
            status_code=410,
            detail="result expired or already consumed — start /start again",
        )

    at_raw = data.get("access_token")
    access_token_preview: str | None
    if isinstance(at_raw, str) and len(at_raw) > 12:
        access_token_preview = f"{at_raw[:8]}…{at_raw[-4:]}"
    elif isinstance(at_raw, str):
        access_token_preview = at_raw or None
    else:
        access_token_preview = None

    return {
        "ok": True,
        "workspace_id": data.get("workspace_id"),
        "workspace_name": data.get("workspace_name"),
        "workspace_icon": data.get("workspace_icon"),
        "bot_id": data.get("bot_id"),
        "owner": data.get("owner"),
        "access_token_preview": access_token_preview,
        "_dev_full_access_token": at_raw,
        "_dev_refresh_token": data.get("refresh_token"),
        "raw": data,
    }
