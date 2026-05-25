"""카드 명세 → tb_record 행 생성 (파싱만, Supabase 불필요)."""

from __future__ import annotations

from uuid import uuid4

from app.services import card_excel_import as cei


def test_excel_cell_display_string_only() -> None:
    """날짜 파싱 없음: 문자열·숫 표시 문자열만."""
    assert cei._excel_cell_display("05.07 18:18:04") == "05.07 18:18:04"
    assert cei._excel_cell_display(12345.5) == "12345.5"
    assert cei._excel_cell_display(None) == ""


def test_build_keeps_any_date_text(monkeypatch) -> None:
    """금액만 채워지면 날짜 열 무엇이든 저장."""
    led = uuid4()
    card_row = {"column_list": ["이용일", "가맹점명", "이용금액"]}

    def fake_read_sheet(_bytes: bytes, sheet_name=None):
        return (
            "Sheet1",
            1,
            ["이용일", "가맹점명", "이용금액"],
            [["헤더/요약문", "가맹", 3000]],
        )

    monkeypatch.setattr(cei, "read_sheet_tabular", fake_read_sheet)

    rows, warns = cei.build_tb_rows_from_card_excel(
        led_id=led,
        card_row=card_row,
        excel_bytes=b"dummy",
    )
    assert not warns
    assert len(rows) == 1
    assert rows[0]["data"]["date"] == "헤더/요약문"


def test_build_tb_rows_from_card_basic(monkeypatch) -> None:
    led = uuid4()
    card_row = {"column_list": ["이용일", "가맹점명", "이용금액"]}

    def fake_read_sheet(_bytes: bytes, sheet_name=None):
        assert sheet_name is None
        return (
            "Sheet1",
            1,
            ["이용일", "가맹점명", "이용금액"],
            [["2026-03-01", "테스트가맹", 9999]],
        )

    monkeypatch.setattr(cei, "read_sheet_tabular", fake_read_sheet)

    rows, warns = cei.build_tb_rows_from_card_excel(
        led_id=led,
        card_row=card_row,
        excel_bytes=b"dummy",
    )

    assert not warns
    assert len(rows) == 1
    assert rows[0]["led_id"] == str(led)
    assert rows[0]["data_type"] == "import"
    assert rows[0]["rec_name"] == "테스트가맹"
    d = rows[0]["data"]
    assert d["date"] == "2026-03-01"
    assert d["title"] == "테스트가맹"
    assert d["amount"] == 9999.0
