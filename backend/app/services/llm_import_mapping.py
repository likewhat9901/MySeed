"""OpenAI-based import mapping suggestions with heuristic fallback per widget."""

from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from openai import AsyncOpenAI
from pydantic import AliasChoices, BaseModel, Field, ValidationError

from app.core.config import get_settings
from app.services.import_mapping_service import suggest_mapping_address

logger = logging.getLogger(__name__)


class _LLMSuggestionRow(BaseModel):
    con_id: str = Field(validation_alias=AliasChoices("con_id", "widget_id"))
    address: str
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    reason: str = ""


class _LLMPayload(BaseModel):
    suggestions: list[_LLMSuggestionRow]


def normalize_widget_type(widget_type: str) -> str:
    t = widget_type.strip()
    if t in ("checklist", "checkList"):
        return "check-list"
    return t


async def suggest_addresses_with_llm(
    *,
    sheet: str,
    headers: list[str],
    sample_rows: list[Any],
    widgets: list[tuple[UUID, str]],
) -> dict[UUID, tuple[str, float, str]]:
    """
    For each widget UUID, return (excel_address, confidence, reason).
    Falls back to suggest_mapping_address when LLM is unavailable or fails.
    """
    by_id: dict[UUID, tuple[str, float, str]] = {}
    settings = get_settings()

    for wid, wtype in widgets:
        sheet_range, address, conf, reason = suggest_mapping_address(
            widget_type=normalize_widget_type(wtype),
            headers=headers,
            sample_rows=sample_rows,
        )
        by_id[wid] = (address, conf, reason)

    if not settings.openai_api_key:
        return by_id

    widget_lines = "\n".join(f"- id={wid} type={normalize_widget_type(wtype)}" for wid, wtype in widgets)
    payload = {
        "headers": headers,
        "sample_rows": sample_rows,
        "widgets": [{"con_id": str(wid), "widget_type": normalize_widget_type(wtype)} for wid, wtype in widgets],
    }

    system = (
        "You map spreadsheet columns to dashboard widgets. "
        "The spreadsheet matrix is: row 1 = headers (A1, B1, …), row 2+ = sample_rows. "
        "Return minimal Excel A1 addresses on that grid (e.g. C2:C10 or A1:E20).\n"
        "Rules:\n"
        "- savings-goal: one numeric column for current amount (exclude header row if it is text; use e.g. C2:C10).\n"
        "- table: full rectangular data including header row if it matches headers list (often A1:lastCol_lastRow).\n"
        "- check-list: one text column for item labels.\n"
        "- quote: one cell or column with main quote text (prefer first meaningful text cell).\n"
        "- post-it: column or block of text lines in reading order (row-major).\n"
        "Respond ONLY with compact JSON: {\"suggestions\":[{\"con_id\":\"<uuid>\",\"address\":\"...\","
        "\"confidence\":0.0-1.0,\"reason\":\"short Korean\"}]} "
        "Include every con_id from the input exactly once."
    )
    user = f"sheet name (metadata only): {sheet}\nwidgets:\n{widget_lines}\n\ndata json: {json.dumps(payload, ensure_ascii=False)}"

    try:
        client_kwargs: dict[str, Any] = {"api_key": settings.openai_api_key}
        if settings.openai_base_url:
            client_kwargs["base_url"] = settings.openai_base_url
        client = AsyncOpenAI(**client_kwargs)
        completion = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        raw = completion.choices[0].message.content or "{}"
        parsed = _LLMPayload.model_validate_json(raw)
    except (ValidationError, json.JSONDecodeError, IndexError) as e:
        logger.warning("LLM mapping parse failed, using heuristic only: %s", e)
        return by_id
    except Exception as e:
        logger.warning("LLM mapping request failed, using heuristic only: %s", e)
        return by_id

    llm_by_id: dict[UUID, tuple[str, float, str]] = {}
    for row in parsed.suggestions:
        try:
            uid = UUID(row.con_id.strip())
        except ValueError:
            continue
        addr = row.address.strip().upper().replace("$", "")
        llm_by_id[uid] = (addr, float(row.confidence), row.reason or "LLM 추천")

    expected = {wid for wid, _ in widgets}
    if llm_by_id.keys() != expected:
        missing = expected - llm_by_id.keys()
        if missing:
            logger.info("LLM omitted %s widget(s); keeping heuristic for those", len(missing))

    for wid, wtype in widgets:
        if wid in llm_by_id:
            by_id[wid] = llm_by_id[wid]

    return by_id


def ensure_addresses_parse(
    grid: list[list[Any]],
    by_id: dict[UUID, tuple[str, float, str]],
    widgets: list[tuple[UUID, str]],
    headers: list[str],
    sample_rows: list[Any],
) -> dict[UUID, tuple[str, float, str]]:
    """Replace addresses that are not valid A1 ranges on the grid with heuristic fallback."""
    from app.services.excel_grid import parse_address_to_cells

    out = dict(by_id)
    for wid, wtype in widgets:
        addr, conf, reason = out[wid]
        if parse_address_to_cells(grid, addr) is not None:
            continue
        _, fallback, fb_conf, fb_reason = suggest_mapping_address(
            widget_type=normalize_widget_type(wtype),
            headers=headers,
            sample_rows=sample_rows,
        )
        out[wid] = (
            fallback,
            fb_conf,
            f"LLM 주소 '{addr}'가 유효하지 않아 휴리스틱으로 대체: {fb_reason}",
        )
    return out
