"""tb_record `data.date` 기준 기간(연·반기·분기·월·주) 해석·필터."""

from __future__ import annotations

import calendar
import re
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Literal

PeriodKind = Literal["year", "half", "quarter", "month", "week"]

_PERIOD_ALIASES: dict[PeriodKind, tuple[str, ...]] = {
    "year": ("year", "연", "년", "annual"),
    "half": ("half", "반기", "halfyear", "half-year"),
    "quarter": ("quarter", "분기", "q"),
    "month": ("month", "월", "monthly"),
    "week": ("week", "주", "weekly"),
}


@dataclass(frozen=True)
class ResolvedPeriod:
    kind: PeriodKind
    year: int
    start: date
    end: date
    half: int | None = None
    quarter: int | None = None
    month: int | None = None
    week: int | None = None


def parse_period_kind(raw: str | None) -> PeriodKind | None:
    if raw is None or not str(raw).strip():
        return None
    key = str(raw).strip().lower()
    for kind, aliases in _PERIOD_ALIASES.items():
        if key == kind or key in aliases:
            return kind
    return None


def resolve_period_range(
    *,
    period: str,
    year: int,
    month: int | None = None,
    half: int | None = None,
    quarter: int | None = None,
    week: int | None = None,
) -> ResolvedPeriod:
    """
    기간 종류와 연·월·반기·분기·주 번호로 [start, end] 달력일 범위를 만든다.
    `week`는 ISO 주차(월요일 시작) 기준.
    """
    kind = parse_period_kind(period)
    if kind is None:
        raise ValueError(f'지원하지 않는 period: "{period}"')

    if year < 1970 or year > 2100:
        raise ValueError("year는 1970~2100 사이여야 합니다")

    if kind == "year":
        return ResolvedPeriod(
            kind=kind,
            year=year,
            start=date(year, 1, 1),
            end=date(year, 12, 31),
        )

    if kind == "half":
        if half not in (1, 2):
            raise ValueError("반기(half)는 1(상반기) 또는 2(하반기)여야 합니다")
        if half == 1:
            return ResolvedPeriod(kind=kind, year=year, start=date(year, 1, 1), end=date(year, 6, 30), half=half)
        return ResolvedPeriod(kind=kind, year=year, start=date(year, 7, 1), end=date(year, 12, 31), half=half)

    if kind == "quarter":
        if quarter not in (1, 2, 3, 4):
            raise ValueError("분기(quarter)는 1~4여야 합니다")
        start_month = (quarter - 1) * 3 + 1
        end_month = start_month + 2
        last_day = calendar.monthrange(year, end_month)[1]
        return ResolvedPeriod(
            kind=kind,
            year=year,
            start=date(year, start_month, 1),
            end=date(year, end_month, last_day),
            quarter=quarter,
        )

    if kind == "month":
        if month is None or month < 1 or month > 12:
            raise ValueError("월(month)은 1~12여야 합니다")
        last_day = calendar.monthrange(year, month)[1]
        return ResolvedPeriod(
            kind=kind,
            year=year,
            start=date(year, month, 1),
            end=date(year, month, last_day),
            month=month,
        )

    # week — ISO
    if week is None or week < 1 or week > 53:
        raise ValueError("주(week)는 1~53(ISO)이어야 합니다")
    start = date.fromisocalendar(year, week, 1)
    end = date.fromisocalendar(year, week, 7)
    return ResolvedPeriod(kind=kind, year=year, start=start, end=end, week=week)


_ISO_DATE_RE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})")


def parse_record_date(raw: Any) -> date | None:
    """`data.date` → date. 파싱 실패 시 None."""
    if raw is None or raw == "":
        return None
    if isinstance(raw, date) and not isinstance(raw, datetime):
        return raw
    if isinstance(raw, datetime):
        return raw.date()

    s = str(raw).strip()
    if not s:
        return None

    try:
        if "T" in s:
            return datetime.fromisoformat(s.replace("Z", "+00:00")[:26]).date()
    except ValueError:
        pass

    m = _ISO_DATE_RE.match(s)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None

    for fmt in ("%Y/%m/%d", "%Y.%m.%d", "%Y%m%d"):
        try:
            return datetime.strptime(s[:10], fmt).date()
        except ValueError:
            continue
    return None


def record_in_date_range(record: dict[str, Any], start: date, end: date) -> bool:
    data = record.get("data")
    if not isinstance(data, dict):
        return False
    d = parse_record_date(data.get("date"))
    if d is None:
        return False
    return start <= d <= end


def filter_rows_by_period(
    rows: list[dict[str, Any]],
    period: ResolvedPeriod,
) -> list[dict[str, Any]]:
    return [r for r in rows if record_in_date_range(r, period.start, period.end)]
