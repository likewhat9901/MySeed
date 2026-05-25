"""카드사 명세: `tb_card.column_list`(순서 [날짜, 가맹점, 금액] 헤더)로 열만 찾아 tb_record 형태 행 생성."""

from __future__ import annotations

import json
import re
from datetime import date, datetime, timedelta
from typing import Any
from uuid import UUID

from app.services.excel_record_import import (
    MAX_IMPORT_ROWS,
    coerce_numeric_amount,
    column_index_from_header_label,
    read_sheet_tabular,
)


_DATE_FORMATS = (
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%Y-%m-%d",
    "%d-%m-%Y",
    "%m-%d-%Y",
)


def _expand_two_digit_year(y: int) -> int:
    if 0 <= y <= 99:
        return 2000 + y if y < 70 else 1900 + y
    return y


def _coerce_ymd(y: int, mo: int, d: int) -> str | None:
    try:
        if y < 100:
            y = _expand_two_digit_year(y)
        return date(y, mo, d).isoformat()
    except ValueError:
        return None


def _parse_korean_ymd(s: str) -> str | None:
    m = re.search(r"(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일", s)
    if not m:
        return None
    return _coerce_ymd(int(m.group(1)), int(m.group(2)), int(m.group(3)))


def _parse_delimited_numbers(cand: str) -> str | None:
    """`2026.3.5` / `2026-03-5` / `15-03-2026` 등 (월·일 자릿수 불필요)."""
    head = cand.split()[0] if cand else ""
    head = re.sub(r"\([^)]*\)", "", head).strip()
    bits = re.split(r"[-/.]", head)
    if len(bits) != 3:
        return None
    try:
        xs = [int(b.strip()) for b in bits if b.strip().isdigit()]
    except ValueError:
        return None
    if len(xs) != 3:
        return None
    a, b, c = xs
    if a >= 1900:
        return _coerce_ymd(a, b, c)
    if c >= 1900:
        if a > 12:
            return _coerce_ymd(c, b, a)
        if b > 12:
            return _coerce_ymd(c, a, b)
        return _coerce_ymd(c, a, b)
    if a < 100 and 1 <= b <= 12 and 1 <= c <= 31:
        return _coerce_ymd(_expand_two_digit_year(a), b, c)
    if c < 100 and 1 <= a <= 12 and 1 <= b <= 31:
        return _coerce_ymd(_expand_two_digit_year(c), a, b)
    return None


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


def _extract_reference_calendar_from_row(cells: list[Any]) -> str | None:
    """같은 행의 `yyyy.mm.dd` 형 전체 일자 하나(청구·결제예정 등) — 이용일 월일에 연 붙일 때 참고."""

    ym_d = re.compile(r"(20\d{2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})\b")
    picked: date | None = None

    for c in cells:
        if c is None or c == "":
            continue
        s = _trim(str(c))
        if not s:
            continue
        for m in ym_d.finditer(s):
            try:
                dt = date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            except ValueError:
                continue
            if picked is None or dt >= picked:
                picked = dt
    return picked.isoformat() if picked else None


def _compose_mm_dd_with_reference(day_cell: Any, reference_iso: str | None) -> str | None:
    """`05.07 18:18:04` — 연도 없음. 같은 행의 `reference_iso`(예: 청구 2026-06-01)로 년 처리."""

    if not reference_iso:
        return None
    ref_d = date.fromisoformat(reference_iso)
    ry, ref_m = ref_d.year, ref_d.month

    s = _trim(day_cell)
    if not s:
        return None
    head = s.split()[0] if " " in s else s
    head = re.sub(r"\(.*?\)", "", head).strip()

    mm = re.match(r"^\s*(\d{1,2})\s*[./-]\s*(\d{1,2})\b", head)
    if not mm:
        return None
    tm, td = int(mm.group(1)), int(mm.group(2))

    yy = ry
    if tm >= 11 and ref_m <= 3:
        yy = ry - 1

    return _coerce_ymd(yy, tm, td)


def _parse_date_iso(v: Any, *, reference_iso: str | None = None) -> str | None:
    """열 값 하나를 `YYYY-MM-DD` 문자열로."""
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

    s = _trim(v)
    if not s or s.lower() == "nan":
        return None

    ko = _parse_korean_ymd(s)
    if ko:
        return ko

    candidates = [s]
    if " " in s:
        candidates.append(s.split()[0])

    for cand in candidates:
        dl = _parse_delimited_numbers(cand)
        if dl:
            return dl
        norm = cand.replace("/", "-").replace(".", "-").strip()
        for fmt in _DATE_FORMATS:
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
    if reference_iso:
        cfb = _compose_mm_dd_with_reference(v, reference_iso)
        if cfb:
            return cfb
    return None


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
    2) 엑셀 첫 시트에서 동일한 헤더명 열 인덱스 탐색
    3) 각 데이터 행: 첫 열→날짜, 둘째→가맹점(`data.title`), 셋째→금액(`data.amount`)
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

        ref_calendar = _extract_reference_calendar_from_row(padded)

        amt = coerce_numeric_amount(_cell(padded, ix_amount))
        if amt is None:
            continue

        raw_dc = _cell(padded, ix_date)
        date_iso = _parse_date_iso(
            raw_dc,
            reference_iso=ref_calendar,
        )
        if date_iso is None:
            warnings.append(f"행 {excel_row_no}: 날짜 파싱 실패 — 건너뜀.")
            continue

        # jsonb 에는 문자열만 저장 (파이썬 date/datetime 객체·JSON 전용 타입 불사용)
        if isinstance(raw_dc, str):
            date_stored = _trim(raw_dc)
        elif raw_dc in (None, ""):
            date_stored = str(date_iso)
        else:
            date_stored = str(date_iso)

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
            str(date_iso)[:80] if date_iso else ""
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
