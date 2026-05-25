"""카드사 명세: `tb_card.column_list`(순서 [날짜 열, 가맹점 열, 금액 열])로 맞춰 인덱스만 탐색, 값은 문자열로 그대로 적재."""

from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any
from uuid import UUID

from app.services.excel_record_import import (
    MAX_IMPORT_ROWS,
    coerce_numeric_amount,
    column_index_from_header_label,
    read_sheet_tabular,
)


def _parse_column_list(raw: Any) -> list[Any]:
    if raw is None:
        return []
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return []
    return raw if isinstance(raw, list) else []


def _trim(v: Any) -> str:
    if v is None:
        return ""
    return str(v).strip()


def _excel_cell_display(v: Any) -> str:
    """jsonb 문자열 적재만: 검증·정규 날짜 파싱 없음. 타입별로 읽히는 문자열만 정리."""
    if v is None or v == "":
        return ""
    if isinstance(v, datetime):
        return v.isoformat(timespec="seconds")
    if isinstance(v, date):
        return v.isoformat()
    s = _trim(str(v))
    return "" if s.lower() == "nan" else s


def _cell(row: list[Any], idx: int | None) -> Any:
    if idx is None:
        return None
    return row[idx] if idx < len(row) else None


def build_tb_rows_from_card_excel(
    *,
    led_id: UUID,
    card_row: dict[str, Any],
    excel_bytes: bytes,
    data_type: str = "import",
) -> tuple[list[dict[str, Any]], list[str]]:
    """
    1) `card_row["column_list"]` → [날짜 헤더, 가맹점 헤더, 금액 헤더] 문자열
    2) 시트 헤더로 열 인덱스 탐색
    3) 각 행 `data.date` ← 날짜 열 문자열(파싱·스킵 없음), `data.title`/`amount` 채움
    금액이 비거나 숫로 못 채워지면 그 행만 생략.
    """
    warnings: list[str] = []
    cols = _parse_column_list(card_row.get("column_list"))
    if len(cols) < 3:
        warnings.append("tb_card.column_list는 [날짜, 가맹점, 금액] 헤더 문자열 3개(JSON 배열)여야 합니다.")
        return [], warnings

    h_date = _trim(cols[0])
    h_merchant = _trim(cols[1])
    h_amount = _trim(cols[2])
    if not h_date:
        warnings.append("column_list[0](날짜 헤더)가 비었습니다.")
    if not h_merchant:
        warnings.append("column_list[1](가맹점 헤더)가 비었습니다.")
    if not h_amount:
        warnings.append("column_list[2](금액 헤더)가 비었습니다.")

    sheet, header_row_1based, headers, data_rows = read_sheet_tabular(excel_bytes, None)
    if not sheet:
        warnings.append("엑셀 시트를 읽을 수 없습니다.")
        return [], warnings
    if not headers:
        warnings.append("헤더 행을 찾지 못했습니다.")
        return [], warnings

    ix_date = column_index_from_header_label(headers, h_date or None)
    ix_merchant = column_index_from_header_label(headers, h_merchant or None)
    ix_amount = column_index_from_header_label(headers, h_amount or None)

    if ix_date is None and h_date:
        warnings.append(f"'{h_date}'(날짜) 열을 시트에서 찾지 못했습니다.")
    if ix_merchant is None and h_merchant:
        warnings.append(f"'{h_merchant}'(가맹점) 열을 시트에서 찾지 못했습니다.")
    if ix_amount is None and h_amount:
        warnings.append(f"'{h_amount}'(금액) 열을 시트에서 찾지 못했습니다.")

    if ix_date is None or ix_amount is None:
        return [], warnings

    out: list[dict[str, Any]] = []
    n_hdr = len(headers)

    for offset, raw in enumerate(data_rows):
        if offset >= MAX_IMPORT_ROWS:
            warnings.append(f"행 수가 상한({MAX_IMPORT_ROWS})에 도달해 이후는 생략합니다.")
            break
        excel_row_no = header_row_1based + 1 + offset
        padded = list(raw) + [None] * max(0, n_hdr - len(raw))

        amt = coerce_numeric_amount(_cell(padded, ix_amount))
        if amt is None:
            continue

        date_stored = _excel_cell_display(_cell(padded, ix_date))
        merchant = _trim(_cell(padded, ix_merchant)) if ix_merchant is not None else ""

        data_obj: dict[str, Any] = {
            "date": date_stored,
            "amount": amt,
            "sheet": sheet,
            "excel_row": excel_row_no,
        }
        if merchant:
            data_obj["title"] = merchant

        rec_name = (merchant.strip()[:400] if merchant else "") or (
            date_stored[:80] if date_stored else ""
        )

        out.append(
            {
                "led_id": str(led_id),
                "data_type": (data_type or "import").strip() or "import",
                "rec_name": rec_name or None,
                "data": data_obj,
            }
        )

    return out, warnings
