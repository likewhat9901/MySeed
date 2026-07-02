"""거래별 reduction_index용 카테고리 가중치(만족/불만족)·버짓 초과 보너스."""

from __future__ import annotations

import calendar
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from typing import Any

from app.services.excel_record_import import coerce_numeric_amount
from app.services.record_period import parse_record_date, record_in_date_range

DEFAULT_ALPHA = 2.0
DEFAULT_NEUTRAL_WEIGHT = 1.0
WEIGHT_MIN = 0.1
WEIGHT_MAX = 2.0
WEIGHT_TIER_COUNT = 10
PREV_MONTH_BLEND = 0.35
ROLLING_BLEND = 0.65
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


def _weight_for_tier(tier: int) -> float:
    """구간 인덱스(0~9) → 가중치 0.1~2.0 (10단계 균등)."""
    tier = int(_clamp(tier, 0, WEIGHT_TIER_COUNT - 1))
    if WEIGHT_TIER_COUNT <= 1:
        return WEIGHT_MAX
    return WEIGHT_MIN + (WEIGHT_MAX - WEIGHT_MIN) * tier / (WEIGHT_TIER_COUNT - 1)


def compute_category_weight(unsatisfied_rate: float, *, alpha: float = DEFAULT_ALPHA) -> float:
    """
    카테고리 가중치. 불만족 비율을 10구간으로 나눠 0.1~2.0에 매핑.

    α로 비율을 0.5 중심 확장한 뒤 구간(0~9)을 정하고, 구간별 가중치는 균등 간격.
    """
    adjusted = _clamp(0.5 + alpha * (unsatisfied_rate - 0.5), 0.0, 1.0)
    tier = min(WEIGHT_TIER_COUNT - 1, int(adjusted * WEIGHT_TIER_COUNT))
    return _weight_for_tier(tier)


def build_category_need_type_counts_in_window(
    rows: list[dict[str, Any]],
    window_start: date,
    window_end: date,
) -> dict[str, tuple[int, int]]:
    """[window_start, window_end] 카테고리별 (만족, 불만족) 건수."""
    from app.services.bs_reduction_import import (
        NEED_TYPE_SATISFIED,
        expense_category_label,
        is_expense_record,
        is_index_skipped_category,
        need_type_from_data,
    )

    out: dict[str, list[int]] = defaultdict(lambda: [0, 0])
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
        need_type, _ = need_type_from_data(data)
        if need_type == NEED_TYPE_SATISFIED:
            out[cat][0] += 1
        else:
            out[cat][1] += 1
    return {k: (v[0], v[1]) for k, v in out.items()}


def _previous_category_month_key(
    rows: list[dict[str, Any]],
    category: str,
    as_of: date,
) -> str | None:
    from app.services.bs_reduction_import import (
        expense_category_label,
        is_expense_record,
        is_index_skipped_category,
    )

    as_of_month = f"{as_of.year:04d}-{as_of.month:02d}"
    prev: str | None = None
    for r in rows:
        if not is_expense_record(r):
            continue
        data = r.get("data")
        if not isinstance(data, dict):
            continue
        if coerce_numeric_amount(data.get("amount")) is None:
            continue
        cat = expense_category_label(data)
        if cat != category or is_index_skipped_category(cat):
            continue
        mk = month_key_from_data(data)
        if mk and mk < as_of_month and (prev is None or mk > prev):
            prev = mk
    return prev


def _month_need_type_counts(
    rows: list[dict[str, Any]],
    category: str,
    month_key: str,
) -> tuple[int, int]:
    from app.services.bs_reduction_import import (
        NEED_TYPE_SATISFIED,
        expense_category_label,
        is_expense_record,
        is_index_skipped_category,
        need_type_from_data,
    )

    satisfied = unsatisfied = 0
    for r in rows:
        if not is_expense_record(r):
            continue
        data = r.get("data")
        if not isinstance(data, dict):
            continue
        if coerce_numeric_amount(data.get("amount")) is None:
            continue
        cat = expense_category_label(data)
        if cat != category or is_index_skipped_category(cat):
            continue
        if month_key_from_data(data) != month_key:
            continue
        need_type, _ = need_type_from_data(data)
        if need_type == NEED_TYPE_SATISFIED:
            satisfied += 1
        else:
            unsatisfied += 1
    return satisfied, unsatisfied


def category_weight_for_record(
    rows: list[dict[str, Any]],
    category: str,
    as_of: date,
    *,
    alpha: float = DEFAULT_ALPHA,
) -> tuple[float, float]:
    """
    거래일 기준 카테고리 가중치.

    - 직전 6개월 롤링 불만족 비율(65%) + 직전 거래월 비율(35%) 블렌드
    - 표본 10건 미만이면 중립 1.0
    """
    if not category_meets_index_sample(rows, category, as_of):
        return DEFAULT_NEUTRAL_WEIGHT, 0.5

    win_start = rolling_window_start(as_of)
    counts = build_category_need_type_counts_in_window(rows, win_start, as_of)
    sat, unsat = counts.get(category, (0, 0))
    rolling_rate = compute_unsatisfied_rate(sat, unsat)

    prev_month = _previous_category_month_key(rows, category, as_of)
    if prev_month is None:
        effective_rate = rolling_rate
    else:
        prev_end = month_key_end_date(prev_month)
        if count_category_in_window(rows, category, prev_end) < MIN_INDEX_SAMPLE_COUNT:
            effective_rate = rolling_rate
        else:
            ps, pu = _month_need_type_counts(rows, category, prev_month)
            prev_rate = compute_unsatisfied_rate(ps, pu)
            effective_rate = PREV_MONTH_BLEND * prev_rate + ROLLING_BLEND * rolling_rate

    return compute_category_weight(effective_rate, alpha=alpha), effective_rate


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
    카테고리×월 가중치·버짓 보너스.

    가중치: 거래일(월말) 기준 **6개월 롤링 + 직전 거래월** 블렌드 (10구간, 0.1~2.0).
    버짓: 해당 월 카테고리 지출 합 vs 예산.
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
        for month, fb in months_map.items():
            as_of = month_key_end_date(month)
            weight, rate = category_weight_for_record(rows, category, as_of, alpha=alpha)
            unsatisfied_rate_by_key[(category, month)] = rate
            weight_by_key[(category, month)] = weight

            bonus = 0.0
            if budget is not None and budget > 0 and fb.amount_sum > budget:
                over = (fb.amount_sum - budget) / budget
                bonus = min(over, 1.0) * budget_max_points
            budget_bonus_by_key[(category, month)] = bonus

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
            "weight_tier_count": WEIGHT_TIER_COUNT,
            "budget_max_points": budget_max_points,
            "min_index_sample_count": MIN_INDEX_SAMPLE_COUNT,
            "min_index_sample_months": MIN_INDEX_SAMPLE_MONTHS,
            "prev_month_blend": PREV_MONTH_BLEND,
            "rolling_blend": ROLLING_BLEND,
        },
        "categories": categories,
        "category_count": len(categories),
    }
