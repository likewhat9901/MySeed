"""Apply named aggregations to a list of cell values."""

from __future__ import annotations

from typing import Any


SUPPORTED_AGGREGATIONS: tuple[str, ...] = (
    "none",
    "sum",
    "avg",
    "min",
    "max",
    "count",
    "first",
    "last",
)


def normalize_aggregation(name: str | None) -> str:
    if not name:
        return "none"
    n = name.strip().lower()
    if n in ("mean", "average"):
        return "avg"
    if n in SUPPORTED_AGGREGATIONS:
        return n
    return "none"


def _numbers(values: list[Any]) -> list[float]:
    return [
        float(v)
        for v in values
        if isinstance(v, (int, float)) and not isinstance(v, bool)
    ]


def _first_non_empty(values: list[Any]) -> Any:
    for v in values:
        if v not in (None, ""):
            return v
    return None


def apply_aggregation(values: list[Any], aggregation: str) -> Any:
    """
    Returns:
      - the original list when aggregation == 'none'
      - a single numeric for sum/avg/min/max/count
      - a single value for first/last (None if empty)
    """
    name = normalize_aggregation(aggregation)
    if name == "none":
        return list(values)

    nums = _numbers(values)
    if name == "sum":
        return sum(nums)
    if name == "avg":
        return (sum(nums) / len(nums)) if nums else 0.0
    if name == "min":
        return min(nums) if nums else None
    if name == "max":
        return max(nums) if nums else None
    if name == "count":
        return float(sum(1 for v in values if v not in (None, "")))
    if name == "first":
        return _first_non_empty(values)
    if name == "last":
        return _first_non_empty(list(reversed(values)))
    return list(values)
