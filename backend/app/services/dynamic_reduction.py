"""거래별 reduction_index용 카테고리 가중치(만족/불만족)·버짓 초과 보너스."""

from __future__ import annotations

import calendar
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from typing import Any

from app.services.excel_record_import import coerce_numeric_amount
from app.services.record_period import parse_record_date, record_in_date_range

DEFAULT_ALPHA = 1.0
DEFAULT_NEUTRAL_WEIGHT = 1.0
WEIGHT_MIN = 0.7
WEIGHT_MAX = 1.3
DEFAULT_BUDGET_MAX_POINTS = 30.0
MIN_INDEX_SAMPLE_COUNT = 10
MIN_INDEX_SAMPLE_MONTHS = 6
# 하위 호환 alias
MIN_AGGREGATE_SAMPLE_COUNT = MIN_INDEX_SAMPLE_COUNT
MIN_AGGREGATE_SAMPLE_MONTHS = MIN_INDEX_SAMPLE_MONTHS


def month_key_end_date(month_key: str) -> date:
    y, m = map(int, month_key.split("-"))
    return date(y, m, calendar.monthrange(y, m)[1])


def rolling_window_start(end: date, months: int = MIN_AGGREGATE_SAMPLE_MONTHS) -> date:
    """`end`가 속한 월 포함, 역으로 `months`개월 창의 첫날."""
    y, m = end.year, end.month
    m -= months - 1
    while m <= 0:
        m += 12
        y -= 1
    return date(y, m, 1)


def build_category_window_counts(
    rows: list[dict[str, Any]],
    window_start: date,
    window_end: date,
) -> dict[str, int]:
    """[window_start, window_end] 지출 건수(카테고리별). 미분류 제외."""
    from app.services.bs_reduction_import import (
        expense_category_label,
        is_expense_record,
        is_index_skipped_category,
    )

    counts: dict[str, int] = defaultdict(int)
    for r in rows:
        if not is_expense_record(r):
            continue
        if not record_in_date_range(r, window_start, window_end):
            continue
        data = r.get("data")
        if not isinstance(data, dict):
            continue
        if coerce_numeric_amount(data.get("amount")) is None:
            continue
        cat = expense_category_label(data)
        if is_index_skipped_category(cat):
            continue
        counts[cat] += 1
    return dict(counts)


def category_meets_index_sample(
    rows: list[dict[str, Any]],
    category: str,
    as_of: date,
    *,
    min_count: int = MIN_INDEX_SAMPLE_COUNT,
    months: int = MIN_INDEX_SAMPLE_MONTHS,
) -> bool:
    """`as_of` 기준 직전 `months`개월 창에 카테고리 지출이 `min_count`건 이상이면 지수 계산 대상."""
    return count_category_in_window(rows, category, as_of, months=months) >= min_count


def category_meets_aggregate_sample(
    counts: dict[str, int],
    category: str,
    *,
    min_count: int = MIN_INDEX_SAMPLE_COUNT,
) -> bool:
    return counts.get(category, 0) >= min_count


def resolve_aggregate_window_end(rows: list[dict[str, Any]], period_end: date | None) -> date:
    if period_end is not None:
        return period_end
    max_d: date | None = None
    for r in rows:
        data = r.get("data")
        if not isinstance(data, dict):
            continue
        d = parse_record_date(data.get("date"))
        if d is not None and (max_d is None or d > max_d):
            max_d = d
    return max_d or date.today()


def eligible_categories_for_window(
    rows: list[dict[str, Any]],
    window_end: date,
    *,
    min_count: int = MIN_AGGREGATE_SAMPLE_COUNT,
    months: int = MIN_AGGREGATE_SAMPLE_MONTHS,
) -> frozenset[str]:
    start = rolling_window_start(window_end, months)
    counts = build_category_window_counts(rows, start, window_end)
    return frozenset(cat for cat, n in counts.items() if n >= min_count)


def count_category_in_window(
    rows: list[dict[str, Any]],
    category: str,
    window_end: date,
    *,
    months: int = MIN_AGGREGATE_SAMPLE_MONTHS,
) -> int:
    start = rolling_window_start(window_end, months)
    return build_category_window_counts(rows, start, window_end).get(category, 0)


def month_key_from_data(data: dict[str, Any]) -> str | None:
    d = parse_record_date(data.get("date"))
    if d is None:
        return None
    return f"{d.year:04d}-{d.month:02d}"


def _norm_budget_key(s: Any) -> str:
    return " ".join(str(s or "").strip().lower().split())


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def compute_unsatisfied_rate(satisfied: int, unsatisfied: int) -> float:
    """불만족 비율. 건수 0이면 0.5(중립 → 가중치 1.0)."""
    total = satisfied + unsatisfied
    if total <= 0:
        return 0.5
    return unsatisfied / total


def compute_category_weight(unsatisfied_rate: float, *, alpha: float = DEFAULT_ALPHA) -> float:
    """
    카테고리 가중치. 모든 카테고리 동일 공식.

    weight = clamp(1 + alpha × (불만족비율 − 0.5), 0.7, 1.3)
    불만족 0% → 0.7, 50% → 1.0, 100% → 1.3
    """
    raw = 1.0 + alpha * (unsatisfied_rate - 0.5)
    return _clamp(raw, WEIGHT_MIN, WEIGHT_MAX)


