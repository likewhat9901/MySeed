"""거래별 reduction_index용 동적 카테고리 가중치·버짓 초과 보너스."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from app.services.excel_record_import import coerce_numeric_amount
from app.services.record_period import parse_record_date

DEFAULT_BASE_WEIGHT = 0.5
DEFAULT_WEIGHT_STEP = 0.3
DEFAULT_BUDGET_MAX_POINTS = 30.0
# 예전 고정 카테고리 보너스(+18)와 weight=0.5일 때 동일: 0.5 × 36 = 18
CATEGORY_WEIGHT_SCALE = 36.0


def month_key_from_data(data: dict[str, Any]) -> str | None:
    d = parse_record_date(data.get("date"))
    if d is None:
        return None
    return f"{d.year:04d}-{d.month:02d}"


def _norm_budget_key(s: Any) -> str:
    return " ".join(str(s or "").strip().lower().split())


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _feedback_delta_from_need_type(satisfied: int, unsatisfied: int, weight_step: float) -> float:
    """전월 need_type(만족/불만족) 비율 → 가중치 변화량. 불만족↑ 증가, 만족↑ 감소."""
    total = satisfied + unsatisfied
    if total <= 0:
        return 0.0
    return ((unsatisfied / total) - (satisfied / total)) * weight_step


@dataclass(frozen=True)
class _MonthFeedback:
    amount_sum: float = 0.0
    satisfied: int = 0
    unsatisfied: int = 0


@dataclass(frozen=True)
class ReductionContext:
    """카테고리×월별 가중치·버짓 초과 보너스 (거래별 지수 계산용)."""

    weight_by_key: dict[tuple[str, str], float]
    budget_bonus_by_key: dict[tuple[str, str], float]
    base_weight: float

    def category_weight(self, category: str, month: str | None) -> float:
        if month is None:
            return self.base_weight
        return self.weight_by_key.get((category, month), self.base_weight)

    def budget_bonus(self, category: str, month: str | None) -> float:
        if month is None:
            return 0.0
        return self.budget_bonus_by_key.get((category, month), 0.0)


def build_reduction_context(
    rows: list[dict[str, Any]],
    *,
    budgets: dict[str, float] | None = None,
    base_weight: float = DEFAULT_BASE_WEIGHT,
    weight_step: float = DEFAULT_WEIGHT_STEP,
    budget_max_points: float = DEFAULT_BUDGET_MAX_POINTS,
) -> ReductionContext:
    """
    지출 내역에서 카테고리×월 need_type(만족/불만족)·지출 합을 모아
    - 해당 월 거래에 쓸 **카테고리 가중치**(첫 달=base_weight, 이후 전월 need_type 비율로 ±)
    - 버짓 초과 **보너스 점수**를 만든다.
    """
    from app.services.bs_reduction_import import (
        NEED_TYPE_SATISFIED,
        NEED_TYPE_UNSATISFIED,
        expense_category_label,
        is_expense_record,
        is_index_skipped_category,
        need_type_from_data,
    )

    budget_lookup: dict[str, float] = {}
    if budgets:
        for k, v in budgets.items():
            try:
                budget_lookup[_norm_budget_key(k)] = float(v)
            except (TypeError, ValueError):
                continue

    grid: dict[str, dict[str, _MonthFeedback]] = defaultdict(lambda: defaultdict(_MonthFeedback))

    for r in rows:
        if not is_expense_record(r):
            continue
        data = r.get("data")
        if not isinstance(data, dict):
            continue
        amount = coerce_numeric_amount(data.get("amount"))
        if amount is None:
            continue
        month = month_key_from_data(data)
        if month is None:
            continue

        category = expense_category_label(data)
        if is_index_skipped_category(category):
            continue

        need_type, _ = need_type_from_data(data)
        cell = grid[category][month]
        grid[category][month] = _MonthFeedback(
            amount_sum=cell.amount_sum + float(amount),
            satisfied=cell.satisfied + (1 if need_type == NEED_TYPE_SATISFIED else 0),
            unsatisfied=cell.unsatisfied + (1 if need_type == NEED_TYPE_UNSATISFIED else 0),
        )

    weight_by_key: dict[tuple[str, str], float] = {}
    budget_bonus_by_key: dict[tuple[str, str], float] = {}

    for category, months_map in grid.items():
        budget = budget_lookup.get(_norm_budget_key(category))
        ordered = sorted(months_map.keys())
        prev_weight = base_weight
        prev_fb: _MonthFeedback | None = None

        for i, month in enumerate(ordered):
            fb = months_map[month]
            if i == 0:
                weight = base_weight
            else:
                delta = _feedback_delta_from_need_type(
                    prev_fb.satisfied if prev_fb else 0,
                    prev_fb.unsatisfied if prev_fb else 0,
                    weight_step,
                )
                weight = _clamp(prev_weight + delta, 0.0, 1.0)

            weight_by_key[(category, month)] = weight

            bonus = 0.0
            if budget is not None and budget > 0 and fb.amount_sum > budget:
                over = (fb.amount_sum - budget) / budget
                bonus = min(over, 1.0) * budget_max_points
            budget_bonus_by_key[(category, month)] = bonus

            prev_weight = weight
            prev_fb = fb

    return ReductionContext(
        weight_by_key=weight_by_key,
        budget_bonus_by_key=budget_bonus_by_key,
        base_weight=base_weight,
    )


def category_weight_bonus(weight: float) -> float:
    """동적 카테고리 가중치 → 지수 가산분 (예: 0.5 → 18점)."""
    return weight * CATEGORY_WEIGHT_SCALE


def compute_dynamic_reduction(
    rows: list[dict[str, Any]],
    *,
    budgets: dict[str, float] | None = None,
    base_weight: float = DEFAULT_BASE_WEIGHT,
    weight_step: float = DEFAULT_WEIGHT_STEP,
    budget_max_points: float = DEFAULT_BUDGET_MAX_POINTS,
) -> dict[str, Any]:
    """카테고리×월 요약(디버그·미리보기용). 거래별 지수는 `compute_reduction_for_records` 사용."""
    ctx = build_reduction_context(
        rows,
        budgets=budgets,
        base_weight=base_weight,
        weight_step=weight_step,
        budget_max_points=budget_max_points,
    )

    by_cat: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for (cat, month), weight in ctx.weight_by_key.items():
        by_cat[cat].append(
            {
                "month": month,
                "weight": round(weight, 4),
                "category_bonus": round(category_weight_bonus(weight), 2),
                "budget_bonus": round(ctx.budget_bonus_by_key.get((cat, month), 0.0), 2),
            }
        )

    categories = [
        {
            "category": cat,
            "budget": budgets.get(cat) if budgets else None,
            "months": sorted(cells, key=lambda x: x["month"]),
        }
        for cat, cells in sorted(by_cat.items())
    ]

    return {
        "params": {
            "base_weight": base_weight,
            "weight_step": weight_step,
            "budget_max_points": budget_max_points,
            "category_weight_scale": CATEGORY_WEIGHT_SCALE,
        },
        "categories": categories,
        "category_count": len(categories),
    }
