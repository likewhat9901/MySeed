"""카드 명세 → tb_record 행 생성 (파싱만, Supabase 불필요)."""

from __future__ import annotations

from uuid import uuid4

from app.services import card_excel_import as cei


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
        data_type="expense",
    )

    assert not warns
    assert len(rows) == 1
    assert rows[0]["led_id"] == str(led)
    assert rows[0]["data_type"] == "expense"
    d = rows[0]["data"]
    assert d["date"] == "2026-03-01"
    assert d["title"] == "테스트가맹"
    assert d["amount"] == 9999.0
