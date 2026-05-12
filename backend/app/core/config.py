"""Runtime configuration from environment variables."""

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

# backend/.env (gitignored). Loads before any get_settings() call.
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")


def _parse_csv_list(raw: str | None, default: str) -> tuple[str, ...]:
    value = raw if raw is not None else default
    return tuple(x.strip() for x in value.split(",") if x.strip())


@dataclass(frozen=True)
class Settings:
    openai_api_key: str | None
    openai_model: str
    openai_base_url: str | None
    supabase_url: str | None
    supabase_service_role_key: str | None
    # Dashboard → Settings → API → JWT Secret (HS256). persist_mapping·캔버스 반영 등 검증용.
    supabase_jwt_secret: str | None
    # 브라우저에서 API 호출 시 허용할 Origin. 쉼표 구분. 운영에서는 CORS_ORIGINS로 덮어쓰기.
    cors_origins: tuple[str, ...]

    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)


_DEFAULT_CORS_ORIGINS = (
    "http://localhost:3000,https://frontend-production-cab6.up.railway.app"
)


@lru_cache
def get_settings() -> Settings:
    base = os.getenv("OPENAI_BASE_URL")
    return Settings(
        openai_api_key=os.getenv("OPENAI_API_KEY") or None,
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        openai_base_url=base if base else None,
        supabase_url=os.getenv("SUPABASE_URL") or None,
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY") or None,
        supabase_jwt_secret=os.getenv("SUPABASE_JWT_SECRET") or None,
        cors_origins=_parse_csv_list(os.getenv("CORS_ORIGINS"), _DEFAULT_CORS_ORIGINS),
    )
