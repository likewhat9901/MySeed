from __future__ import annotations

from datetime import date

import pytest

from app.services.record_period import (
    filter_rows_by_period,
    parse_period_kind,
    parse_record_date,
    record_in_date_range,
    resolve_period_range,
)


def test_parse_period_kind_korean() -> None:
    assert parse_period_kind("월") == "month"
    assert parse_period_kind("반기") == "half"
    assert parse_period_kind("분기") == "quarter"


def test_resolve_ranges() -> None:
    y = resolve_period_range(period="year", year=2025)
    assert y.start == date(2025, 1, 1) and y.end == date(2025, 12, 31)

    h1 = resolve_period_range(period="half", year=2025, half=1)
    assert h1.end == date(2025, 6, 30)

    q2 = resolve_period_range(period="quarter", year=2025, quarter=2)
    assert q2.start == date(2025, 4, 1) and q2.end == date(2025, 6, 30)

    m3 = resolve_period_range(period="month", year=2025, month=2)
    assert m3.end == date(2025, 2, 28)

    w = resolve_period_range(period="week", year=2025, week=10)
    assert w.start <= w.end
    assert (w.end - w.start).days == 6


def test_parse_record_date_iso() -> None:
    assert parse_record_date("2025-09-04T00:00:00") == date(2025, 9, 4)
    assert parse_record_date("2025-09-04") == date(2025, 9, 4)


def test_filter_rows_by_period() -> None:
    rows = [
        {"data": {"date": "2025-03-01", "amount": 1}},
        {"data": {"date": "2025-08-01", "amount": 2}},
    ]
    p = resolve_period_range(period="quarter", year=2025, quarter=1)
    out = filter_rows_by_period(rows, p)
    assert len(out) == 1
    assert record_in_date_range(out[0], p.start, p.end)


def test_resolve_month_requires_month() -> None:
    with pytest.raises(ValueError):
        resolve_period_range(period="month", year=2025)
