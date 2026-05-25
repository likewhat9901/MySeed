"""Parse spreadsheet rows into `tb_record.data`-shaped payloads for ledger import."""

from __future__ import annotations

import io
import math
import re
import unicodedata
from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID

from openpyxl import load_workbook

MAX_IMPORT_ROWS = 5000


# Logical roles → 헤더 셀에 적힌 문자열(column_map 값)
RECORD_ROLES_DATE = "date"
RECORD_ROLES_AMOUNT = "amount"
RECORD_ROLES_TITLE = "title"
RECORD_ROLES_MEMO = "memo"
RECORD_ROLES_CATEGORY = "category"


def _norm_header(v: Any) -> str:
    return str(v).strip() if v not in (None, "") else ""


def _norm_header_key(v: Any) -> str:
    """시트 헤더·설정 문자열 매칭용(공백·유니코드 정규화)."""
    s = _norm_header(v)
    if not s:
        return ""
    s = unicodedata.normalize("NFKC", s).replace("\u00a0", " ").replace("\u3000", " ")
    return " ".join(s.split()).strip().lower()


def _detect_header_row(all_rows: list[list[Any]]) -> int:
    for i, row in enumerate(all_rows[:5]):
        non_null = [v for v in row if v not in (None, "")]
        if len(non_null) >= max(2, len(row) // 2):
            text_cells = sum(1 for v in non_null if isinstance(v, str))
            if non_null and text_cells / len(non_null) >= 0.6:
                return i + 1
    return 1


def _resolve_col_index(headers: list[str], label: str | None) -> int | None:
    if label is None or not str(label).strip():
        return None
    want_k = _norm_header_key(label)
    if not want_k:
        return None
    want_line = want_k.split("\n")[0].strip()
    for i, h in enumerate(headers):
        hn_k = _norm_header_key(h)
        if not hn_k:
            continue
        hn_line = hn_k.split("\n")[0].strip()
        if hn_k == want_k or hn_line == want_line:
            return i
    return None


def _cell(row: list[Any], idx: int | None) -> Any:
    if idx is None:
        return None
    return row[idx] if idx < len(row) else None


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
    return str(v)


def _coerce_amount(v: Any) -> float | None:
    if v is None or v == "":
        return None
    if isinstance(v, bool):
        return float(int(v))
    if isinstance(v, (int, float)):
        if isinstance(v, float) and math.isnan(v):  # type: ignore[arg-type]
            return None
        return float(v)
    if isinstance(v, Decimal):
        try:
            return float(v)
        except (ValueError, InvalidOperation):
            return None
    s = str(v).strip().replace(",", "").replace("₩", "").replace("원", "").strip()
    if not s or s.lower() == "nan":
        return None
    try:
        return float(Decimal(s))
    except InvalidOperation:
        pass
    m = re.search(r"[-+]?\d*\.?\d+", s)
    if m:
        try:
            return float(m.group())
        except ValueError:
            return None
    return None


def column_index_from_header_label(headers: list[str], header_label: str | None) -> int | None:
    """시트 헤더 문자열이 엑셀 `headers` 목록 중 어느 열인지 찾습니다 (다른 서비스에서 재사용)."""
    return _resolve_col_index(headers, header_label)


def coerce_numeric_amount(v: Any) -> float | None:
    """엑셀·문자열을 금액(float)으로 정규화 (`build_record_rows`와 동일 규칙)."""
    return _coerce_amount(v)


def _looks_like_legacy_xls(content: bytes) -> bool:
    """Excel 97-2003 바이너리(.xls) OLE 헤더."""
    return len(content) >= 8 and content[:8] == b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"


def _read_sheet_tabular_xls(
    content: bytes,
    sheet_name: str | None,
    sheet_index_0based: int | None = None,
) -> tuple[str, int, list[str], list[list[Any]]]:
    import xlrd
    from xlrd import xldate_as_datetime as _xld_as_dt

    wb = xlrd.open_workbook(file_contents=content, formatting_info=False)
    names = wb.sheet_names()
    if not names:
        return "", 1, [], []

    resolved: str | None = sheet_name.strip() if sheet_name and sheet_name.strip() else None
    if resolved and resolved not in names:
        return resolved, 1, [], []
    if resolved:
        sh = wb.sheet_by_name(resolved)
    elif sheet_index_0based is not None:
        if sheet_index_0based < 0 or sheet_index_0based >= len(names):
            return "", 1, [], []
        resolved = names[sheet_index_0based]
        sh = wb.sheet_by_index(sheet_index_0based)
    else:
        sh = wb.sheet_by_index(0)
        resolved = names[0]

    all_rows: list[list[Any]] = []
    row_limit = min(sh.nrows, MAX_IMPORT_ROWS)
    n_cols = max((sh.row_len(rx) if rx < sh.nrows else 0 for rx in range(row_limit)), default=0)
    n_cols = max(n_cols, sh.ncols)

    for rowx in range(row_limit):
        row_vals: list[Any] = []
        for colx in range(n_cols):
            if rowx >= sh.nrows or colx >= sh.row_len(rowx):
                row_vals.append(None)
                continue
            ctype = sh.cell_type(rowx, colx)
            val = sh.cell_value(rowx, colx)
            if ctype == xlrd.XL_CELL_EMPTY:
                row_vals.append(None)
            elif ctype == xlrd.XL_CELL_DATE and val != "":
                try:
                    row_vals.append(_xld_as_dt(val, wb.datemode))
                except Exception:
                    row_vals.append(val)
            elif ctype == xlrd.XL_CELL_NUMBER and val == int(val):
                row_vals.append(int(val))
            else:
                row_vals.append(val)
        all_rows.append(row_vals)

    if not all_rows:
        return resolved, 1, [], []

    hdr_row_idx = _detect_header_row(all_rows)
    headers_raw = all_rows[hdr_row_idx - 1] if hdr_row_idx - 1 < len(all_rows) else []
    headers: list[str] = []
    for i in range(n_cols):
        h = headers_raw[i] if i < len(headers_raw) else None
        headers.append(str(h).strip() if h not in (None, "") else f"column_{i + 1}")

    data_rows = all_rows[hdr_row_idx:]
    return resolved, hdr_row_idx, headers, data_rows


def read_sheet_tabular(
    content: bytes,
    sheet_name: str | None = None,
    *,
    sheet_index_0based: int | None = None,
) -> tuple[str, int, list[str], list[list[Any]]]:
    """
    Returns `(used_sheet_name, header_row_1based, headers as strings, raw data rows)`
    각 data row는 시트 행 하나(패딩 없음 가능).
    `.xlsx` 는 openpyxl, `.xls`(레거시)는 xlrd 1.x.

    `sheet_name`이 지정되어 있으면 해당 이름을 우선 사용합니다 (없으면 빈 헤더로 실패 결과).
    그렇지 않고 `sheet_index_0based`가 있으면 그 인덱스의 시트를 씁니다.
    둘 다 비어 있으면 첫 시트입니다.
    """
    if _looks_like_legacy_xls(content):
        try:
            return _read_sheet_tabular_xls(content, sheet_name, sheet_index_0based)
        except Exception:
            pass

    wb = load_workbook(io.BytesIO(content), data_only=True, read_only=True)
    try:
        names = wb.sheetnames
        if not names:
            return "", 1, [], []
        resolved = sheet_name.strip() if sheet_name and sheet_name.strip() else None
        if resolved:
            ws = wb[resolved] if resolved in names else None
            if ws is None:
                return resolved, 1, [], []
        elif sheet_index_0based is not None:
            if sheet_index_0based < 0 or sheet_index_0based >= len(names):
                return "", 1, [], []
            resolved = names[sheet_index_0based]
            ws = wb[resolved]
        else:
            ws = wb[names[0]]
            resolved = names[0]

        all_rows: list[list[Any]] = []
        for idx, row in enumerate(ws.iter_rows(values_only=True)):
            if idx >= MAX_IMPORT_ROWS:
                break
            all_rows.append(list(row))

        if not all_rows or not ws:
            return resolved, 1, [], []

        n_cols = max((len(r) for r in all_rows), default=0)
        header_row = _detect_header_row(all_rows)
        headers_raw = all_rows[header_row - 1] if header_row - 1 < len(all_rows) else []
        headers: list[str] = []
        for i in range(n_cols):
            h = headers_raw[i] if i < len(headers_raw) else None
            headers.append(str(h).strip() if h not in (None, "") else f"column_{i + 1}")

        data_rows = all_rows[header_row:]
        return resolved, header_row, headers, data_rows
    finally:
        wb.close()


def build_record_rows(
    *,
    led_id: UUID,
    data_type: str,
    sheet: str,
    header_row_1based: int,
    headers: list[str],
    data_rows: list[list[Any]],
    column_map: dict[str, str],
    file_id: UUID | None,
    skip_empty_amount: bool = True,
    data_source: str = "excel_import",
) -> tuple[list[dict[str, Any]], list[str]]:
    """
    `column_map` 키: date | amount | title | memo | category (값은 엑셀 헤더 텍스트).
    반환: insert용 dict 목록 및 경고 문자열 목록.
    """
    warnings: list[str] = []

    ix_date = _resolve_col_index(headers, column_map.get(RECORD_ROLES_DATE))
    ix_amount = _resolve_col_index(headers, column_map.get(RECORD_ROLES_AMOUNT))
    ix_title = _resolve_col_index(headers, column_map.get(RECORD_ROLES_TITLE))
    ix_memo = _resolve_col_index(headers, column_map.get(RECORD_ROLES_MEMO))
    ix_cat = _resolve_col_index(headers, column_map.get(RECORD_ROLES_CATEGORY))

    required = RECORD_ROLES_DATE, RECORD_ROLES_AMOUNT
    for role in required:
        if not str(column_map.get(role, "")).strip():
            warnings.append(f"column_map에 '{role}' 헤더가 비어 있습니다.")
    if ix_date is None and column_map.get(RECORD_ROLES_DATE):
        warnings.append(f"'{column_map.get(RECORD_ROLES_DATE)}' 헤더를 시트에서 찾지 못했습니다.")
    if ix_amount is None and column_map.get(RECORD_ROLES_AMOUNT):
        warnings.append(f"'{column_map.get(RECORD_ROLES_AMOUNT)}' 헤더를 시트에서 찾지 못했습니다.")
    if ix_date is None or ix_amount is None:
        return [], warnings

    out: list[dict[str, Any]] = []
    for offset, raw in enumerate(data_rows):
        excel_row_no = header_row_1based + 1 + offset
        padded = raw + [None] * max(0, len(headers) - len(raw))

        amt = _coerce_amount(_cell(padded, ix_amount))
        if skip_empty_amount and (amt is None):
            continue
        if amt is None and not skip_empty_amount:
            amt = 0.0

        dv = _jsonable_scalar(_cell(padded, ix_date))
        if dv is None or dv == "":
            title_probe = _jsonable_scalar(_cell(padded, ix_title))
            amt_probe = _cell(padded, ix_amount)
            memo_probe = _jsonable_scalar(_cell(padded, ix_memo))
            if all(x in (None, "") for x in (title_probe, amt_probe, memo_probe)):
                continue
            warnings.append(f"행 {excel_row_no}: 날짜 없음 건너뜁니다.")
            continue

        tv = _jsonable_scalar(_cell(padded, ix_title))
        mv = _jsonable_scalar(_cell(padded, ix_memo))
        cv = _jsonable_scalar(_cell(padded, ix_cat))

        data_obj: dict[str, Any] = {
            "date": dv,
            "amount": amt,
            "source": (data_source or "excel_import").strip() or "excel_import",
            "sheet": sheet,
            "excel_row": excel_row_no,
        }
        if tv:
            data_obj["title"] = tv
        if mv:
            data_obj["memo"] = mv
        if cv:
            data_obj["category"] = cv

        row_sql: dict[str, Any] = {
            "led_id": str(led_id),
            "data_type": data_type,
            "data": data_obj,
        }
        if file_id is not None:
            row_sql["file_id"] = str(file_id)

        out.append(row_sql)

    return out, warnings
