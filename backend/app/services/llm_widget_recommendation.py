"""Ask an LLM to recommend, for each widget, which sheet/range to read and how to aggregate it."""

from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from openai import AsyncOpenAI
from pydantic import BaseModel, Field, ValidationError

from app.core.config import get_settings

logger = logging.getLogger(__name__)


WIDGET_GUIDE = (
    "Target widget shapes and how to fill them:\n"
    "- savings-goal: a single numeric value -> 'current'. "
    "Useful aggregations: sum/avg/max/last/count. Address can be a column slice.\n"
    "- table: rectangular table -> rows[]. Use aggregation 'none'. Address must include header row + data.\n"
    "- check-list: one column of texts -> items[]. Aggregation 'none'.\n"
    "- quote: one text -> 'text'. Aggregation 'first' or 'last' on a text column, or a single cell.\n"
    "- post-it: a column or block of texts -> lines[]. Aggregation 'none'.\n"
    "Aggregation must be one of: none, sum, avg, min, max, count, first, last.\n"
    "display_form must be one of: single, table, list, text.\n"
)


class WidgetRecommendation(BaseModel):
    widget_id: str
    sheet: str
    address: str
    aggregation: str = Field(default="none")
    display_form: str = Field(default="")
    reason: str = Field(default="")
    confidence: float = Field(default=0.7, ge=0.0, le=1.0)


class WidgetRecommendationsPayload(BaseModel):
    recommendations: list[WidgetRecommendation]


async def recommend_widget_mappings(
    *,
    workbook_summary: dict[str, Any],
    widgets: list[tuple[UUID, str]],
) -> list[WidgetRecommendation]:
    """Returns LLM recommendations; empty list when LLM is unavailable or fails."""
    settings = get_settings()
    if not settings.openai_api_key or not widgets:
        return []

    widget_lines = "\n".join(f"- id={wid} type={wtype}" for wid, wtype in widgets)
    system = (
        "You analyze a spreadsheet workbook summary and decide, for each target widget, "
        "WHICH sheet and WHICH A1 range provides the best data, and HOW to aggregate it.\n"
        "Use the column profiles (type, sample values, numeric_stats) to choose meaningful sources. "
        "Prefer ranges that exclude header rows for numeric data, and include the header row only for tables.\n\n"
        + WIDGET_GUIDE
        + '\nRespond ONLY with compact JSON: {"recommendations":[{'
        '"widget_id":"<uuid>","sheet":"<exact sheet name>","address":"A2:A50",'
        '"aggregation":"sum","display_form":"single","reason":"한국어 한 문장",'
        '"confidence":0.0-1.0}]} '
        "Include every widget_id from the input exactly once."
    )
    user = (
        f"widgets:\n{widget_lines}\n\n"
        f"workbook: {json.dumps(workbook_summary, ensure_ascii=False)}"
    )

    try:
        kwargs: dict[str, Any] = {"api_key": settings.openai_api_key}
        if settings.openai_base_url:
            kwargs["base_url"] = settings.openai_base_url
        client = AsyncOpenAI(**kwargs)
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
        parsed = WidgetRecommendationsPayload.model_validate_json(raw)
    except (ValidationError, json.JSONDecodeError) as e:
        logger.warning("LLM recommendation parse failed: %s", e)
        return []
    except Exception as e:
        logger.warning("LLM recommendation request failed: %s", e)
        return []

    out: list[WidgetRecommendation] = []
    for rec in parsed.recommendations:
        try:
            UUID(rec.widget_id.strip())
        except ValueError:
            continue
        out.append(rec)
    return out
