"""가계부 절감지수 리포트 (로컬 실행)."""
from __future__ import annotations

import sys
from collections import defaultdict
from uuid import UUID

from app.services.bs_reduction_import import (
    compute_reduction_for_records,
    expense_category_label,
    is_expense_record,
    is_index_skipped_category,
)
from app.services.dynamic_reduction import build_reduction_context, month_key_from_data
from app.services.excel_record_import import coerce_numeric_amount
from app.services.supabase_data import fetch_tb_record_rows_for_ledger, update_tb_record_data_fields


def main(led_id: str) -> None:
    led = UUID(led_id)
    rows = fetch_tb_record_rows_for_ledger(led)

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

    budgets = {
        cat: float(max(10000, round((cat_total[cat] / max(len(cat_months[cat]), 1) * 0.7) / 10000) * 10000))
        for cat in cat_total
    }

    patches, summary, _ = compute_reduction_for_records(rows, budgets=budgets)
    update_tb_record_data_fields(led, patches)
    rows = fetch_tb_record_rows_for_ledger(led)
    ctx = build_reduction_context(rows, budgets=budgets)

    latest_weight: dict[str, float] = {}
    cat_max_month: dict[str, tuple[str, float]] = {}
    for (cat, month), w in ctx.weight_by_key.items():
        if cat not in cat_max_month or month > cat_max_month[cat][0]:
            cat_max_month[cat] = (month, w)
    for cat, (_m, w) in cat_max_month.items():
        latest_weight[cat] = w

    recs: list[dict] = []
    for r in rows:
        if not is_expense_record(r):
            continue
        d = r.get("data") or {}
        if is_index_skipped_category(expense_category_label(d)):
            continue
        idx = d.get("reduction_index")
        if not isinstance(idx, (int, float)):
            continue
        recs.append(
            {
                "rec_id": str(r.get("rec_id"))[:8],
                "date": str(d.get("date", ""))[:10],
                "category": expense_category_label(d),
                "title": (d.get("title") or d.get("memo") or "")[:24],
                "amount": coerce_numeric_amount(d.get("amount")),
                "need_type": d.get("need_type"),
                "index": float(idx),
            }
        )

    recs.sort(key=lambda x: -x["index"])
    summary.sort(key=lambda x: -x["avg_reduction_index"])

    print(f"indexed_records={len(recs)} categories={len(summary)}")
    print("CAT")
    for i, s in enumerate(summary[:10], 1):
        cat = s["category"]
        print(
            f"{i}\t{cat}\t{s['avg_reduction_index']:.1f}\t{s['count']}\t"
            f"{s['amount_sum']:.0f}\t{budgets.get(cat, 0):.0f}\t{latest_weight.get(cat, 0.5):.2f}"
        )
    print("REC")
    for i, r in enumerate(recs[:15], 1):
        print(
            f"{i}\t{r['date']}\t{r['category']}\t{r['title']}\t{r['amount']:.0f}\t"
            f"{r['need_type']}\t{r['index']:.1f}"
        )


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "38d3f6d3-f636-48a6-9504-b37759a77bb2")
