"""tb_record 금액 통계 순수 함수 테스트."""

from __future__ import annotations

from uuid import uuid4

from app.services.record_statistics import (
    compute_led_statistics,
    filter_matching_records,
    normalize_category_compare,
    parse_stat_method,
    record_matches_category,
)


def test_parse_stat_method() -> None:
    assert parse_stat_method("sum") == "sum"
    assert parse_stat_method("합") == "sum"
    assert parse_stat_method("avg") == "avg"
    assert parse_stat_method("평균") == "avg"
    assert parse_stat_method("nope") is None


def test_category_uuid_vs_cate_id() -> None:
    uid = uuid4()
    rid = uuid4()
    ok = {"cate_id": str(uid), "data": {}}
    no = {"cate_id": str(rid), "data": {}}
    assert record_matches_category(ok, str(uid)) is True
    assert record_matches_category(no, str(uid)) is False


def test_category_string_on_data_category() -> None:
    uid = uuid4()
    row = {"cate_id": None, "data": {"category": "식비", "amount": 1000}}
    # category 인자가 UUID 형식이면 cate_id 비교만 수행(data.category 무시)
    assert record_matches_category(row, str(uid)) is False
    row2 = {"cate_id": None, "data": {"category": "식비", "amount": 1000}}
    assert record_matches_category(row2, "  식비 ") is True
    assert normalize_category_compare("식  비") == "식 비"
    row3 = {"cate_id": None, "data": {"category": "점심", "amount": 1}}
    assert record_matches_category(row3, "식비") is False


def test_compute_sum_avg() -> None:
    uid = uuid4()
    rows = [
        {"cate_id": str(uid), "data": {"amount": 100, "category": "a"}},
        {"cate_id": str(uid), "data": {"amount": 200}},
        {"cate_id": None, "data": {"amount": 50, "category": "식비"}},
        {"cate_id": None, "data": {"memo": "x"}},  # amount 없음
    ]
    s = compute_led_statistics(rows, categories=[str(uid)], method="sum")
    assert s["value"] == 300.0
    assert s["count_amount_rows"] == 2
    assert s["count_records_seen"] == 2

    a = compute_led_statistics(rows, categories=None, method="avg")
    assert a["count_records_seen"] == 4
    assert a["count_amount_rows"] == 3  # 빈 레코드 1건 제외
    assert round(a["value"], 10) == round(350 / 3, 10)


def test_filter_only() -> None:
    uid = uuid4()
    rows = [{"cate_id": str(uid), "data": {"amount": 10}}]
    fs = filter_matching_records(rows, ["식비"])
    assert len(fs) == 0


def test_compute_multi_categories_or_union() -> None:
    uid_a = uuid4()
    uid_b = uuid4()
    rows = [
        {"cate_id": str(uid_a), "data": {"amount": 100}},
        {"cate_id": str(uid_b), "data": {"amount": 20}},
        {"cate_id": None, "data": {"amount": 5, "category": "카페"}},
        {"cate_id": None, "data": {"amount": 999, "category": "무관"}},
    ]
    stats = compute_led_statistics(
        rows,
        categories=["카페", str(uid_b)],
        method="sum",
    )
    assert stats["value"] == 25.0  # 5 + 20, OR 매칭
    assert stats["count_records_seen"] == 2
    assert stats["count_amount_rows"] == 2


def test_compute_with_period_filter() -> None:
    from datetime import date

    rows = [
        {"cate_id": None, "data": {"date": "2025-01-15", "amount": 100, "category": "식비"}},
        {"cate_id": None, "data": {"date": "2025-06-15", "amount": 200, "category": "식비"}},
    ]
    stats = compute_led_statistics(
        rows,
        categories=["식비"],
        method="sum",
        period_start=date(2025, 1, 1),
        period_end=date(2025, 3, 31),
    )
    assert stats["value"] == 100.0
    assert stats["count_records_seen"] == 1

