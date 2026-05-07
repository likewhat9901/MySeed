"""Derive widget data_binding updates from parsed cell values (aligned with frontend ImportMapper.applyMapping)."""

from __future__ import annotations

from typing import Any

from app.services.aggregation import apply_aggregation, normalize_aggregation
from app.services.excel_grid import ParsedCells


def _to_lines(values: list[Any]) -> list[str]:
    return [str(v if v is not None else "") for v in values]


def build_binding_patch(
    widget_type: str,
    parsed: ParsedCells,
    existing: Any | None,
) -> dict[str, Any] | None:
    """
    Returns a JSON-serializable dict to merge into data_binding, or None if this widget type is not supported.
    `existing` is the current binding object from DB (dict) or None.
    """
    values = parsed.values
    exist = existing if isinstance(existing, dict) else {}

    if widget_type == "savings-goal":
        raw = values[0] if values else None
        try:
            val = float(raw) if raw is not None and raw != "" else float("nan")
        except (TypeError, ValueError):
            val = float("nan")
        if val != val:  # NaN
            return {**exist}
        return {**exist, "current": val}

    if widget_type == "table":
        if parsed.width <= 1:
            rows = [[str(v if v is not None else "")] for v in values]
        else:
            rows: list[list[str]] = []
            for i in range(0, len(values), parsed.width):
                chunk = values[i : i + parsed.width]
                rows.append([str(v if v is not None else "") for v in chunk])
        return {**exist, "rows": rows}

    if widget_type == "check-list":
        items = [{"text": str(v if v is not None else ""), "checked": False} for v in values]
        return {**exist, "items": items}

    if widget_type == "quote":
        return {**exist, "text": str(values[0] if values else "")}

    if widget_type == "post-it":
        return {**exist, "lines": _to_lines(values)}

    return None


def _coerce_float(v: Any) -> float | None:
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def build_binding_with_aggregation(
    widget_type: str,
    parsed: ParsedCells,
    aggregation: str,
    existing: Any | None,
) -> dict[str, Any] | None:
    """
    Like build_binding_patch, but applies a chosen aggregation to the parsed cell values.
    For widget types whose data shape is intrinsically a sequence (table, check-list, post-it),
    aggregation other than 'none' is ignored.
    """
    agg = normalize_aggregation(aggregation)
    values = parsed.values
    exist = existing if isinstance(existing, dict) else {}

    if widget_type == "savings-goal":
        agg_for_single = agg if agg in {"sum", "avg", "min", "max", "count", "first", "last"} else "first"
        result = apply_aggregation(values, agg_for_single)
        num = _coerce_float(result)
        if num is None:
            return {**exist}
        return {**exist, "current": num}

    if widget_type == "quote":
        agg_for_text = agg if agg in {"first", "last"} else "first"
        result = apply_aggregation(values, agg_for_text)
        if isinstance(result, list):
            result = result[0] if result else ""
        return {**exist, "text": str(result if result is not None else "")}

    if widget_type == "table":
        return build_binding_patch("table", parsed, existing)

    if widget_type == "check-list":
        return build_binding_patch("check-list", parsed, existing)

    if widget_type == "post-it":
        return build_binding_patch("post-it", parsed, existing)

    return None
