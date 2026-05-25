"""가계부 엑셀(`가계부 내역` 시트, 없으면 2번째 시트) → `tb_record` 행 생성."""

from __future__ import annotations

import math
import unicodedata
from typing import Any
from uuid import UUID

from app.services.excel_record_import import (
    MAX_IMPORT_ROWS,
    column_index_from_header_label,
    coerce_numeric_amount,
    read_sheet_tabular,
)

# 시트 우선 이름, 없으면 인덱스 1(두 번째 시트)
HOUSEHOLD_SHEET_NAME = "가계부 내역"
FALLBACK_SHEET_INDEX = 1

# 기대 헤더(셀 텍스트; NFKC·공백 정규화 후 매칭)
H_DATE = "날짜"
H_TIME = "시간"
H_TYPE = "타입"
H_MAJOR = "대분류"
H_TITLE = "내용"
H_AMOUNT = "금액"
H_CURRENCY = "화폐"
H_PAYMENT = "결제수단"
H_MEMO = "메모"


def _trim(v: Any) -> str:
    if v is None:
        return ""
    return str(v).strip()


def _jsonable_scalar(v: Any) -> Any:
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    if isinstance(v, float) and math.isnan(v):  # type: ignore[arg-type]
        return None
    if isinstance(v, (int, float, str)):
        return v
    if hasattr(v, "isoformat"):
        return v.isoformat()
    s = str(v).strip()
    return None if not s else s


def _norm_type_key(v: Any) -> str:
    if v is None or v == "":
        return ""
    s = unicodedata.normalize("NFKC", _trim(v)).lower()
    return " ".join(s.split())


def data_type_from_entry_type(cell: Any) -> str:
    """
    시트의 `타입` 열 값을 `tb_record.data_type`에 넣기 위한 문자열로 정규화.
    알 수 없으면 `bsimport`.
    """
    k = _norm_type_key(cell)
    if not k:
        return "bsimport"

    expense_markers = ("지출", "expense", "출금", "지급", "차감", "소비")
    income_markers = ("수입", "income", "입금", "입고", "수취", "급여")

    if any(m in k for m in expense_markers):
        return "expense"
    if any(m in k for m in income_markers):
        return "income"
    return "bsimport"


def read_household_book_tabular(
    excel_bytes: bytes,
) -> tuple[str, int, list[str], list[list[Any]]]:
    """`가계부 내역` 이름으로 읽고, 실패 시 두 번째 시트를 사용합니다."""
    sheet, hr, hdr, rows = read_sheet_tabular(excel_bytes, HOUSEHOLD_SHEET_NAME)
    if hdr:
        return sheet, hr, hdr, rows
    return read_sheet_tabular(excel_bytes, None, sheet_index_0based=FALLBACK_SHEET_INDEX)


