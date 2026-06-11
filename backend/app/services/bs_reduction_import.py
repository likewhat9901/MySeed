"""DB의 tb_record를 기준으로 사용자 필요도 + 절감지수만 data에 반영."""

from __future__ import annotations

import math
import unicodedata
from collections import defaultdict
from datetime import date
from typing import Any

from app.services.dynamic_reduction import (
    ReductionContext,
    build_reduction_context,
    category_meets_index_sample,
    month_key_from_data,
)
from app.services.excel_record_import import coerce_numeric_amount
from app.services.record_period import parse_record_date, record_in_date_range

# 재계산 시 data에 추가·갱신하는 키만 이 둘
DATA_KEY_NEED_TYPE = "need_type"
DATA_KEY_REDUCTION_INDEX = "reduction_index"

NEED_TYPE_SATISFIED = "만족"
NEED_TYPE_UNSATISFIED = "불만족"
SKIP_INDEX_CATEGORY = "미분류"

# 금액 점수 (기존 5만당 1점·상한 20 → 4만당 1점·상한 30)
AMOUNT_SCORE_DIVISOR = 40_000.0
AMOUNT_SCORE_CAP = 30.0

# 예전에 쓰던 키(읽기 호환·저장 시 제거)
_LEGACY_DATA_KEYS = frozenset(
    {"is_necessary", "necessity_confidence", "category_auto_assigned"}
)

CATEGORY_RULES: dict[str, tuple[str, ...]] = {
    "식비": ("식비", "음식", "푸드", "마트", "편의점", "배달", "식당", "카페", "커피"),
    "교통": ("교통", "버스", "지하철", "택시", "주유", "주차", "통행료"),
    "주거/공과금": ("월세", "전세", "관리비", "전기", "가스", "수도", "공과금", "주거"),
    "통신": ("통신", "휴대폰", "인터넷", "전화", "요금제"),
    "의료/건강": ("병원", "약국", "치과", "의료", "건강", "헬스"),
    "쇼핑": ("쇼핑", "의류", "옷", "패션", "잡화", "쿠팡", "지마켓"),
    "문화/여가": ("영화", "넷플릭스", "게임", "공연", "문화", "여가", "취미"),
    "교육": ("학원", "강의", "도서", "책", "교육"),
    "수입": ("급여", "월급", "보너스", "환급", "용돈", "수입"),
}


def _norm_text(v: Any) -> str:
    if v is None:
        return ""
    s = unicodedata.normalize("NFKC", str(v)).replace("\u00a0", " ").replace("\u3000", " ")
    return " ".join(s.split()).strip().lower()


def _trim(v: Any) -> str:
    if v is None:
        return ""
    return str(v).strip()


def record_data_kind(row: dict[str, Any]) -> str:
    """
    `income` | `expense` | `other`.
    소비 줄이기(need_type·reduction_index)는 **지출(expense)만** 대상.
    """
    data = row.get("data")
    if not isinstance(data, dict):
        data = {}

    col_dt = _norm_text(row.get("data_type") or "")
    et = _norm_text(data.get("entry_type") or "")

    if col_dt == "income" or "수입" in col_dt or "income" in col_dt:
        return "income"
    if "수입" in et or "income" in et:
        return "income"

    if col_dt in ("expense", "import", "bsimport") or "지출" in col_dt or "expense" in col_dt:
        return "expense"
    if "지출" in et or "expense" in et:
        return "expense"

    return "other"


def is_expense_record(row: dict[str, Any]) -> bool:
    return record_data_kind(row) == "expense"


def is_index_skipped_category(category: str) -> bool:
    """지수·가중치 계산에서 제외할 카테고리."""
    return _trim(category) == SKIP_INDEX_CATEGORY


def _strip_reduction_index_only(data: dict[str, Any]) -> dict[str, Any]:
    """표본 부족 등 지수 미계산 거래에서 `reduction_index`만 제거 (`need_type` 유지)."""
    out = dict(data)
    out.pop(DATA_KEY_REDUCTION_INDEX, None)
    return out


def _strip_reduction_fields(data: dict[str, Any]) -> dict[str, Any]:
    """수입·기타·미분류 등 지수 대상 아닌 거래에서 관련 키 제거."""
    out = dict(data)
    out.pop(DATA_KEY_NEED_TYPE, None)
    out.pop(DATA_KEY_REDUCTION_INDEX, None)
    out.pop("satisfaction", None)
    for k in _LEGACY_DATA_KEYS:
        out.pop(k, None)
    return out


