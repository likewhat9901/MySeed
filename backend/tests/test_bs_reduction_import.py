from __future__ import annotations

from app.services import bs_reduction_import as bri


def test_record_data_kind() -> None:
    assert bri.record_data_kind({"data_type": "income", "data": {}}) == "income"
    assert bri.record_data_kind({"data_type": "expense", "data": {}}) == "expense"
    assert bri.record_data_kind({"data": {"entry_type": "지출"}}) == "expense"
    assert bri.record_data_kind({"data_type": "bsimport", "data": {}}) == "expense"
    assert bri.record_data_kind({"data_type": "import", "data": {}}) == "expense"


def test_infer_need_type_expense_only() -> None:
    assert bri.infer_need_type_for_backfill({"category": "쇼핑", "title": "의류"}) == "불만족"
    assert bri.infer_need_type_for_backfill({"category": "식비"}) == "만족"


def test_need_type_legacy_compat() -> None:
    v, ok = bri.need_type_from_data({"need_type": "필요"})
    assert v == "만족" and ok
    v, ok = bri.need_type_from_data({"need_type": "불필요"})
    assert v == "불만족" and ok


def test_compute_skips_income_strips_keys() -> None:
    rows = [
        {
            "rec_id": "r-income",
            "data_type": "income",
            "data": {"amount": 1000000, "need_type": "만족", "reduction_index": 10},
        },
        *[
            {
                "rec_id": f"r-base-{i}",
                "data_type": "expense",
                "data": {"date": "2025-06-01", "amount": 1000, "category": "식비", "need_type": "만족"},
            }
            for i in range(9)
        ],
        {
            "rec_id": "r-exp",
            "data_type": "expense",
            "data": {"date": "2025-06-02", "amount": 5000, "category": "식비", "need_type": "불만족"},
        },
    ]
    patches, summary, _ = bri.compute_reduction_for_records(rows)
    by_id = {p["rec_id"]: p["data"] for p in patches}
    assert "need_type" not in by_id["r-income"]
    assert "reduction_index" not in by_id["r-income"]
    assert by_id["r-exp"]["need_type"] == "불만족"
    assert "reduction_index" in by_id["r-exp"]
    assert summary


def test_skip_unclassified_category() -> None:
    rows = [
        {
            "rec_id": "u",
            "data_type": "expense",
            "data": {"amount": 10000, "category": "미분류", "need_type": "만족", "reduction_index": 99},
        },
        *[
            {
                "rec_id": f"e-base-{i}",
                "data_type": "expense",
                "data": {"date": "2025-06-01", "amount": 1000, "category": "식사", "need_type": "만족"},
            }
            for i in range(9)
        ],
        {
            "rec_id": "e",
            "data_type": "expense",
            "data": {"date": "2025-06-02", "amount": 5000, "category": "식사", "need_type": "만족"},
        },
    ]
    patches, summary, _ = bri.compute_reduction_for_records(rows)
    by_id = {p["rec_id"]: p["data"] for p in patches}
    assert "reduction_index" not in by_id["u"]
    assert "need_type" not in by_id["u"]
    assert "reduction_index" in by_id["e"]
    assert all(s["category"] != "미분류" for s in summary)


def test_top_reduction_categories_response_shape() -> None:
    rows = [
        {
            "rec_id": "a",
            "data_type": "expense",
            "data": {"amount": 10000, "category": "쇼핑", "need_type": "불만족", "reduction_index": 80},
        },
        {
            "rec_id": "b",
            "data_type": "expense",
            "data": {"amount": 5000, "category": "식비", "need_type": "만족", "reduction_index": 20},
        },
        {
            "rec_id": "c",
            "data_type": "expense",
            "data": {"amount": 5000, "category": "식비", "need_type": "만족", "reduction_index": 30},
        },
        {"rec_id": "d", "data_type": "income", "data": {"amount": 99999, "reduction_index": 99}},
        {
            "rec_id": "x",
            "data_type": "expense",
            "data": {"amount": 99999, "category": "미분류", "reduction_index": 99},
        },
    ]
    out = bri.compute_top_reduction_categories(rows, top_n=3)
    assert out["total_expense_amount"] == 20000.0
    assert len(out["items"]) == 2
    assert all(x["category"] != "미분류" for x in out["items"])
    top = out["items"][0]
    assert top["category"] == "쇼핑"
    assert top["amount"] == 10000.0
    assert top["share_percent"] == 50.0
    assert "reduction_index" not in top


def test_top_reduction_categories_period_filter() -> None:
    rows = [
        {
            "rec_id": "a",
            "data_type": "expense",
            "data": {
                "date": "2025-01-15",
                "amount": 10000,
                "category": "쇼핑",
                "need_type": "불만족",
                "reduction_index": 90,
            },
        },
        {
            "rec_id": "b",
            "data_type": "expense",
            "data": {
                "date": "2025-06-15",
                "amount": 5000,
                "category": "식비",
                "need_type": "만족",
                "reduction_index": 10,
            },
        },
    ]
    from datetime import date

    out = bri.compute_top_reduction_categories(
        rows,
        top_n=3,
        period_start=date(2025, 1, 1),
        period_end=date(2025, 3, 31),
    )
    assert out["expense_record_count"] == 1
    assert out["total_expense_amount"] == 10000.0
    assert len(out["items"]) == 1
    assert out["items"][0]["category"] == "쇼핑"


def test_skip_index_when_category_sample_under_10_in_6_months() -> None:
    rows = [
        {
            "rec_id": "a",
            "data_type": "expense",
            "data": {
                "date": "2025-05-13",
                "amount": 2000,
                "category": "여행/숙박",
                "need_type": "불만족",
                "reduction_index": 99,
            },
        },
        {
            "rec_id": "b",
            "data_type": "expense",
            "data": {
                "date": "2025-09-05",
                "amount": 15000,
                "category": "여행/숙박",
                "need_type": "만족",
                "reduction_index": 88,
            },
        },
    ]
    patches, summary, _ = bri.compute_reduction_for_records(rows)
    by_id = {p["rec_id"]: p["data"] for p in patches}
    assert "reduction_index" not in by_id["a"]
    assert "reduction_index" not in by_id["b"]
    assert by_id["a"]["need_type"] == "불만족"
    assert not any(s["category"] == "여행/숙박" for s in summary)