def build_tb_rows_from_bs_household_excel(
    *,
    led_id: UUID,
    excel_bytes: bytes,
) -> tuple[list[dict[str, Any]], list[str]]:
    """
    헤더: 날짜, 시간, 타입, 대분류, 내용, 금액, 화폐, 결제수단, 메모
    `data` JSON: date, amount, sheet, excel_row, source=bsimport 및 매핑된 선택 필드.
    """
    warnings: list[str] = []
    sheet, header_row_1based, headers, data_rows = read_household_book_tabular(excel_bytes)
    if not sheet:
        warnings.append("엑셀 시트를 읽을 수 없습니다.")
        return [], warnings
    if not headers:
        warnings.append("헤더 행을 찾지 못했습니다.")
        return [], warnings

    ix: dict[str, int | None] = {
        H_DATE: column_index_from_header_label(headers, H_DATE),
        H_TIME: column_index_from_header_label(headers, H_TIME),
        H_TYPE: column_index_from_header_label(headers, H_TYPE),
        H_MAJOR: column_index_from_header_label(headers, H_MAJOR),
        H_TITLE: column_index_from_header_label(headers, H_TITLE),
        H_AMOUNT: column_index_from_header_label(headers, H_AMOUNT),
        H_CURRENCY: column_index_from_header_label(headers, H_CURRENCY),
        H_PAYMENT: column_index_from_header_label(headers, H_PAYMENT),
        H_MEMO: column_index_from_header_label(headers, H_MEMO),
    }

    if ix[H_DATE] is None:
        warnings.append(f"'{H_DATE}' 열을 시트에서 찾지 못했습니다.")
    if ix[H_AMOUNT] is None:
        warnings.append(f"'{H_AMOUNT}' 열을 시트에서 찾지 못했습니다.")

    if ix[H_DATE] is None or ix[H_AMOUNT] is None:
        return [], warnings

    for label, key in (
        (H_TIME, H_TIME),
        (H_TYPE, H_TYPE),
        (H_MAJOR, H_MAJOR),
        (H_TITLE, H_TITLE),
        (H_CURRENCY, H_CURRENCY),
        (H_PAYMENT, H_PAYMENT),
        (H_MEMO, H_MEMO),
    ):
        if ix[key] is None:
            warnings.append(f"'{label}' 열을 시트에서 찾지 못했습니다(선택 열, 적재 시 누락).")

    out: list[dict[str, Any]] = []
    n_hdr = len(headers)

    def cell(row: list[Any], idx: int | None) -> Any:
        if idx is None:
            return None
        return row[idx] if idx < len(row) else None

    for offset, raw in enumerate(data_rows):
        if offset >= MAX_IMPORT_ROWS:
            warnings.append(f"행 수가 상한({MAX_IMPORT_ROWS})에 도달해 이후는 생략합니다.")
            break
        excel_row_no = header_row_1based + 1 + offset
        padded = list(raw) + [None] * max(0, n_hdr - len(raw))

        amt = coerce_numeric_amount(cell(padded, ix[H_AMOUNT]))
        if amt is None:
            continue

        dv = _jsonable_scalar(cell(padded, ix[H_DATE]))
        if dv in (None, ""):
            title_probe = _jsonable_scalar(cell(padded, ix[H_TITLE]))
            memo_probe = _jsonable_scalar(cell(padded, ix[H_MEMO]))
            if title_probe in (None, "") and memo_probe in (None, ""):
                continue
            warnings.append(f"행 {excel_row_no}: 날짜 없음 건너뜁니다.")
            continue

        type_cell = cell(padded, ix[H_TYPE])
        data_type_row = data_type_from_entry_type(type_cell)

        data_obj: dict[str, Any] = {
            "date": dv,
            "amount": amt,
            "source": "bsimport",
            "sheet": sheet,
            "excel_row": excel_row_no,
        }

        tv = _jsonable_scalar(cell(padded, ix[H_TIME]))
        if tv not in (None, ""):
            data_obj["time"] = tv

        type_str = _trim(type_cell)
        if type_str:
            data_obj["entry_type"] = type_str

        cv = _jsonable_scalar(cell(padded, ix[H_MAJOR]))
        if cv not in (None, ""):
            data_obj["category"] = cv

        title_v = _jsonable_scalar(cell(padded, ix[H_TITLE]))
        if title_v not in (None, ""):
            data_obj["title"] = title_v

        cur_v = _jsonable_scalar(cell(padded, ix[H_CURRENCY]))
        if cur_v not in (None, ""):
            data_obj["currency"] = cur_v

        pay_v = _jsonable_scalar(cell(padded, ix[H_PAYMENT]))
        if pay_v not in (None, ""):
            data_obj["payment_method"] = pay_v

        mv = _jsonable_scalar(cell(padded, ix[H_MEMO]))
        if mv not in (None, ""):
            data_obj["memo"] = mv

        out.append(
            {
                "led_id": str(led_id),
                "data_type": data_type_row,
                "data": data_obj,
            }
        )

    return out, warnings