def category_for_index(
    raw_category: Any,
    title: Any,
    memo: Any,
    payment_method: Any,
) -> str:
    """지수 계산용 카테고리(저장하지 않음, 기존 data.category 우선)."""
    c = _trim(raw_category)
    if c:
        return c
    bag = " ".join((_norm_text(title), _norm_text(memo), _norm_text(payment_method)))
    for category, kws in CATEGORY_RULES.items():
        if any(_norm_text(kw) in bag for kw in kws):
            return category
    return "기타"


# 초기 백필: 엑셀 `category`·거래유형 기준 자동 태깅(사용자 입력 전 테스트용)
_NON_ESSENTIAL_CATEGORY_MARKERS = (
    "쇼핑",
    "문화",
    "여가",
    "외식",
    "카페",
    "커피",
    "취미",
    "게임",
    "영화",
    "넷플릭스",
    "의류",
    "패션",
)
_ESSENTIAL_CATEGORY_MARKERS = (
    "주거",
    "공과금",
    "통신",
    "의료",
    "건강",
    "교육",
    "교통",
    "식료",
    "마트",
    "급여",
    "수입",
    "월세",
    "관리비",
)


def infer_need_type_for_backfill(data: dict[str, Any]) -> str:
    """
    지출 거래용 `need_type` 추정.
    여가·쇼핑·외식 계열 → 불만족, 그 외 → 만족.
    """
    cat = _norm_text(data.get("category") or "")
    title = _norm_text(data.get("title") or "")
    bag = f"{cat} {title}"

    if any(m in bag for m in _NON_ESSENTIAL_CATEGORY_MARKERS):
        return NEED_TYPE_UNSATISFIED
    if any(m in bag for m in _ESSENTIAL_CATEGORY_MARKERS):
        return NEED_TYPE_SATISFIED
    if "식비" in cat or "식비" in title:
        return NEED_TYPE_SATISFIED
    return NEED_TYPE_SATISFIED


def need_type_from_data(data: dict[str, Any]) -> tuple[str, bool]:
    """
    `need_type`("만족"|"불만족") 반환. (값, 사용자가 기록했는지).
    예전 값 `필요`/`불필요`도 읽기 호환.
    """
    raw = _trim(data.get(DATA_KEY_NEED_TYPE))
    if raw in (NEED_TYPE_SATISFIED, NEED_TYPE_UNSATISFIED):
        return raw, True
    if raw == "필요":
        return NEED_TYPE_SATISFIED, True
    if raw == "불필요":
        return NEED_TYPE_UNSATISFIED, True

    is_nec = data.get("is_necessary")
    if isinstance(is_nec, bool):
        return (NEED_TYPE_SATISFIED if is_nec else NEED_TYPE_UNSATISFIED), True

    return NEED_TYPE_SATISFIED, False


def amount_score_for_reduction(amount: float) -> float:
    """지수용 금액 점수. min(|amount| / divisor, cap)."""
    return min(abs(amount) / AMOUNT_SCORE_DIVISOR, AMOUNT_SCORE_CAP)


def reduction_index_for(
    *,
    amount: float,
    data_type: str,
    need_type: str,
    payment_method: str,
    category_weight: float = 1.0,
    budget_bonus: float = 0.0,
) -> float:
    """
    0~100. 거래별 줄일 소비 지수.

    - need_type·금액·결제수단: 기본 점수
    - 금액: **4만당 1점**(상한 30, 기존 5만·20보다 가중 ↑)
    - 카테고리: **해당 월 불만족 비율**로 산출한 가중치(0.7~1.3)를 곱함. 중립=1.0
    - 버짓: 해당 카테고리·월 목표 초과 시 `budget_bonus` 가산(곱셈 전)
    """
    if data_type == "income":
        return 0.0

    is_satisfied = need_type in (NEED_TYPE_SATISFIED, "필요")
    score = 0.0
    if not is_satisfied:
        score += 45.0
    else:
        score += 5.0

    score += amount_score_for_reduction(amount)

    pay_k = _norm_text(payment_method)
    if any(k in pay_k for k in ("신용", "credit", "후불")):
        score += 7.0

    score += max(budget_bonus, 0.0)
    score *= max(category_weight, 0.0)

    return round(min(score, 100.0), 2)