@dataclass(frozen=True)
class _MonthFeedback:
    amount_sum: float = 0.0
    satisfied: int = 0
    unsatisfied: int = 0


@dataclass(frozen=True)
class ReductionContext:
    """카테고리×월별 가중치·버짓 초과 보너스 (거래별 지수 계산용)."""

    weight_by_key: dict[tuple[str, str], float]
    unsatisfied_rate_by_key: dict[tuple[str, str], float]
    budget_bonus_by_key: dict[tuple[str, str], float]

    def category_weight(self, category: str, month: str | None) -> float:
        if month is None:
            return DEFAULT_NEUTRAL_WEIGHT
        return self.weight_by_key.get((category, month), DEFAULT_NEUTRAL_WEIGHT)

    def budget_bonus(self, category: str, month: str | None) -> float:
        if month is None:
            return 0.0
        return self.budget_bonus_by_key.get((category, month), 0.0)


def build_reduction_context(
    rows: list[dict[str, Any]],
    *,
    budgets: dict[str, float] | None = None,
    alpha: float = DEFAULT_ALPHA,
    budget_max_points: float = DEFAULT_BUDGET_MAX_POINTS,
) -> ReductionContext:
    """
    카테고리×월 가중치: **전월(직전 거래월) need_type**만 반영.

    - 카테고리 첫 달: weight=1.0 (중립, 고정 출발)
    - 다음 달부터: 전월 만족/불만족 비율 → weight (0.7~1.3)
    - recompute로 과거 전체를 돌려도, 각 월은 **그 시점까지 쌓인 순서**로만 갱신
      (1년치를 한 번에 미래 데이터 섞어 계산하지 않음)
    """
    from app.services.bs_reduction_import import (
        NEED_TYPE_SATISFIED,
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
            unsatisfied=cell.unsatisfied + (0 if need_type == NEED_TYPE_SATISFIED else 1),
        )

    weight_by_key: dict[tuple[str, str], float] = {}
    unsatisfied_rate_by_key: dict[tuple[str, str], float] = {}
    budget_bonus_by_key: dict[tuple[str, str], float] = {}

    for category, months_map in grid.items():
        budget = budget_lookup.get(_norm_budget_key(category))
        ordered = sorted(months_map.keys())
        prev_fb: _MonthFeedback | None = None

        for i, month in enumerate(ordered):
            fb = months_map[month]

            if i == 0:
                rate = 0.5
                weight = DEFAULT_NEUTRAL_WEIGHT
            else:
                assert prev_fb is not None
                prev_month = ordered[i - 1]
                prev_end = month_key_end_date(prev_month)
                if count_category_in_window(rows, category, prev_end) < MIN_INDEX_SAMPLE_COUNT:
                    rate = 0.5
                    weight = DEFAULT_NEUTRAL_WEIGHT
                else:
                    rate = compute_unsatisfied_rate(prev_fb.satisfied, prev_fb.unsatisfied)
                    weight = compute_category_weight(rate, alpha=alpha)

            unsatisfied_rate_by_key[(category, month)] = rate
            weight_by_key[(category, month)] = weight

            bonus = 0.0
            if budget is not None and budget > 0 and fb.amount_sum > budget:
                over = (fb.amount_sum - budget) / budget
                bonus = min(over, 1.0) * budget_max_points
            budget_bonus_by_key[(category, month)] = bonus

            prev_fb = fb

    return ReductionContext(
        weight_by_key=weight_by_key,
        unsatisfied_rate_by_key=unsatisfied_rate_by_key,
        budget_bonus_by_key=budget_bonus_by_key,
    )


def compute_dynamic_reduction(
    rows: list[dict[str, Any]],
    *,
    budgets: dict[str, float] | None = None,
    alpha: float = DEFAULT_ALPHA,
    budget_max_points: float = DEFAULT_BUDGET_MAX_POINTS,
) -> dict[str, Any]:
    """카테고리×월 요약(디버그·미리보기). 거래별 지수는 `compute_reduction_for_records` 사용."""
    ctx = build_reduction_context(
        rows,
        budgets=budgets,
        alpha=alpha,
        budget_max_points=budget_max_points,
    )

    by_cat: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for (cat, month), weight in ctx.weight_by_key.items():
        by_cat[cat].append(
            {
                "month": month,
                "unsatisfied_rate": round(ctx.unsatisfied_rate_by_key.get((cat, month), 0.5), 4),
                "weight": round(weight, 4),
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
            "alpha": alpha,
            "neutral_weight": DEFAULT_NEUTRAL_WEIGHT,
            "weight_min": WEIGHT_MIN,
            "weight_max": WEIGHT_MAX,
            "budget_max_points": budget_max_points,
            "min_index_sample_count": MIN_INDEX_SAMPLE_COUNT,
            "min_index_sample_months": MIN_INDEX_SAMPLE_MONTHS,
        },
        "categories": categories,
        "category_count": len(categories),
    }
