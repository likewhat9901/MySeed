"""은행별 엑셀 헤더(날짜·가맹점·금액) 문자열을 `tb_card`에 두고 명세 행 파싱."""

from __future__ import annotations

import json
import re
from datetime import date, datetime, timedelta
from typing import Any, TypedDict

from app.services.excel_record_import import (
    MAX_IMPORT_ROWS,
    RECORD_ROLES_AMOUNT,
    RECORD_ROLES_DATE,
    RECORD_ROLES_TITLE,
    coerce_numeric_amount,
    column_index_from_header_label,
    read_sheet_tabular,
)


class ImportCardRow(TypedDict, total=False):
    card_id: str
    card_name: str
    header_date: str
    header_merchant: str
    header_amount: str
    column_list: list[Any]


class NormalizedStatementRow(TypedDict):
    date: str
    amount: float
    merchant: str
    excel_row: int


_DEF_DATE_FORMATS = (
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%Y-%m-%d",
    "%d-%m-%Y",
    "%m-%d-%Y",
)


def _hdr_val(v: Any) -> str:
    if v is None:
        return ""
    return str(v).strip()


def coerce_column_list(column_list_raw: Any) -> list[Any]:
    """구 스키마 `column_list` JSON 배열(날짜·가맹점·금액 순) 백워드 호환."""
    if column_list_raw is None:
        return []
    if isinstance(column_list_raw, str):
        try:
            column_list_raw = json.loads(column_list_raw)
        except json.JSONDecodeError:
            return []
    if isinstance(column_list_raw, list):
        return column_list_raw
    return []


def triple_role_headers(card_row: ImportCardRow | dict[str, Any]) -> tuple[str, str, str]:
    """
    시트 헤더에서 찾아야 할 문자열 세 가지(은행별로 제각각 저장).
    - 날짜 열 헤더, 가맹점 열 헤더, 금액 열 헤더
    DB에 `header_date` 등이 비어 있으면 구 형식 column_list 순서만 백워드 처리.
    """
    h_date = _hdr_val(card_row.get("header_date"))
    h_merchant = _hdr_val(card_row.get("header_merchant"))
    h_amount = _hdr_val(card_row.get("header_amount"))
    if h_date and h_merchant and h_amount:
        return h_date, h_merchant, h_amount

    cols = coerce_column_list(card_row.get("column_list"))
    if len(cols) < 3:
        return h_date, h_merchant, h_amount

    def one(i: int) -> str:
        v = cols[i]
        return str(v).strip() if v is not None else ""

    return (
        h_date or one(0),
        h_merchant or one(1),
        h_amount or one(2),
    )


def import_card_to_column_map(card_row: ImportCardRow | dict[str, Any]) -> dict[str, str]:
    """`build_record_rows`용 매핑. 가맹점은 RECORD_ROLES_TITLE → data.title."""
    h_date, h_merchant, h_amount = triple_role_headers(card_row)
    return {
        RECORD_ROLES_DATE: h_date,
        RECORD_ROLES_TITLE: h_merchant,
        RECORD_ROLES_AMOUNT: h_amount,
    }


def _trim_str(v: Any) -> str:
    if v is None:
        return ""
    return str(v).strip()


def _coerce_date_string(v: Any) -> str | None:
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        try:
            sn = float(v)
            if 200 < sn < 100_000:
                origin = datetime(1899, 12, 30)
                return (origin + timedelta(days=sn)).date().isoformat()
        except (ValueError, OSError, OverflowError, TypeError):
            pass

    s = _trim_str(v)
    if not s or s.lower() == "nan":
        return None
    candidates = [s]
    if " " in s:
        candidates.append(s.split()[0])

    for cand in candidates:
        norm = cand.replace("/", "-").replace(".", "-").strip()
        for fmt in _DEF_DATE_FORMATS:
            try:
                return datetime.strptime(norm, fmt).date().isoformat()
            except ValueError:
                continue
    compact = re.sub(r"[^\d]", "", s)
    if len(compact) == 8:
        try:
            return datetime.strptime(compact, "%Y%m%d").date().isoformat()
        except ValueError:
            pass
    return None


