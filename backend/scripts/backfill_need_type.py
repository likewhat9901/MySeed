"""tb_record.data — 지출(expense)에만 need_type 백필. 수입 등은 키 제거."""

from __future__ import annotations

import sys
from pathlib import Path
from uuid import UUID

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import get_settings
from app.services.bs_reduction_import import (
    DATA_KEY_NEED_TYPE,
    _strip_reduction_fields,
    infer_need_type_for_backfill,
    is_expense_record,
    need_type_from_data,
)
from app.services.supabase_data import _client, fetch_tb_record_rows_for_ledger, update_tb_record_data_fields


def list_ledger_ids() -> list[UUID]:
    res = _client().table("tb_ledger").select("led_id").execute()
    out: list[UUID] = []
    for row in res.data or []:
        try:
            out.append(UUID(str(row["led_id"])))
        except (KeyError, ValueError):
            continue
    return out


def backfill_ledger(led_id: UUID) -> tuple[int, int, int, int]:
    rows = fetch_tb_record_rows_for_ledger(led_id)
    patches: list[dict] = []
    expense_n = 0
    stripped_n = 0
    skipped = 0
    for r in rows:
        data = r.get("data")
        if not isinstance(data, dict) or not r.get("rec_id"):
            skipped += 1
            continue

        if not is_expense_record(r):
            if DATA_KEY_NEED_TYPE in data or "reduction_index" in data:
                patches.append(
                    {"rec_id": str(r["rec_id"]), "data": _strip_reduction_fields(data)}
                )
                stripped_n += 1
            else:
                skipped += 1
            continue

        _, user_set = need_type_from_data(data)
        if user_set:
            skipped += 1
            continue
        new_data = dict(data)
        new_data[DATA_KEY_NEED_TYPE] = infer_need_type_for_backfill(data)
        patches.append({"rec_id": str(r["rec_id"]), "data": new_data})
        expense_n += 1

    n = update_tb_record_data_fields(led_id, patches) if patches else 0
    return n, len(rows), expense_n, stripped_n


def main() -> None:
    s = get_settings()
    if not s.supabase_configured():
        print("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음")
        sys.exit(1)

    ledgers = list_ledger_ids()
    if not ledgers:
        print("tb_ledger 없음")
        sys.exit(0)

    total_updated = 0
    total_rows = 0
    total_expense = 0
    total_stripped = 0
    for led in ledgers:
        n, cnt, exp_n, strip_n = backfill_ledger(led)
        total_updated += n
        total_rows += cnt
        total_expense += exp_n
        total_stripped += strip_n
        print(
            f"led_id={led} records={cnt} patched={n} "
            f"expense_tagged={exp_n} income_stripped={strip_n}"
        )

    print(
        f"done: ledgers={len(ledgers)} total_records={total_rows} "
        f"total_patched={total_updated} expense_tags={total_expense} stripped={total_stripped}"
    )


if __name__ == "__main__":
    main()
