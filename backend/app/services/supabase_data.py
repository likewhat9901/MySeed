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


def _mappings_legacy_keys(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Supabase 저장 RPC가 예전 필드명만 볼 때를 대비해 con_id/widget_id 동시 전달."""
    out: list[dict[str, Any]] = []
    for r in rows:
        m = dict(r)
        cid = m.get("con_id")
        wid = m.get("widget_id")
        canonical: str | None = None
        if cid is not None:
            canonical = str(cid)
        elif wid is not None:
            canonical = str(wid)
        if canonical is None:
            out.append(m)
            continue
        m["con_id"] = canonical
        m["widget_id"] = canonical
        out.append(m)
    return out


def rpc_save_import_mapping(
    mem_id: UUID,
    map_id: UUID,
    map_name: str,
    mappings: list[dict[str, Any]],
) -> str | None:
    payload = _mappings_legacy_keys(mappings)
    try:
        res = _client().rpc(
            "save_import_mapping",
            {
                "p_mem_id": str(mem_id),
                "p_map_id": str(map_id),
                "p_map_name": map_name,
                "p_mappings": payload,
            },
        ).execute()
    except Exception:
        logger.exception("save_import_mapping RPC failed")
        raise
    data = res.data
    # PostgREST: RETURNS void 또는 단일 행 없으면 빈 결과일 수 있음 → INSERT 됐어도 data 없음.
    if data is None:
        logger.info("save_import_mapping 응답 body 없음, insert 성공으로 간주합니다.")
        return str(map_id)
    if isinstance(data, list) and len(data) == 0:
        logger.info("save_import_mapping 빈 행열, insert 성공으로 간주합니다.")
        return str(map_id)
    if isinstance(data, dict):
        if "map_id" in data:
            return str(data["map_id"])
        logger.info(
            "save_import_mapping 객체에 map_id 없음, 호출 성공으로 map_id 반환."
        )
        return str(map_id)
    first = data[0] if isinstance(data, list) else data
    if isinstance(first, dict) and "map_id" in first:
        return str(first["map_id"])
    return str(map_id)


def rpc_get_canvas_widgets(led_id: UUID) -> list[dict[str, Any]]:
    res = _client().rpc("get_canvas_widgets", {"p_led_id": str(led_id)}).execute()
    return list(res.data or [])


def ledger_belongs_to_member(led_id: UUID, mem_id: UUID) -> bool:
    """tb_ledger 에서 led_id 가 mem_id 소유인지 (service role 로 조회)."""
    res = (
        _client()
        .table("tb_ledger")
        .select("led_id")
        .eq("led_id", str(led_id))
        .eq("mem_id", str(mem_id))
        .limit(1)
        .execute()
    )
    data = res.data
    return bool(data)


def insert_tb_records(rows: list[dict[str, Any]], *, chunk_size: int = 250) -> list[str]:
    """
    `tb_record` bulk insert (service role). Large payloads are chunked.

    Each row: led_id, data_type, data, optional file_id, optional cate_id.
    Returns rec_id 목록 (가능하면 DB 응답 순서).
    """
    if not rows:
        return []
    all_ids: list[str] = []
    try:
        client = _client()
        for i in range(0, len(rows), chunk_size):
            batch = rows[i : i + chunk_size]
            res = client.table("tb_record").insert(batch).select("rec_id").execute()
            data = res.data
            if isinstance(data, list):
                for r in data:
                    if isinstance(r, dict) and r.get("rec_id"):
                        all_ids.append(str(r["rec_id"]))
            elif isinstance(data, dict) and data.get("rec_id"):
                all_ids.append(str(data["rec_id"]))
    except Exception:
        logger.exception("tb_record insert failed")
        raise
    return all_ids


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