def normalize_card_statement_rows(
    content: bytes,
    card_row: ImportCardRow | dict[str, Any],
    *,
    sheet_name: str | None = None,
) -> tuple[list[NormalizedStatementRow], list[str], dict[str, Any]]:
    """
    DB `tb_card`의 헤더 문자열(날짜·가맹점·금액)과 일치하는 열을 파일에서 찾아 정규화.
    """
    warnings: list[str] = []

    sheet_used, header_row_1based, headers, data_rows = read_sheet_tabular(
        content,
        sheet_name.strip() if sheet_name and str(sheet_name).strip() else None,
    )
    if not sheet_used:
        return [], ["엑셀 시트를 읽을 수 없거나 시트가 없습니다"], {}
    if not headers:
        return [], ["헤더를 찾지 못했습니다"], {}

    h_date, h_merchant, h_amount = triple_role_headers(card_row)

    legacy_cols = coerce_column_list(card_row.get("column_list"))
    if legacy_cols and not _hdr_val(card_row.get("header_date")):
        if len(legacy_cols) < 3:
            warnings.append("구 column_list는 날짜·가맹점·금액 헤더 문자열을 순서대로 3개 넣어야 합니다.")

    if not h_date:
        warnings.append("날짜 열 헤더(header_date)가 비었습니다.")
    if not h_merchant:
        warnings.append("가맹점 열 헤더(header_merchant)가 비었습니다.")
    if not h_amount:
        warnings.append("금액 열 헤더(header_amount)가 비었습니다.")

    ix_date = column_index_from_header_label(headers, h_date or None)
    ix_mrch = column_index_from_header_label(headers, h_merchant or None)
    ix_amt = column_index_from_header_label(headers, h_amount or None)

    if ix_date is None and h_date:
        warnings.append(f"'{h_date}'(날짜) 헤더를 시트에서 찾지 못했습니다.")
    if ix_mrch is None and h_merchant:
        warnings.append(f"'{h_merchant}'(가맹점) 헤더를 시트에서 찾지 못했습니다.")
    if ix_amt is None and h_amount:
        warnings.append(f"'{h_amount}'(금액) 헤더를 시트에서 찾지 못했습니다.")

    if ix_date is None or ix_amt is None:
        meta = _meta_bundle(sheet_used, header_row_1based, headers, card_row)
        return [], warnings, meta

    out: list[NormalizedStatementRow] = []
    n_cols = len(headers)

    for offset, raw in enumerate(data_rows):
        if offset >= MAX_IMPORT_ROWS:
            warnings.append(f"행 수가 상한({MAX_IMPORT_ROWS})에 도달해 이후 행은 생략합니다.")
            break
        excel_row = header_row_1based + 1 + offset
        padded = list(raw) + [None] * max(0, n_cols - len(raw))

        def cell(idx: int | None) -> Any:
            if idx is None or idx >= len(padded):
                return None
            return padded[idx]

        amt = coerce_numeric_amount(cell(ix_amt))
        if amt is None:
            continue

        dv = _coerce_date_string(cell(ix_date))
        if dv is None:
            mtxt = _trim_str(cell(ix_mrch)) if ix_mrch is not None else ""
            if not mtxt and cell(ix_amt) in (None, ""):
                continue
            warnings.append(f"행 {excel_row}: 날짜 없음 — 건너뜀.")
            continue

        merchant = _trim_str(cell(ix_mrch)) if ix_mrch is not None else ""

        out.append(
            {
                "date": dv,
                "amount": amt,
                "merchant": merchant,
                "excel_row": excel_row,
            }
        )

    meta = _meta_bundle(sheet_used, header_row_1based, headers, card_row)
    return out, warnings, meta


def _meta_bundle(
    sheet: str,
    header_row: int,
    headers: list[str],
    card_row: ImportCardRow | dict[str, Any],
) -> dict[str, Any]:
    h_date, h_merchant, h_amount = triple_role_headers(card_row)
    return {
        "sheet": sheet,
        "header_row": header_row,
        "headers": headers,
        "card_id": card_row.get("card_id"),
        "card_name": card_row.get("card_name"),
        "header_date": h_date,
        "header_merchant": h_merchant,
        "header_amount": h_amount,
    }
