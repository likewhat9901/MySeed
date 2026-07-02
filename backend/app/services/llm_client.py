"""OpenAI 호환 LLM 클라이언트 설정 (OpenAI · Gemini 자동 감지)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

from openai import AsyncOpenAI

from app.core.config import Settings, get_settings

GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
DEFAULT_GEMINI_MODEL = "gemini-2.0-flash"
# 미분류 상호명은 한 요청에 모아서 전송 (초과 시에만 분할)
LLM_MERCHANT_BATCH_SIZE = 200


@dataclass(frozen=True)
class LlmClientConfig:
    api_key: str | None
    base_url: str | None
    model: str
    provider: str  # openai | gemini | none


def resolve_llm_client_config(settings: Settings | None = None) -> LlmClientConfig:
    """
    OPENAI_API_KEY / GOOGLE_API_KEY / OPENAI_BASE_URL 조합을 해석.
    `AIza…` 형식 키만 있으면 Gemini OpenAI 호환 엔드포인트를 사용.
    """
    s = settings or get_settings()
    key = (s.openai_api_key or os.getenv("GOOGLE_API_KEY") or "").strip() or None
    base = (s.openai_base_url or "").strip() or None
    model = (s.openai_model or "gpt-4o-mini").strip()

    if not key:
        return LlmClientConfig(api_key=None, base_url=None, model=model, provider="none")

    if key.startswith("AIza") and not base:
        gemini_model = (os.getenv("GEMINI_MODEL") or DEFAULT_GEMINI_MODEL).strip()
        if model.startswith("gpt-"):
            model = gemini_model
        return LlmClientConfig(
            api_key=key,
            base_url=GEMINI_OPENAI_BASE_URL,
            model=model,
            provider="gemini",
        )

    provider = "gemini" if base and "google" in base.lower() else "openai"
    return LlmClientConfig(api_key=key, base_url=base, model=model, provider=provider)


def build_async_openai_client(cfg: LlmClientConfig) -> AsyncOpenAI | None:
    if not cfg.api_key:
        return None
    kwargs: dict[str, Any] = {"api_key": cfg.api_key}
    if cfg.base_url:
        kwargs["base_url"] = cfg.base_url
    return AsyncOpenAI(**kwargs)


def is_llm_quota_error(exc: BaseException) -> bool:
    msg = str(exc).lower()
    return "429" in msg or "quota" in msg or "resource_exhausted" in msg
