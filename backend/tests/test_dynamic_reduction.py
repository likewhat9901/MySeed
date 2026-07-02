from __future__ import annotations

from datetime import date

import pytest

from app.services import dynamic_reduction as dr
from app.services.bs_reduction_import import NEED_TYPE_UNSATISFIED, compute_reduction_for_records, reduction_index_for


def _row(rec_id, cat, date, amount, need_type="만족"):
    return {
        "rec_id": rec_id,
        "data_type": "expense",
        "data": {"date": date, "amount": amount, "category": cat, "need_type": need_type},
    }


def test_category_weight_stricter_range() -> None:
    assert dr.compute_category_weight(0.0) == 0.1
    assert dr.compute_category_weight(0.5) == pytest.approx(1.156, abs=0.001)
    assert dr.compute_category_weight(1.0) == pytest.approx(2.0)


def test_insufficient_sample_neutral_weight() -> None:
    w, _ = dr.category_weight_for_record(
        [_row("a", "식비", "2025-01-10", 10000, NEED_TYPE_UNSATISFIED)],
        "식비",
        date(2025, 1, 31),
    )
    assert w == 1.0


def test_rolling_blend_raises_weight_after_unsatisfied_month() -> None:
    rows = [
        *[_row(f"j{i}", "식비", "2025-01-10", 10000, NEED_TYPE_UNSATISFIED) for i in range(10)],
        _row("b", "식비", "2025-02-10", 10000, "만족"),
    ]
    w, rate = dr.category_weight_for_record(rows, "식비", date(2025, 2, 28))
    assert w == pytest.approx(2.0)
    assert rate > 0.9


def test_rolling_blend_lowers_weight_after_satisfied_month() -> None:
    rows = [
        *[_row(f"j{i}", "식비", "2025-01-10", 10000, NEED_TYPE_UNSATISFIED) for i in range(10)],
        *[_row(f"f{i}", "식비", "2025-02-10", 10000, "만족") for i in range(10)],
        _row("c", "식비", "2025-03-10", 10000, "만족"),
    ]
    w, rate = dr.category_weight_for_record(rows, "식비", date(2025, 3, 31))
    # 롤링 10/21 + 직전월 0% → effective ≈ 0.31 → α=2 보정 후 tier 1 → 0.31
    assert w == pytest.approx(0.311, abs=0.01)
    assert rate < 0.35


def test_budget_overage_bonus_on_context() -> None:
    rows = [
        *[_row(f"b{i}", "쇼핑", "2025-03-01", 10000, NEED_TYPE_UNSATISFIED) for i in range(9)],
        _row("a", "쇼핑", "2025-03-10", 200000, NEED_TYPE_UNSATISFIED),
    ]
    ctx = dr.build_reduction_context(rows, budgets={"쇼핑": 100000})
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
    # (45 + 5 + 30) * weight — weight depends on rolling blend, at least 80
    assert idx >= 80.0


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
