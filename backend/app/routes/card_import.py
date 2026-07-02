"""카드사 이름 + 명세 파일 → tb_card.column_list 매칭 → tb_record 삽입 (단일 플로우)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.services.card_excel_import import build_tb_rows_from_card_excel
from app.services.category_resolution import CategoryEnrichStats, enrich_tb_rows_with_categories
from app.services.supabase_data import (
    fetch_ledger_owner_mem_id,
    fetch_merchant_category_dict,
    fetch_tb_card,
    insert_tb_records,
)

router = APIRouter(tags=["card-import"])


class CardImportResponse(BaseModel):
    inserted: int = Field(description="삽입한 tb_record 개수")
    warnings: list[str] = Field(default_factory=list)
    category_stats: dict[str, int] | None = Field(
        default=None,
        description="카테고리 자동 분류 통계 (사전/LLM/미해결)",
    )


@router.post(
    "/card/import",
    summary="카드 명세 엑셀 → tb_record",
    description=(
        "`card_name`(=tb_card.card_name)으로 `column_list`를 읽고, "
        "[0]=날짜·[1]=가맹점·[2]=금액 헤더에 해당하는 열만 뽑아 "
        "`data.date`(파싱 없이 문자열 원문)·`title`·`amount`로 삽입합니다."
    ),
    response_model=CardImportResponse,
)
async def import_card_statement(
    file: UploadFile = File(...),
    card_name: str = Form(..., description="등록된 tb_card.card_name (정확 일치)"),
    ledger_id: str = Form(..., description="tb_ledger UUID"),
) -> CardImportResponse:
    settings = get_settings()
    if not settings.supabase_configured():
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요",
        )

    fname = (file.filename or "").lower()
    if not (fname.endswith(".xlsx") or fname.endswith(".xls")):
        raise HTTPException(status_code=400, detail=".xlsx 또는 .xls 만 지원합니다")

    key = card_name.strip()
    if not key:
        raise HTTPException(status_code=400, detail="card_name 비어 있음")

    try:
        led = UUID(ledger_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"ledger_id UUID 오류: {e}") from e

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="파일 내용 없음")

    try:
        card_row = fetch_tb_card(key)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"카드 조회 실패: {e}") from e

    if not card_row:
        raise HTTPException(status_code=404, detail=f"등록되지 않은 카드 이름: {key!r}")

    rows_sql, warns = build_tb_rows_from_card_excel(
        led_id=led,
        card_row=card_row,
        excel_bytes=raw,
    )

    if not rows_sql:
        tail = warns[-10:] if len(warns) > 10 else warns
        msg = "유효한 행이 없습니다."
        if tail:
            msg += " " + " | ".join(tail)
        raise HTTPException(status_code=422, detail=msg)

    cat_stats: CategoryEnrichStats | None = None
    mem_id = fetch_ledger_owner_mem_id(led)
    if mem_id is not None:
        try:
            dict_entries = fetch_merchant_category_dict(mem_id=mem_id)
            rows_sql, cat_stats, cat_warns = await enrich_tb_rows_with_categories(
                rows_sql,
                dict_entries,
                mem_id=mem_id,
                use_llm=True,
            )
            warns.extend(cat_warns)
        except Exception as e:
            warns.append(f"카테고리 자동 분류 생략: {e}")

    try:
        rec_ids = insert_tb_records(rows_sql)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"삽입 실패: {e}") from e

    n = len(rec_ids) if rec_ids else len(rows_sql)
    stats_payload = None
    if cat_stats is not None:
        stats_payload = {
            "from_dictionary": cat_stats.from_dictionary,
            "from_llm": cat_stats.from_llm,
            "dict_learned": cat_stats.dict_learned,
            "unresolved": cat_stats.unresolved,
            "total_candidates": cat_stats.total_candidates,
        }
    return CardImportResponse(inserted=n, warnings=warns, category_stats=stats_payload)
