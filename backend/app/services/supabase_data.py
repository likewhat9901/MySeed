"""Supabase RPC helpers (service role) for import mapping + canvas widgets."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from supabase import Client, create_client

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _client() -> Client:
    s = get_settings()
    if not s.supabase_url or not s.supabase_service_role_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    return create_client(s.supabase_url, s.supabase_service_role_key)


def rpc_save_import_mapping(
    mem_id: UUID,
    map_id: UUID,
    map_name: str,
    mappings: list[dict[str, Any]],
) -> str | None:
    try:
        res = _client().rpc(
            "save_import_mapping",
            {
                "p_mem_id": str(mem_id),
                "p_map_id": str(map_id),
                "p_map_name": map_name,
                "p_mappings": mappings,
            },
        ).execute()
    except Exception:
        logger.exception("save_import_mapping RPC failed")
        raise
    rows = res.data or []
    if not rows:
        return None
    first = rows[0] if isinstance(rows, list) else rows
    if isinstance(first, dict) and "map_id" in first:
        return str(first["map_id"])
    return str(map_id)


def rpc_get_canvas_widgets(led_id: UUID) -> list[dict[str, Any]]:
    res = _client().rpc("get_canvas_widgets", {"p_led_id": str(led_id)}).execute()
    return list(res.data or [])


def rpc_replace_canvas_widgets(led_id: UUID, configs: list[dict[str, Any]]) -> bool:
    try:
        _client().rpc(
            "replace_canvas_widgets",
            {"p_led_id": str(led_id), "p_configs": configs},
        ).execute()
        return True
    except Exception:
        logger.exception("replace_canvas_widgets RPC failed")
        return False
