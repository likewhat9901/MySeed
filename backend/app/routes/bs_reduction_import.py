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
    expense_category_label,
    is_expense_record,
    is_index_skipped_category,
)
from app.services.dynamic_reduction import DEFAULT_ALPHA
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
    need_type: Literal["만족", "불만족"] = Field(description="소비 만족도(구 필요/불필요)")


class RecomputeReductionBody(BaseModel):
    budgets: dict[str, float] = Field(
        default_factory=dict,
        description="카테고리별 월 목표 소비 금액. 예: {\"식비\": 300000}",
    )
    alpha: float = Field(
        DEFAULT_ALPHA,
        ge=0.0,
        le=5.0,
        description="불만족 비율 → 카테고리 가중치 민감도 (중립=1.0)",
    )
    budget_max_points: float = Field(30.0, ge=0.0, le=100.0, description="버짓 초과 시 최대 가산 점수")


@router.post(
    "/statistics/reduction/recompute",
    summary="DB 거래내역 기준 줄일 소비 지수 재계산",
    description=(
        "DB(`tb_record`)를 조회해 `data.reduction_index`를 재계산합니다. "
        "저장 시 `data`에 추가·갱신하는 키는 **`need_type`**, **`reduction_index`** (지출만). "
        "수입(income) 거래는 해당 키를 제거합니다. "
        "**카테고리 가중치**: 카테고리×월 **불만족 비율**로 산출(모든 카테고리 동일, 중립=1.0). "
        "**표본**: 거래일 기준 **6개월 창에 10건 미만** 카테고리는 `reduction_index` 미계산. "
        "**버짓** 초과 시 해당 월 거래 지수에 가산. "
        "Bearer 생략 시 `led_id`로 소유자 access_token 자동 사용."
    ),
    response_model=BsReductionImportResponse,
)
async def recompute_reduction_from_db(
    led_id: UUID = Query(..., description="tb_ledger.led_id"),
    payload: RecomputeReductionBody = Body(default_factory=RecomputeReductionBody),
    authorization: str | None = Header(
        None,
        description="Bearer 생략 가능(led_id로 소유자 토큰 자동 발급)",
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

    patches, category_summary, warns = compute_reduction_for_records(
        rows,
        budgets=payload.budgets or None,
        alpha=payload.alpha,
        budget_max_points=payload.budget_max_points,
    )
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
    summary="사용자 소비 만족도(need_type) 기록",
    description="지출 거래만 `data.need_type` 저장 (`만족` | `불만족`). 수입·미분류는 400.",
)
async def set_record_necessity(
    payload: RecordNecessityUpdateBody = Body(...),
    led_id: UUID = Query(..., description="tb_ledger.led_id"),
    authorization: str | None = Header(
        None,
        description="Bearer 생략 가능(led_id로 소유자 토큰 자동 발급)",
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
        raise HTTPException(status_code=400, detail="지출 거래만 need_type을 기록할 수 있습니다")
    if is_index_skipped_category(expense_category_label(target["data"])):
        raise HTTPException(status_code=400, detail="미분류 카테고리는 need_type·지수 대상이 아닙니다")

    d = dict(target["data"])
    d[DATA_KEY_NEED_TYPE] = payload.need_type
    d.pop("satisfaction", None)
    for legacy in ("is_necessary", "necessity_confidence", "category_auto_assigned"):
        d.pop(legacy, None)
    update_tb_record_data_fields(led_id, [{"rec_id": str(payload.rec_id), "data": d}])
    return {"ok": True, "rec_id": str(payload.rec_id), "need_type": payload.need_type}
