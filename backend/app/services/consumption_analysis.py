"""
가계부 소비지수(Consumption Score) 분석.

개별 거래 score = amountScore × regretScore × categoryWeight × budgetPressure
카테고리 지수 = sum(score × amount) / sum(amount)  (금액 가중 평균)

tb_record `data.need_type`: 만족 → regret=false, 불만족 → regret=true
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

from app.services.bs_reduction_import import (
    expense_category_label,
    is_expense_record,
    is_index_skipped_category,
    need_type_from_data,
)
from app.services.excel_record_import import coerce_numeric_amount
from app.services.record_period import parse_record_date

from app.services.dynamic_reduction import (
    DEFAULT_ALPHA,
    WEIGHT_MAX,
    WEIGHT_MIN,
    compute_category_weight,
    compute_unsatisfied_rate,
)

AMOUNT_REL_WEIGHT = 0.4
AMOUNT_ABS_WEIGHT = 0.6
REGRET_SCORE_TRUE = 2.0
REGRET_SCORE_FALSE = 1.0


@dataclass(frozen=True)
class Transaction:
    rec_id: str
    datetime: str
    month: str
    amount: float
    category: str
    merchant: str
    regret: bool


@dataclass(frozen=True)
class ScoreBreakdown:
    relative_amount: float
    absolute_amount: float
    amount_score: float
    category_weight: float
    regret_score: float
    budget_pressure: float
    over_rate: float
    score: float
    reasons: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class ScoredTransaction:
    transaction: Transaction
    breakdown: ScoreBreakdown


@dataclass(frozen=True)
class CategoryAnalysis:
    category: str
    month: str
    transaction_count: int
    category_spend: float
    budget: float | None
    over_rate: float
    regret_rate: float
    category_weight: float
    category_index: float
    amount_total: float


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def compute_over_rate(category_spend: float, budget: float | None) -> float:
    """overRate = max(0, (spend - budget) / budget). 예산 없거나 0이면 0."""
    if budget is None or budget <= 0:
        return 0.0
    return max(0.0, (category_spend - budget) / budget)


def compute_regret_rate(regret_count: int, total_count: int) -> float:
    """불만족 비율 (reduction_index와 동일 공식)."""
    satisfied = max(total_count - regret_count, 0)
    return compute_unsatisfied_rate(satisfied, regret_count)


def compute_budget_pressure(over_rate: float) -> float:
    """budgetPressure = 1 + 2 * overRate"""
    return 1.0 + 2.0 * over_rate


def compute_regret_score(regret: bool) -> float:
    return REGRET_SCORE_TRUE if regret else REGRET_SCORE_FALSE


def compute_relative_amount(transaction_amount: float, category_average_amount: float) -> float:
    if category_average_amount <= 0:
        return 1.0
    return transaction_amount / category_average_amount


def compute_absolute_amount(transaction_amount: float, global_average_amount: float) -> float:
    if global_average_amount <= 0:
        return 1.0
    return transaction_amount / global_average_amount


def compute_amount_score(relative_amount: float, absolute_amount: float) -> float:
    return AMOUNT_REL_WEIGHT * relative_amount + AMOUNT_ABS_WEIGHT * absolute_amount


def compute_transaction_score(
    amount_score: float,
    regret_score: float,
    category_weight: float,
    budget_pressure: float,
) -> float:
    return amount_score * regret_score * category_weight * budget_pressure


def compute_category_index(scored: list[tuple[float, float]]) -> float:
    """categoryIndex = sum(score * amount) / sum(amount)"""
    num = sum(s * a for s, a in scored)
    den = sum(a for _, a in scored)
    if den <= 0:
        return 0.0
    return num / den


def _month_key_from_row(data: dict[str, Any]) -> str | None:
    d = parse_record_date(data.get("date"))
    if d is None:
        return None
    return f"{d.year:04d}-{d.month:02d}"


def _datetime_str(data: dict[str, Any]) -> str:
    d = parse_record_date(data.get("date"))
    if d is None:
        return ""
    t = data.get("time")
    if t not in (None, ""):
        ts = str(t).strip()
        if ts:
            return f"{d.isoformat()} {ts}"[:19]
    return f"{d.isoformat()} 00:00:00"


def _merchant_str(data: dict[str, Any]) -> str:
    for key in ("title", "merchant", "memo"):
        v = data.get(key)
        if v not in (None, ""):
            return str(v).strip()[:200]
    return ""


def row_to_transaction(row: dict[str, Any]) -> Transaction | None:
    """tb_record 행 → Transaction. 지출·금액·날짜·미분류 제외."""
    if not is_expense_record(row):
        return None
    data = row.get("data")
    if not isinstance(data, dict):
        return None
    amount = coerce_numeric_amount(data.get("amount"))
    if amount is None or amount <= 0:
        return None
    month = _month_key_from_row(data)
    if month is None:
        return None
    category = expense_category_label(data)
    if is_index_skipped_category(category):
        return None
    need_type, _ = need_type_from_data(data)
    regret = need_type == "불만족"
    return Transaction(
        rec_id=str(row.get("rec_id", "")),
        datetime=_datetime_str(data),
        month=month,
        amount=float(amount),
        category=category,
        merchant=_merchant_str(data),
        regret=regret,
    )


def _build_reasons(
    *,
    breakdown: ScoreBreakdown,
    category: str,
    regret: bool,
    budget: float | None,
) -> list[str]:
    reasons: list[str] = []
    if breakdown.relative_amount > 1.2:
        reasons.append(f"같은 카테고리({category}) 평균 거래보다 금액이 큼")
    if breakdown.absolute_amount > 1.2:
        reasons.append("전체 평균 거래보다 금액이 큼")
    if regret:
        reasons.append("후회(불만족)로 표시된 소비")
    if breakdown.over_rate > 0:
        pct = round(breakdown.over_rate * 100)
        if budget:
            reasons.append(f"월 예산({category}) 대비 {pct}% 초과")
        else:
            reasons.append(f"월 예산 대비 {pct}% 초과")
    if breakdown.category_weight > 1.05:
        reasons.append(f"카테고리 후회율이 높아 가중치 {breakdown.category_weight:.2f} 적용")
    elif breakdown.category_weight < 0.95:
        reasons.append(f"카테고리 후회율이 낮아 가중치 {breakdown.category_weight:.2f} 적용")
    if not reasons:
        reasons.append("금액·후회·예산 기준상 상대적으로 낮은 우선순위")
    return reasons


def analyze_consumption(
    rows: list[dict[str, Any]],
    *,
    budgets: dict[str, float] | None = None,
    alpha: float = DEFAULT_ALPHA,
    month_filter: str | None = None,
) -> dict[str, Any]:
    """
    tb_record 목록 → 거래별 소비지수 + 카테고리×월 지수.

    budgets: {카테고리: 월 목표금액}. 키는 category 문자열 그대로.
    month_filter: "YYYY-MM" 지정 시 해당 월만 분석.
    """
    budget_map: dict[str, float] = {}
    if budgets:
        for k, v in budgets.items():
            try:
                budget_map[str(k).strip()] = float(v)
            except (TypeError, ValueError):
                continue

    transactions: list[Transaction] = []
    for row in rows:
        tx = row_to_transaction(row)
        if tx is None:
            continue
        if month_filter and tx.month != month_filter:
            continue
        transactions.append(tx)

    if not transactions:
        return {
            "params": {"alpha": alpha, "month_filter": month_filter},
            "transactions": [],
            "categories": [],
            "summary": {"transaction_count": 0, "category_count": 0},
        }

    # 월×카테고리 집계
    spend: dict[tuple[str, str], float] = defaultdict(float)
    regret_cnt: dict[tuple[str, str], int] = defaultdict(int)
    total_cnt: dict[tuple[str, str], int] = defaultdict(int)
    cat_month_amounts: dict[tuple[str, str], list[float]] = defaultdict(list)
    month_amounts: dict[str, list[float]] = defaultdict(list)

    for tx in transactions:
        key = (tx.category, tx.month)
        spend[key] += tx.amount
        total_cnt[key] += 1
        if tx.regret:
            regret_cnt[key] += 1
        cat_month_amounts[key].append(tx.amount)
        month_amounts[tx.month].append(tx.amount)

    # 카테고리×월 메타 (overRate, weight)
    cat_meta: dict[tuple[str, str], dict[str, float]] = {}
    for key in total_cnt:
        cat, month = key
        budget = budget_map.get(cat)
        over = compute_over_rate(spend[key], budget)
        rr = compute_regret_rate(regret_cnt[key], total_cnt[key])
        wt = compute_category_weight(rr, alpha=alpha)
        cat_meta[key] = {
            "over_rate": over,
            "regret_rate": rr,
            "category_weight": wt,
            "budget_pressure_base": compute_budget_pressure(over),
            "category_spend": spend[key],
            "budget": budget if budget is not None else 0.0,
        }

    scored_txs: list[ScoredTransaction] = []
    cat_score_amounts: dict[tuple[str, str], list[tuple[float, float]]] = defaultdict(list)

    for tx in transactions:
        key = (tx.category, tx.month)
        meta = cat_meta[key]

        cat_avg = sum(cat_month_amounts[key]) / len(cat_month_amounts[key])
        glob_avg = sum(month_amounts[tx.month]) / len(month_amounts[tx.month])

        rel = compute_relative_amount(tx.amount, cat_avg)
        abs_ = compute_absolute_amount(tx.amount, glob_avg)
        amt_score = compute_amount_score(rel, abs_)
        reg_score = compute_regret_score(tx.regret)
        bud_pressure = meta["budget_pressure_base"]
        wt = meta["category_weight"]
        score = compute_transaction_score(amt_score, reg_score, wt, bud_pressure)

        breakdown = ScoreBreakdown(
            relative_amount=round(rel, 4),
            absolute_amount=round(abs_, 4),
            amount_score=round(amt_score, 4),
            category_weight=round(wt, 4),
            regret_score=reg_score,
            budget_pressure=round(bud_pressure, 4),
            over_rate=round(meta["over_rate"], 4),
            score=round(score, 4),
        )
        reasons = _build_reasons(
            breakdown=breakdown,
            category=tx.category,
            regret=tx.regret,
            budget=budget_map.get(tx.category),
        )
        breakdown = ScoreBreakdown(
            relative_amount=breakdown.relative_amount,
            absolute_amount=breakdown.absolute_amount,
            amount_score=breakdown.amount_score,
            category_weight=breakdown.category_weight,
            regret_score=breakdown.regret_score,
            budget_pressure=breakdown.budget_pressure,
            over_rate=breakdown.over_rate,
            score=breakdown.score,
            reasons=reasons,
        )
        scored_txs.append(ScoredTransaction(transaction=tx, breakdown=breakdown))
        cat_score_amounts[key].append((score, tx.amount))

    categories_out: list[CategoryAnalysis] = []
    for key, pairs in cat_score_amounts.items():
        cat, month = key
        meta = cat_meta[key]
        idx = compute_category_index(pairs)
        budget_val = budget_map.get(cat)
        categories_out.append(
            CategoryAnalysis(
                category=cat,
                month=month,
                transaction_count=total_cnt[key],
                category_spend=round(meta["category_spend"], 2),
                budget=budget_val,
                over_rate=round(meta["over_rate"], 4),
                regret_rate=round(meta["regret_rate"], 4),
                category_weight=round(meta["category_weight"], 4),
                category_index=round(idx, 4),
                amount_total=round(sum(a for _, a in pairs), 2),
            )
        )

    categories_out.sort(key=lambda c: (-c.category_index, -c.amount_total))
    scored_txs.sort(key=lambda s: (-s.breakdown.score, -s.transaction.amount))

    return {
        "params": {
            "alpha": alpha,
            "month_filter": month_filter,
            "weight_min": WEIGHT_MIN,
            "weight_max": WEIGHT_MAX,
            "amount_rel_weight": AMOUNT_REL_WEIGHT,
            "amount_abs_weight": AMOUNT_ABS_WEIGHT,
        },
        "transactions": [_serialize_scored(s) for s in scored_txs],
        "categories": [_serialize_category(c) for c in categories_out],
        "summary": {
            "transaction_count": len(scored_txs),
            "category_count": len(categories_out),
            "top_category": categories_out[0].category if categories_out else None,
            "top_transaction_rec_id": scored_txs[0].transaction.rec_id if scored_txs else None,
        },
    }


def _serialize_scored(s: ScoredTransaction) -> dict[str, Any]:
    tx = s.transaction
    b = s.breakdown
    return {
        "rec_id": tx.rec_id,
        "datetime": tx.datetime,
        "month": tx.month,
        "amount": tx.amount,
        "category": tx.category,
        "merchant": tx.merchant,
        "regret": tx.regret,
        "score": b.score,
        "breakdown": {
            "relative_amount": b.relative_amount,
            "absolute_amount": b.absolute_amount,
            "amount_score": b.amount_score,
            "category_weight": b.category_weight,
            "regret_score": b.regret_score,
            "budget_pressure": b.budget_pressure,
            "over_rate": b.over_rate,
        },
        "reasons": b.reasons,
    }


def _serialize_category(c: CategoryAnalysis) -> dict[str, Any]:
    return {
        "category": c.category,
        "month": c.month,
        "transaction_count": c.transaction_count,
        "category_spend": c.category_spend,
        "budget": c.budget,
        "over_rate": c.over_rate,
        "regret_rate": c.regret_rate,
        "category_weight": c.category_weight,
        "category_index": c.category_index,
        "amount_total": c.amount_total,
    }
