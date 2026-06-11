from __future__ import annotations

from app.services import dynamic_reduction as dr
from app.services.bs_reduction_import import NEED_TYPE_UNSATISFIED, compute_reduction_for_records, reduction_index_for


def _row(rec_id, cat, date, amount, need_type="만족"):
    return {
        "rec_id": rec_id,
        "data_type": "expense",
        "data": {"date": date, "amount": amount, "category": cat, "need_type": need_type},
    }


def test_first_month_weight_is_base() -> None:
    ctx = dr.build_reduction_context([_row("a", "식비", "2025-01-10", 10000, NEED_TYPE_UNSATISFIED)])
    assert ctx.category_weight("식비", "2025-01") == 0.5


def test_weight_increases_after_unsatisfied() -> None:
    rows = [
        _row("a", "식비", "2025-01-10", 10000, NEED_TYPE_UNSATISFIED),
        _row("b", "식비", "2025-02-10", 10000, "만족"),
    ]
    ctx = dr.build_reduction_context(rows, weight_step=0.3)
    assert ctx.category_weight("식비", "2025-01") == 0.5
    assert ctx.category_weight("식비", "2025-02") == 0.8


def test_weight_decreases_after_satisfied() -> None:
    rows = [
        _row("a", "식비", "2025-01-10", 10000, "만족"),
        _row("b", "식비", "2025-02-10", 10000, "만족"),
    ]
    ctx = dr.build_reduction_context(rows, weight_step=0.3)
    assert ctx.category_weight("식비", "2025-02") == 0.2


def test_budget_overage_bonus_on_context() -> None:
    ctx = dr.build_reduction_context([_row("a", "쇼핑", "2025-03-10", 200000, NEED_TYPE_UNSATISFIED)], budgets={"쇼핑": 100000})
    assert ctx.budget_bonus("쇼핑", "2025-03") == 30.0


def test_per_record_index_uses_weight_and_budget() -> None:
    rows = [_row("a", "쇼핑", "2025-03-10", 200000, NEED_TYPE_UNSATISFIED)]
    patches, _, _ = compute_reduction_for_records(rows, budgets={"쇼핑": 100000})
    idx = patches[0]["data"]["reduction_index"]
    # need_type 불만족(45) + amount(4) + weight 0.5→18 + budget 30 = 97
    assert idx == 97.0


def test_weight_bonus_at_default() -> None:
    base = reduction_index_for(
        amount=10000,
        data_type="expense",
        need_type="만족",
        payment_method="",
        category_weight=0.5,
        budget_bonus=0.0,
    )
    assert base == 23.2
