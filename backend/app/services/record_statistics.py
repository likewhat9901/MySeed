"""tb_record 목록에서 금액 합·평균 계산."""

from __future__ import annotations

import unicodedata
from datetime import date
from typing import Any, Iterable, Literal, Sequence
from uuid import UUID

from app.services.excel_record_import import coerce_numeric_amount
from app.services.record_period import record_in_date_range

StatMethod = Literal["sum", "avg"]


def normalize_category_compare(s: str) -> str:
    """헤더/셀 문자열 매칭과 유사하게 NFKC + 공백 압축 + 소문자."""
    raw = unicodedata.normalize("NFKC", str(s)).replace("\u00a0", " ").replace("\u3000", " ")
    return " ".join(raw.split()).strip().lower()


def parse_stat_method(raw: str | None) -> StatMethod | None:
    if raw is None or not str(raw).strip():
        return None
    m = str(raw).strip().lower()
    if m in ("sum", "합", "total"):
        return "sum"
    if m in ("avg", "average", "mean", "평균"):
        return "avg"
    return None


def _record_amount(record: dict[str, Any]) -> float | None:
    data = record.get("data")
    if not isinstance(data, dict):
        return None
    return coerce_numeric_amount(data.get("amount"))


def parse_category_filters(raw_list: Iterable[str]) -> tuple[frozenset[str], frozenset[str]]:
    """
    카테고리 인자 문자열 목록에서 (비교키) 집합 2종을 만듭니다.
    반환값: `(data.category 매칭용 정규화 문자열 모음`, `cate_id(UUID) 문자열 소문자 모음`).
    UUID 문법 문자열은 cate_id 쪽만, 나머지는 data.category 쪽만 씁니다.
    """
    str_keys: set[str] = set()
    uuid_keys: set[str] = set()
    for raw in raw_list:
        s = str(raw).strip()
        if not s:
            continue
        try:
            u = UUID(s)
            uuid_keys.add(str(u).lower())
        except ValueError:
            nk = normalize_category_compare(s)
            if nk:
                str_keys.add(nk)
    return frozenset(str_keys), frozenset(uuid_keys)


def record_matches_category_buckets(
    record: dict[str, Any],
    str_keys: frozenset[str],
    uuid_keys: frozenset[str],
) -> bool:
    """`str_keys`·`uuid_keys` 중 하나라도 일치하면 True (OR). 둘 다 비었으면 False."""
    if not str_keys and not uuid_keys:
        return False
    cid = record.get("cate_id")
    if uuid_keys and cid not in (None, ""):
        if str(cid).strip().lower() in uuid_keys:
            return True

    if str_keys:
        d = record.get("data")
        if isinstance(d, dict):
            cell = d.get("category")
            if cell not in (None, ""):
                if normalize_category_compare(str(cell)) in str_keys:
                    return True
    return False


def record_matches_category(record: dict[str, Any], category: str | None) -> bool:
    """
    - `category` 없음 또는 공백: 모든 행 (필터 없음).
    - 그 외: 단일 항목으로 `record_matches_categories` 와 동일 규칙.
    """
    if category is None or not str(category).strip():
        return True

    raw = str(category).strip()
    return record_matches_categories(record, [raw])


def record_matches_categories(record: dict[str, Any], categories: Sequence[str] | None) -> bool:
    """
    - `categories`가 None → 필터 없음(모든 행).
    - trim 후 빈 목록도 필터 없음(전체).
    - 각 값 중 하나와 일치하면 포함: OR (`data.category` 또는 `cate_id`).
    """
    if categories is None:
        return True
    trimmed = [str(x).strip() for x in categories if str(x).strip()]
    if not trimmed:
        return True
    str_keys, uuid_keys = parse_category_filters(trimmed)
    if not str_keys and not uuid_keys:
        return False
    return record_matches_category_buckets(record, str_keys, uuid_keys)


def filter_matching_records(
    records: list[dict[str, Any]],
    categories: Sequence[str] | None,
) -> list[dict[str, Any]]:
    if categories is None:
        return list(records)

    trimmed = [str(x).strip() for x in categories if str(x).strip()]
    if not trimmed:
        return list(records)

    str_keys, uuid_keys = parse_category_filters(trimmed)
    if not str_keys and not uuid_keys:
        return []

    return [
        r
        for r in records
        if record_matches_category_buckets(r, str_keys, uuid_keys)
    ]


def filter_records_by_period(
    records: list[dict[str, Any]],
    period_start: date | None,
    period_end: date | None,
) -> list[dict[str, Any]]:
    if period_start is None or period_end is None:
        return list(records)
    return [r for r in records if record_in_date_range(r, period_start, period_end)]


def aggregate_amounts_for_records(
    records: list[dict[str, Any]],
    method: StatMethod,
) -> tuple[float | None, int]:
    """
    각 행 `data.amount`를 숫자로만 집계. 반환 `(값, 포함된 레코드 수)`.
    평균은 건수 0 이면 `None`.
    합계는 건수 0 이면 `0.0`.
    """
    amounts: list[float] = []
    for r in records:
        v = _record_amount(r)
        if v is not None:
            amounts.append(float(v))

    if method == "sum":
        return (sum(amounts), len(amounts))
    # avg
    if not amounts:
        return (None, 0)
    return (sum(amounts) / len(amounts), len(amounts))


def compute_led_statistics(
    records: list[dict[str, Any]],
    *,
    categories: Sequence[str] | None = None,
    method: StatMethod,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict[str, Any]:
    matched = filter_matching_records(records, categories)
    matched = filter_records_by_period(matched, period_start, period_end)
    val, amt_count = aggregate_amounts_for_records(matched, method)
    return {
        "count_amount_rows": amt_count,
        "count_records_seen": len(matched),
        "value": val,
        "method": method,
    }
