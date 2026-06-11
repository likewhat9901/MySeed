from __future__ import annotations

from app.services import consumption_analysis as ca
from app.services.bs_reduction_import import NEED_TYPE_UNSATISFIED


def _row(rec_id: str, cat: str, date: str, amount: float, need_type: str = "만족") -> dict:
    return {
        "rec_id": rec_id,
        "data_type": "expense",
        "data": {"date": date, "amount": amount, "category": cat, "need_type": need_type},
    }


def test_over_rate() -> None:
    assert ca.compute_over_rate(120_000, 100_000) == 0.2
    assert ca.compute_over_rate(80_000, 100_000) == 0.0
    assert ca.compute_over_rate(50_000, None) == 0.0


def test_category_weight_clamp() -> None:
    assert ca.compute_category_weight(0.0) == 0.7
    assert ca.compute_category_weight(0.5) == 1.0
    assert ca.compute_category_weight(1.0) == 1.3


def test_budget_pressure() -> None:
    assert ca.compute_budget_pressure(0.2) == 1.4
    assert ca.compute_budget_pressure(0.5) == 2.0


def test_transaction_score_formula() -> None:
    rows = [
        _row("a", "식사", "2026-06-01", 15_000, NEED_TYPE_UNSATISFIED),
        _row("b", "식사", "2026-06-02", 5_000, "만족"),
    ]
    result = ca.analyze_consumption(rows, budgets={"식사": 10_000}, month_filter="2026-06")
    txs = {t["rec_id"]: t for t in result["transactions"]}

    a = txs["a"]
    assert a["regret"] is True
    assert a["breakdown"]["regret_score"] == 2.0
    assert a["score"] > txs["b"]["score"]
    assert "후회" in " ".join(a["reasons"])


def test_category_index_amount_weighted() -> None:
    rows = [
        _row("a", "간식", "2026-06-01", 1_000, NEED_TYPE_UNSATISFIED),
        _row("b", "간식", "2026-06-02", 9_000, "만족"),
    ]
    result = ca.analyze_consumption(rows, month_filter="2026-06")
    cat = result["categories"][0]
    assert cat["category"] == "간식"
    assert cat["transaction_count"] == 2
    # 금액 가중 평균이므로 단순 평균과 다를 수 있음
    scores = {t["rec_id"]: t["score"] for t in result["transactions"]}
    expected = (scores["a"] * 1_000 + scores["b"] * 9_000) / 10_000
    assert cat["category_index"] == round(expected, 4)


def test_skips_unclassified() -> None:
    rows = [_row("a", "미분류", "2026-06-01", 10_000, NEED_TYPE_UNSATISFIED)]
    result = ca.analyze_consumption(rows)
    assert result["summary"]["transaction_count"] == 0
