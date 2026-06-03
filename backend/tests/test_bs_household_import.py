"""가계부 시트 → tb_record 행 생성 (파싱만)."""

from __future__ import annotations

from uuid import uuid4

from app.services import bs_household_import as bhi


def test_data_type_inference() -> None:
    assert bhi.data_type_from_entry_type("지출") == "expense"
    assert bhi.data_type_from_entry_type("Income") == "income"
    assert bhi.data_type_from_entry_type("") == "bsimport"


def test_build_maps_columns(monkeypatch) -> None:
    led = uuid4()
    hdr = ["날짜", "시간", "타입", "대분류", "내용", "금액", "화폐", "결제수단", "메모"]

    def fake_read(_excel_bytes: bytes):
        return (
            "가계부 내역",
            1,
            hdr,
            [
                ["2026-01-02", "10:00", "지출", "식비", "점심", 5000, "KRW", "카드", "메모1"],
            ],
        )

    monkeypatch.setattr(bhi, "read_household_book_tabular", fake_read)

    rows, warns = bhi.build_tb_rows_from_bs_household_excel(
        led_id=led,
        excel_bytes=b"dummy",
    )
    assert not warns
    assert len(rows) == 1
    assert rows[0]["led_id"] == str(led)
    assert rows[0]["data_type"] == "expense"
    d = rows[0]["data"]
    assert d["date"] == "2026-01-02"
    assert d["time"] == "10:00"
    assert d["entry_type"] == "지출"
    assert d["category"] == "식비"
    assert d["title"] == "점심"
    assert d["amount"] == 5000.0
    assert d["currency"] == "KRW"
    assert d["payment_method"] == "카드"
    assert d["memo"] == "메모1"
    assert d["source"] == "bsimport"


def test_negative_amount_stored_positive(monkeypatch) -> None:
    led = uuid4()
    hdr = ["날짜", "시간", "타입", "대분류", "내용", "금액", "화폐", "결제수단", "메모"]

    def fake_read(_excel_bytes: bytes):
        return (
            "가계부 내역",
            1,
            hdr,
            [["2026-01-03", None, "지출", "식비", "점심", -12000, None, None, None]],
        )

    monkeypatch.setattr(bhi, "read_household_book_tabular", fake_read)

    rows, _ = bhi.build_tb_rows_from_bs_household_excel(led_id=led, excel_bytes=b"x")
    assert rows[0]["data"]["amount"] == 12000.0
