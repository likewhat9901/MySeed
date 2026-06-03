from __future__ import annotations

from app.services import bs_reduction_import as bri


def test_record_data_kind() -> None:
    assert bri.record_data_kind({"data_type": "income", "data": {}}) == "income"
    assert bri.record_data_kind({"data_type": "expense", "data": {}}) == "expense"
    assert bri.record_data_kind({"data": {"entry_type": "지출"}}) == "expense"
    assert bri.record_data_kind({"data_type": "bsimport", "data": {}}) == "expense"
    assert bri.record_data_kind({"data_type": "import", "data": {}}) == "expense"


def test_infer_need_type_expense_only() -> None:
    assert bri.infer_need_type_for_backfill({"category": "쇼핑", "title": "의류"}) == "불필요"
    assert bri.infer_need_type_for_backfill({"category": "식비"}) == "필요"


def test_compute_skips_income_strips_keys() -> None:
    rows = [
        {
            "rec_id": "r-income",
            "data_type": "income",
            "data": {"amount": 1000000, "need_type": "필요", "reduction_index": 10},
        },
        {
            "rec_id": "r-exp",
            "data_type": "expense",
            "data": {"amount": 5000, "category": "식비", "need_type": "불필요"},
        },
    ]
    patches, summary, _ = bri.compute_reduction_for_records(rows)
    by_id = {p["rec_id"]: p["data"] for p in patches}
    assert "need_type" not in by_id["r-income"]
    assert "reduction_index" not in by_id["r-income"]
    assert by_id["r-exp"]["need_type"] == "불필요"
    assert "reduction_index" in by_id["r-exp"]
    assert summary


def test_top_reduction_categories_response_shape() -> None:
    rows = [
        {
            "rec_id": "a",
            "data_type": "expense",
            "data": {"amount": 10000, "category": "쇼핑", "need_type": "불필요", "reduction_index": 80},
        },
        {
            "rec_id": "b",
            "data_type": "expense",
            "data": {"amount": 5000, "category": "식비", "need_type": "필요", "reduction_index": 20},
        },
        {
            "rec_id": "c",
            "data_type": "expense",
            "data": {"amount": 5000, "category": "식비", "need_type": "필요", "reduction_index": 30},
        },
        {"rec_id": "d", "data_type": "income", "data": {"amount": 99999, "reduction_index": 99}},
    ]
    out = bri.compute_top_reduction_categories(rows, top_n=3)
    assert out["total_expense_amount"] == 20000.0
    assert len(out["items"]) == 2
    top = out["items"][0]
    assert top["category"] == "쇼핑"
    assert top["amount"] == 10000.0
    assert top["share_percent"] == 50.0
    assert "reduction_index" not in top
