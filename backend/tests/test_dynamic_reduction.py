from __future__ import annotations

from app.services import dynamic_reduction as dr
from app.services.bs_reduction_import import NEED_TYPE_UNSATISFIED, compute_reduction_for_records, reduction_index_for


def _row(rec_id, cat, date, amount, need_type="만족"):
    return {
        "rec_id": rec_id,
        "data_type": "expense",
        "data": {"date": date, "amount": amount, "category": cat, "need_type": need_type},
    }


def test_neutral_weight_first_month() -> None:
    ctx = dr.build_reduction_context([_row("a", "식비", "2025-01-10", 10000, NEED_TYPE_UNSATISFIED)])
    assert ctx.category_weight("식비", "2025-01") == 1.0


def test_second_month_uses_previous_month_only() -> None:
    rows = [
        *[_row(f"j{i}", "식비", "2025-01-10", 10000, NEED_TYPE_UNSATISFIED) for i in range(10)],
        _row("b", "식비", "2025-02-10", 10000, "만족"),
    ]
    ctx = dr.build_reduction_context(rows)
    assert ctx.category_weight("식비", "2025-01") == 1.0
    assert ctx.category_weight("식비", "2025-02") == 1.3


def test_third_month_uses_immediate_previous_not_first() -> None:
    rows = [
        *[_row(f"j{i}", "식비", "2025-01-10", 10000, NEED_TYPE_UNSATISFIED) for i in range(10)],
        *[_row(f"f{i}", "식비", "2025-02-10", 10000, "만족") for i in range(10)],
        _row("c", "식비", "2025-03-10", 10000, "만족"),
    ]
    ctx = dr.build_reduction_context(rows)
    assert ctx.category_weight("식비", "2025-01") == 1.0
    assert ctx.category_weight("식비", "2025-02") == 1.3
    assert ctx.category_weight("식비", "2025-03") == 0.7


def test_gap_months_use_last_activity_month() -> None:
    """5월 거래 후 9월 거래 → 9월 weight는 5월(직전 거래월) 피드백(표본 10건+ 필요)."""
    rows = [
        *[
            _row(f"t{i}", "여행/숙박", "2025-05-13", 2000, NEED_TYPE_UNSATISFIED)
            for i in range(10)
        ],
        _row("b", "여행/숙박", "2025-09-05", 15000, "만족"),
    ]
    ctx = dr.build_reduction_context(rows)
    assert ctx.category_weight("여행/숙박", "2025-05") == 1.0
    assert ctx.category_weight("여행/숙박", "2025-09") == 1.3


def test_budget_overage_bonus_on_context() -> None:
    ctx = dr.build_reduction_context(
        [_row("a", "쇼핑", "2025-03-10", 200000, NEED_TYPE_UNSATISFIED)],
        budgets={"쇼핑": 100000},
    )
    assert ctx.budget_bonus("쇼핑", "2025-03") == 30.0


def test_per_record_index_uses_weight_multiplier_and_budget() -> None:
    rows = [
        *[
            _row(f"base-{i}", "쇼핑", "2025-03-01", 10000, NEED_TYPE_UNSATISFIED)
            for i in range(9)
        ],
        _row("a", "쇼핑", "2025-03-10", 200000, NEED_TYPE_UNSATISFIED),
    ]
    patches, _, _ = compute_reduction_for_records(rows, budgets={"쇼핑": 100000})
    idx = patches[-1]["data"]["reduction_index"]
    # (45 + 5 + 30) * 1.0 = 80
    assert idx == 80.0


def test_neutral_weight_no_category_bonus() -> None:
    base = reduction_index_for(
        amount=10000,
        data_type="expense",
        need_type="만족",
        payment_method="",
        category_weight=1.0,
        budget_bonus=0.0,
    )
    assert base == 5.25
