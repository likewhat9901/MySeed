"""excel_record_import — 파싱·매핑 (Supabase 불필요)."""

from __future__ import annotations

from uuid import uuid4

from app.services.excel_record_import import build_record_rows


def test_build_record_rows_maps_headers() -> None:
    led = uuid4()
    headers = ["날짜", "항목", "금액", "메모"]
    data_rows = [["2026-01-01", "식비", 12000, "점심"]]
    cmap = {"date": "날짜", "amount": "금액", "title": "항목", "memo": "메모"}

    rows, warns = build_record_rows(
        led_id=led,
        data_type="expense",
        sheet="시트",
        header_row_1based=1,
        headers=headers,
        data_rows=data_rows,
        column_map=cmap,
        file_id=None,
    )

    assert rows
    assert not any("찾지 못" in w for w in warns)
    assert len(rows) == 1
    assert rows[0]["led_id"] == str(led)
    assert rows[0]["data_type"] == "expense"
    assert rows[0]["data"]["amount"] == 12000.0
    assert rows[0]["data"]["title"] == "식비"


def test_skip_empty_amount() -> None:
    led = uuid4()
    headers = ["날짜", "금액"]
    data_rows = [["2026-01-01", ""]]

    rows, _ = build_record_rows(
        led_id=led,
        data_type="expense",
        sheet="S",
        header_row_1based=1,
        headers=headers,
        data_rows=data_rows,
        column_map={"date": "날짜", "amount": "금액"},
        file_id=None,
        skip_empty_amount=True,
    )
    assert rows == []
