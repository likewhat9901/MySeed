"""가계부 통계 API (tb_record 금액 합·평균)."""

from __future__ import annotations

from typing import Annotated, Any

from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.deps.supabase_user import require_supabase_user_id
from app.services.record_statistics import compute_led_statistics, parse_stat_method
from app.services.supabase_data import fetch_tb_record_rows_for_ledger, ledger_belongs_to_member

router = APIRouter(tags=["statistics"])


def _trimmed_category_queries(categories: list[str]) -> list[str]:
    return [str(x).strip() for x in categories if str(x).strip()]


class LedgerStatisticsResponse(BaseModel):
    led_id: UUID
    categories: list[str] = Field(
        default_factory=list,
        description=(
            "적용된 카테고리 필터(trim된 값들). 같은 키를 여러 번 보냈던 값이 순서 유지되어 모입니다. "
            "빈 배열은 필터 없음(전체 내역)."
        ),
    )
    method: str = Field(description="집계 방식(sum | avg)")
    matched_record_count: int = Field(
        description="카테고리 조건을 통과한 tb_record 행 수(금액 파싱 전)",
    )
    amount_aggregate_count: int = Field(
        description="집계에 포함된 레코드 수(data.amount 숫자로 읽인 행)",
    )
    value: float | None = Field(
        description="평균이면 포함 건 없을 때 None, 합이면 포함 건 없을 때 0",
    )


@router.get(
    "/statistics",
    summary="가계부(tb_record) 금액 합 또는 평균",
    description=(
        "**Authorization: Bearer `<Supabase access token>` 필수.** "
        "`mem_id`는 토큰의 `sub`으로만 검증합니다(쿼리로 받지 않음). "
        "`category` 없음 또는 빈 목록 또는 공백만: 전체 내역 집계. "
        "**`category` 같은 키를 여러 번 보내면**(예: `?category=식비&category=교통`) "
        "그 중 하나에라도 해당하는 레코드를 **합쳐서** 합·평균합니다(OR). "
        "값이 UUID 문자열이면 `cate_id`, 그 외는 `data.category`와 정규화 비교입니다. "
        "`method`: `sum`/`합`/… 또는 `avg`/`평균`. 각 행 `data.amount`만 집계합니다."
    ),
    response_model=LedgerStatisticsResponse,
)
async def get_ledger_statistics(
    led_id: UUID = Query(..., description="tb_ledger.led_id"),
    category: Annotated[
        list[str],
        Query(
            default_factory=list,
            description="같은 키를 반복 가능. 여러 값 중 하나라도 맞으면 포함해 합·평균합니다.",
        ),
    ],
    method: str = Query(
        ...,
        description="합: sum 또는 합 등. 평균: avg 또는 평균 등",
        examples=["sum", "avg"],
    ),
    authorization: Annotated[
        str | None,
        Header(description="Bearer <Supabase access token> 필수"),
    ] = None,
) -> LedgerStatisticsResponse:
    settings = get_settings()
    if not settings.supabase_configured():
        raise HTTPException(status_code=503, detail="SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요")

    mem_id = require_supabase_user_id(authorization)

    m = parse_stat_method(method)
    if m is None:
        raise HTTPException(
            status_code=400,
            detail='method는 "sum"/"합" 또는 "avg"/"평균" 중 하나여야 합니다.',
        )

    applied = _trimmed_category_queries(category)

    try:
        if not ledger_belongs_to_member(led_id, mem_id):
            raise HTTPException(status_code=403, detail="이 가계부(ledger)에 대한 권한이 없습니다")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"ledger 조회 실패: {e!s}") from e

    try:
        rows = fetch_tb_record_rows_for_ledger(led_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"tb_record 조회 실패: {e!s}") from e

    stats: dict[str, Any] = compute_led_statistics(rows, categories=category, method=m)

    val = stats["value"]
    if val is None:
        out_val: float | None = None
    elif isinstance(val, (int, float)):
        out_val = float(round(float(val), 6))
    else:
        out_val = None

    return LedgerStatisticsResponse(
        led_id=led_id,
        categories=applied,
        method=m,
        matched_record_count=stats["count_records_seen"],
        amount_aggregate_count=stats["count_amount_rows"],
        value=out_val,
    )
