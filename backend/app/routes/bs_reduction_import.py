"""DB tb_record 기준 필요도/절감지수 재계산 + 필요도 기록 API."""

from __future__ import annotations

from typing import Literal

from uuid import UUID

from fastapi import APIRouter, Body, Header, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.deps.supabase_user import require_ledger_actor
from app.services.bs_reduction_import import (
    DATA_KEY_NEED_TYPE,
    compute_reduction_for_records,
    is_expense_record,
)
from app.services.supabase_data import (
    fetch_tb_record_rows_for_ledger,
    update_tb_record_data_fields,
)

router = APIRouter(tags=["bs-reduction-import"])


class BsReductionImportResponse(BaseModel):
    updated: int = Field(description="지수 재계산 반영 레코드 수")
    category_summary: list[dict] = Field(default_factory=list, description="카테고리별 건수/금액/평균 절감지수")
    warnings: list[str] = Field(default_factory=list)


class RecordNecessityUpdateBody(BaseModel):
    rec_id: UUID = Field(description="tb_record.rec_id")
    need_type: Literal["필요", "불필요"] = Field(description="사용자 판단 필요/불필요")


@router.post(
    "/statistics/reduction/recompute",
    summary="DB 거래내역 기준 줄일 소비 지수 재계산",
    description=(
        "DB(`tb_record`)를 조회해 `data.reduction_index`를 재계산합니다. "
        "저장 시 `data`에 추가·갱신하는 키는 **`need_type`**, **`reduction_index`** (지출만). "
        "수입(income) 거래는 해당 키를 제거합니다. "
        "필요/불필요는 사용자가 기록한 `need_type`을 사용하고, 없으면 기본 `필요`입니다. "
        "로컬 Swagger: `ALLOW_SWAGGER_LED_ID_AUTH=true` 이면 Bearer 없이 `led_id`만으로 호출 가능."
    ),
    response_model=BsReductionImportResponse,
)
async def recompute_reduction_from_db(
    led_id: UUID = Query(..., description="tb_ledger.led_id"),
    authorization: str | None = Header(
        None,
        description="Bearer 선택(로컬은 ALLOW_SWAGGER_LED_ID_AUTH=true 시 생략 가능)",
    ),
) -> BsReductionImportResponse:
    settings = get_settings()
    if not settings.supabase_configured():
        raise HTTPException(status_code=503, detail="SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요")
    try:
        require_ledger_actor(led_id, authorization)
        rows = fetch_tb_record_rows_for_ledger(led_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"조회 실패: {e!s}") from e

    patches, category_summary, warns = compute_reduction_for_records(rows)
    if not patches:
        return BsReductionImportResponse(updated=0, category_summary=category_summary, warnings=warns)
    try:
        n = update_tb_record_data_fields(led_id, patches)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"저장 실패: {e}") from e
    return BsReductionImportResponse(
        updated=n,
        category_summary=category_summary,
        warnings=warns,
    )


@router.post(
    "/statistics/reduction/necessity",
    summary="사용자 필요/불필요 기록 저장",
    description="지출 거래만 `data.need_type` 저장 (`필요` | `불필요`). 수입은 400.",
)
async def set_record_necessity(
    payload: RecordNecessityUpdateBody = Body(...),
    led_id: UUID = Query(..., description="tb_ledger.led_id"),
    authorization: str | None = Header(
        None,
        description="Bearer 선택(로컬은 ALLOW_SWAGGER_LED_ID_AUTH=true 시 생략 가능)",
    ),
) -> dict:
    settings = get_settings()
    if not settings.supabase_configured():
        raise HTTPException(status_code=503, detail="SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요")
    require_ledger_actor(led_id, authorization)
    rows = fetch_tb_record_rows_for_ledger(led_id)
    target = next((r for r in rows if str(r.get("rec_id")) == str(payload.rec_id)), None)
    if not target or not isinstance(target.get("data"), dict):
        raise HTTPException(status_code=404, detail="rec_id를 ledger에서 찾지 못했습니다")
    if not is_expense_record(target):
        raise HTTPException(status_code=400, detail="지출 거래만 필요/불필요를 기록할 수 있습니다")

    d = dict(target["data"])
    d[DATA_KEY_NEED_TYPE] = payload.need_type
    for legacy in ("is_necessary", "necessity_confidence", "category_auto_assigned"):
        d.pop(legacy, None)
    update_tb_record_data_fields(led_id, [{"rec_id": str(payload.rec_id), "data": d}])
    return {"ok": True, "rec_id": str(payload.rec_id), "need_type": payload.need_type}
