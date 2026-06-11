"""카테고리별 need_type(만족/불만족) 분포를 적당히 재조정 후 recompute."""

from __future__ import annotations

import hashlib
import sys
from collections import defaultdict
from uuid import UUID

from app.services.bs_reduction_import import (
    NEED_TYPE_SATISFIED,
    NEED_TYPE_UNSATISFIED,
    compute_reduction_for_records,
    expense_category_label,
    is_expense_record,
    is_index_skipped_category,
    need_type_from_data,
)
from app.services.dynamic_reduction import month_key_from_data
from app.services.excel_record_import import coerce_numeric_amount
from app.services.supabase_data import fetch_tb_record_rows_for_ledger, update_tb_record_data_fields

LED_ID = UUID("38d3f6d3-f636-48a6-9504-b37759a77bb2")

# 카테고리별 목표 불만족 비율 (쇼핑·여가 계열은 조금 높게, 필수는 낮게)
TARGET_UNSATISFIED_RATE: dict[str, float] = {
    "카페/간식": 0.18,
    "문화/여가": 0.20,
    "술/유흥": 0.22,
    "쇼핑": 0.20,
    "과소비": 0.25,
    "의복/미용": 0.15,
    "식사": 0.12,
    "생활": 0.10,
    "교통": 0.08,
    "할부": 0.05,
    "이체": 0.03,
    "카드대금": 0.03,
    "주거/통신": 0.05,
    "의료/건강": 0.05,
    "교육": 0.08,
    "자동차": 0.10,
    "경조사": 0.05,
    "현금": 0.05,
    "여행/숙박": 0.15,
    "저축": 0.02,
    "기타": 0.10,
    "투자": 0.02,
}
DEFAULT_UNSATISFIED_RATE = 0.12


def _stable_rank(rec_id: str, salt: str) -> float:
    h = hashlib.sha256(f"{rec_id}:{salt}".encode()).hexdigest()
    return int(h[:12], 16) / float(0xFFFFFFFFFFFF)


def _target_rate(category: str) -> float:
    return TARGET_UNSATISFIED_RATE.get(category, DEFAULT_UNSATISFIED_RATE)


def rebalance(rows: list[dict]) -> list[dict]:
    """카테고리 내 결정적(deterministic) 샘플링으로 need_type 재배치."""
    patches: list[dict] = []
    stats: dict[str, dict[str, int]] = defaultdict(lambda: {"만족": 0, "불만족": 0})

    for r in rows:
        if not is_expense_record(r):
            continue
        data = r.get("data")
        if not isinstance(data, dict):
            continue
        if coerce_numeric_amount(data.get("amount")) is None:
            continue

        category = expense_category_label(data)
        if is_index_skipped_category(category):
            continue

        rec_id = str(r.get("rec_id", ""))
        rate = _target_rate(category)
        new_type = NEED_TYPE_UNSATISFIED if _stable_rank(rec_id, category) < rate else NEED_TYPE_SATISFIED

        d = dict(data)
        d.pop("satisfaction", None)
        d["need_type"] = new_type
        for legacy in ("is_necessary", "necessity_confidence", "category_auto_assigned"):
            d.pop(legacy, None)

        patches.append({"rec_id": rec_id, "data": d})
        stats[category][new_type] += 1

    return patches, stats


def build_budgets(rows: list[dict]) -> dict[str, float]:
    cat_months: dict[str, set[str]] = defaultdict(set)
    cat_total: dict[str, float] = defaultdict(float)
    for r in rows:
        if not is_expense_record(r):
            continue
        d = r.get("data") or {}
        amt = coerce_numeric_amount(d.get("amount"))
        if amt is None:
            continue
        cat = expense_category_label(d)
        if is_index_skipped_category(cat):
            continue
        cat_total[cat] += amt
        m = month_key_from_data(d)
        if m:
            cat_months[cat].add(m)
    return {
        cat: float(max(10000, round((cat_total[cat] / max(len(cat_months[cat]), 1) * 0.7) / 10000) * 10000))
        for cat in cat_total
    }


def main() -> None:
    led = LED_ID if len(sys.argv) < 2 else UUID(sys.argv[1])
    rows = fetch_tb_record_rows_for_ledger(led)

    print("=== before (top 불만족) ===")
    before: dict[str, dict[str, int]] = defaultdict(lambda: {"만족": 0, "불만족": 0})
    for r in rows:
        if not is_expense_record(r):
            continue
        d = r.get("data") or {}
        cat = expense_category_label(d)
        if is_index_skipped_category(cat):
            continue
        nt, _ = need_type_from_data(d)
        before[cat][nt] += 1
    for cat, c in sorted(before.items(), key=lambda x: -x[1]["불만족"])[:8]:
        t = c["만족"] + c["불만족"]
        print(f"  {cat}: 불만족 {c['불만족']}/{t} ({100*c['불만족']/t:.0f}%)")

    need_patches, stats = rebalance(rows)
    n1 = update_tb_record_data_fields(led, need_patches)
    print(f"\nneed_type updated: {n1}")

    rows = fetch_tb_record_rows_for_ledger(led)
    budgets = build_budgets(rows)
    idx_patches, summary, _ = compute_reduction_for_records(rows, budgets=budgets)
    n2 = update_tb_record_data_fields(led, idx_patches)
    print(f"reduction_index recomputed: {n2}")

    print("\n=== after ===")
    for cat, c in sorted(stats.items(), key=lambda x: -x[1]["불만족"])[:10]:
        t = c["만족"] + c["불만족"]
        print(f"  {cat}: 불만족 {c['불만족']}/{t} ({100*c['불만족']/t:.0f}%) target={100*_target_rate(cat):.0f}%")

    print("\n=== top categories by avg index ===")
    summary.sort(key=lambda x: -x["avg_reduction_index"])
    for s in summary[:5]:
        print(f"  {s['category']}: avg={s['avg_reduction_index']:.1f} n={s['count']}")


if __name__ == "__main__":
    main()
