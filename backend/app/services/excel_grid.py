"""Spreadsheet-style grid from headers + sample rows; A1 address parsing (matches editor ImportMapper)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any


def build_sheet_matrix(headers: list[str], sample_rows: list[Any]) -> list[list[Any]]:
    """Row 0 = headers (Excel row 1); following rows = sample data."""
    sample_as_lists: list[list[Any]] = []
    for row in sample_rows:
        if isinstance(row, list):
            sample_as_lists.append(row)
        else:
            sample_as_lists.append([row])
    width = len(headers)
    for r in sample_as_lists:
        width = max(width, len(r))
    width = max(width, 1)

    def pad(row: list[Any]) -> list[Any]:
        return list(row) + [None] * (width - len(row))

    out = [pad(list(headers))]
    for r in sample_as_lists:
        out.append(pad(r))
    return out


def col_letters_to_index(col: str) -> int:
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


@dataclass
class ParsedCells:
    values: list[Any]
    width: int
    height: int


def parse_address_to_cells(data: list[list[Any]], address: str) -> ParsedCells | None:
    addr = address.strip().upper().replace("$", "")
    single = re.match(r"^([A-Z]+)(\d+)$", addr)
    if single:
        c0 = col_letters_to_index(single.group(1))
        r0 = int(single.group(2)) - 1
        val = data[r0][c0] if r0 < len(data) and c0 < len(data[r0]) else None
        return ParsedCells(values=[val], width=1, height=1)

    range_m = re.match(r"^([A-Z]+)(\d+):([A-Z]+)(\d+)$", addr)
    if not range_m:
        return None

    c0 = col_letters_to_index(range_m.group(1))
    r0 = int(range_m.group(2)) - 1
    c1 = col_letters_to_index(range_m.group(3))
    r1 = int(range_m.group(4)) - 1

    values: list[Any] = []
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1):
            if r < len(data) and c < len(data[r]):
                values.append(data[r][c])
            else:
                values.append(None)

    return ParsedCells(
        values=values,
        width=c1 - c0 + 1,
        height=r1 - r0 + 1,
    )