def _patch_data_with_reduction_only(data: dict[str, Any], need_type: str, reduction_index: float) -> dict[str, Any]:
    out = dict(data)
    for k in _LEGACY_DATA_KEYS:
        out.pop(k, None)
    out.pop("satisfaction", None)
    out[DATA_KEY_NEED_TYPE] = need_type
    out[DATA_KEY_REDUCTION_INDEX] = reduction_index
    return out


def compute_reduction_for_records(
    rows: list[dict[str, Any]],
    *,
    budgets: dict[str, float] | None = None,
    alpha: float = 1.0,
    budget_max_points: float = 30.0,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    """
    DB tb_record 행에 대해 `need_type`, `reduction_index` 갱신 패치 반환.

    카테고리 가중치: 카테고리×월 **불만족 비율** (모든 카테고리 동일 공식, 중립=1.0).
    버짓 초과: 해당 카테고리·월 거래에 보너스 점수 가산.
    """
    warnings: list[str] = []
    patches: list[dict[str, Any]] = []
    by_category: dict[str, dict[str, float]] = defaultdict(
        lambda: {"count": 0.0, "index_sum": 0.0, "amount_sum": 0.0}
    )

    ctx: ReductionContext = build_reduction_context(
        rows,
        budgets=budgets,
        alpha=alpha,
        budget_max_points=budget_max_points,
    )

    for r in rows:
        rec_id = r.get("rec_id")
        data = r.get("data")
        if not rec_id or not isinstance(data, dict):
            continue

        amount = coerce_numeric_amount(data.get("amount"))
        if amount is None:
            continue

        category = category_for_index(
            data.get("category"),
            data.get("title"),
            data.get("memo"),
            data.get("payment_method"),
        )
        kind = record_data_kind(r)
        if kind != "expense":
            patches.append({"rec_id": str(rec_id), "data": _strip_reduction_fields(data)})
            continue

        if is_index_skipped_category(category):
            patches.append({"rec_id": str(rec_id), "data": _strip_reduction_fields(data)})
            continue

        record_date = parse_record_date(data.get("date"))
        if record_date is None or not category_meets_index_sample(rows, category, record_date):
            patches.append({"rec_id": str(rec_id), "data": _strip_reduction_index_only(data)})
            continue

        need_type, user_set = need_type_from_data(data)
        if not user_set:
            warnings.append(f"{rec_id}: need_type 미기록 -> 기본값(만족) 적용")

        month = month_key_from_data(data)
        cat_weight = ctx.category_weight(category, month)
        bud_bonus = ctx.budget_bonus(category, month)

        idx = reduction_index_for(
            amount=float(amount),
            data_type="expense",
            need_type=need_type,
            payment_method=str(data.get("payment_method", "")),
            category_weight=cat_weight,
            budget_bonus=bud_bonus,
        )

        patches.append(
            {
                "rec_id": str(rec_id),
                "data": _patch_data_with_reduction_only(data, need_type, idx),
            }
        )
        g = by_category[category]
        g["count"] += 1.0
        g["index_sum"] += idx
        g["amount_sum"] += float(amount)

    category_summary: list[dict[str, Any]] = []
    for cat, g in sorted(by_category.items(), key=lambda x: x[1]["index_sum"], reverse=True):
        cnt = int(g["count"])
        category_summary.append(
            {
                "category": cat,
                "count": cnt,
                "amount_sum": round(g["amount_sum"], 2),
                "avg_reduction_index": round((g["index_sum"] / cnt) if cnt else 0.0, 2),
            }
        )

    return patches, category_summary, warnings


def expense_category_label(data: dict[str, Any]) -> str:
    """응답·집계용 카테고리명 (`data.category` 우선)."""
    c = _trim(data.get("category"))
    if c:
        return c
    return category_for_index(
        data.get("category"),
        data.get("title"),
        data.get("memo"),
        data.get("payment_method"),
    )


def _reduction_index_for_row(row: dict[str, Any], data: dict[str, Any], amount: float, category: str) -> float | None:
    raw = data.get(DATA_KEY_REDUCTION_INDEX)
    if isinstance(raw, (int, float)):
        if not (isinstance(raw, float) and math.isnan(raw)):  # type: ignore[arg-type]
            return float(raw)
    return None


def _record_display_title(data: dict[str, Any]) -> str:
    for key in ("title", "merchant", "memo"):
        v = data.get(key)
        if v not in (None, ""):
            return str(v).strip()[:200]
    return ""


def _record_date_str(data: dict[str, Any]) -> str | None:
    d = parse_record_date(data.get("date"))
    return d.isoformat() if d else None


def compute_top_reduction_transactions(
    rows: list[dict[str, Any]],
    *,
    top_n: int = 20,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict[str, Any]:
    """
    지출 중 `reduction_index`가 저장된 거래를 지수 내림차순으로 상위 N건.
    미분류·지수 미계산(표본 부족 등) 거래는 제외.
    """
    candidates: list[dict[str, Any]] = []

    for r in rows:
        if not is_expense_record(r):
            continue
        if period_start is not None and period_end is not None and not record_in_date_range(
            r, period_start, period_end
        ):
            continue
        data = r.get("data")
        if not isinstance(data, dict):
            continue
        amount = coerce_numeric_amount(data.get("amount"))
        if amount is None:
            continue

        cat = expense_category_label(data)
        if is_index_skipped_category(cat):
            continue
        idx = _reduction_index_for_row(r, data, float(amount), cat)
        if idx is None:
            continue

        need_type, _ = need_type_from_data(data)
        candidates.append(
            {
                "rec_id": str(r.get("rec_id", "")),
                "date": _record_date_str(data),
                "amount": round(float(amount), 2),
                "category": cat,
                "need_type": need_type,
                "reduction_index": round(idx, 2),
                "title": _record_display_title(data),
            }
        )

    candidates.sort(key=lambda x: (-x["reduction_index"], -x["amount"], x["rec_id"]))

    items: list[dict[str, Any]] = []
    for rank, row in enumerate(candidates[: max(top_n, 0)], start=1):
        items.append({"rank": rank, **row})

    expense_rows_in_scope = sum(
        1
        for r in rows
        if is_expense_record(r)
        and (
            period_start is None
            or period_end is None
            or record_in_date_range(r, period_start, period_end)
        )
    )

    return {
        "items": items,
        "indexed_record_count": len(candidates),
        "expense_record_count": expense_rows_in_scope,
    }


def compute_top_reduction_categories(
    rows: list[dict[str, Any]],
    *,
    top_n: int = 3,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict[str, Any]:
    """
    지출만 대상으로 카테고리별 평균 `reduction_index`로 정렬해 상위 N개.
    응답에는 지수 미포함 — 카테고리, 해당 카테고리 지출 합, 전체 지출 대비 비율(%).
    `period_start`·`period_end`가 있으면 `data.date`가 그 범위(포함)인 행만 집계.
    """
    by_cat: dict[str, dict[str, float]] = defaultdict(
        lambda: {"index_sum": 0.0, "index_count": 0.0, "amount_sum": 0.0}
    )

    for r in rows:
        if not is_expense_record(r):
            continue
        if period_start is not None and period_end is not None and not record_in_date_range(
            r, period_start, period_end
        ):
            continue
        data = r.get("data")
        if not isinstance(data, dict):
            continue
        amount = coerce_numeric_amount(data.get("amount"))
        if amount is None:
            continue

        cat = expense_category_label(data)
        if is_index_skipped_category(cat):
            continue
        idx = _reduction_index_for_row(r, data, float(amount), cat)
        if idx is None:
            continue
        g = by_cat[cat]
        g["index_sum"] += idx
        g["index_count"] += 1.0
        g["amount_sum"] += float(amount)

    total_amount = sum(g["amount_sum"] for g in by_cat.values())
    ranked = sorted(
        by_cat.items(),
        key=lambda x: (x[1]["index_sum"] / x[1]["index_count"]) if x[1]["index_count"] else 0.0,
        reverse=True,
    )

    items: list[dict[str, Any]] = []
    for rank, (cat, g) in enumerate(ranked[: max(top_n, 0)], start=1):
        amt = g["amount_sum"]
        share = (amt / total_amount * 100.0) if total_amount > 0 else 0.0
        items.append(
            {
                "rank": rank,
                "category": cat,
                "amount": round(amt, 2),
                "share_percent": round(share, 2),
            }
        )

    expense_rows_in_scope = sum(
        1
        for r in rows
        if is_expense_record(r)
        and (
            period_start is None
            or period_end is None
            or record_in_date_range(r, period_start, period_end)
        )
    )

    return {
        "total_expense_amount": round(total_amount, 2),
        "items": items,
        "category_count": len(by_cat),
        "expense_record_count": expense_rows_in_scope,
    }
