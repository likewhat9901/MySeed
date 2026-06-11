"""가계부 통계 API (tb_record 금액 합·평균)."""

from __future__ import annotations

from typing import Annotated, Any

from uuid import UUID

from fastapi import APIRouter, Body, Header, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.deps.supabase_user import require_ledger_actor
from app.services.bs_reduction_import import compute_top_reduction_categories
from app.services.consumption_analysis import DEFAULT_ALPHA, analyze_consumption
from app.services.dynamic_reduction import (
    DEFAULT_BUDGET_MAX_POINTS,
    compute_dynamic_reduction,
)
from app.services.record_period import ResolvedPeriod, parse_period_kind, resolve_period_range
from app.services.record_statistics import compute_led_statistics, parse_stat_method
from app.services.supabase_data import fetch_tb_record_rows_for_ledger

router = APIRouter(tags=["statistics"])


def _trimmed_category_queries(categories: list[str]) -> list[str]:
    return [str(x).strip() for x in categories if str(x).strip()]


class TopReductionCategoryItem(BaseModel):
    rank: int = Field(description="우선순위 (1=가장 줄여야 할 카테고리)")
    category: str = Field(description="대분류/카테고리명")
    amount: float = Field(description="해당 카테고리 지출 합계")
    share_percent: float = Field(description="전체 지출 대비 비율(0~100)")


class TopReductionCategoriesResponse(BaseModel):
    led_id: UUID
    period: str | None = Field(
        default=None,
        description="적용 기간 종류(year|half|quarter|month|week). 미지정 시 전체",
    )
    period_start: str | None = Field(default=None, description="집계 시작일(YYYY-MM-DD)")
    period_end: str | None = Field(default=None, description="집계 종료일(YYYY-MM-DD)")
    expense_record_count: int = Field(
        default=0,
        description="기간·지출 조건에 맞는 tb_record 건수",
    )
    total_expense_amount: float = Field(description="집계에 포함된 지출 총액")
    items: list[TopReductionCategoryItem] = Field(
        default_factory=list,
        description="평균 줄일 소비 지수 상위 카테고리(최대 3개). 지수 값은 포함하지 않음",
    )


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
        "**Authorization: Bearer** 생략 가능 — `led_id`만 넣으면 서버가 ledger 소유자 access_token을 자동 사용합니다. "
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
    method: str = Query(
        ...,
        description="합: sum 또는 합 등. 평균: avg 또는 평균 등",
        examples=["sum", "avg"],
    ),
    category: list[str] = Query(
        default_factory=list,
        description="같은 키를 반복 가능. 여러 값 중 하나라도 맞으면 포함해 합·평균합니다.",
    ),
    authorization: Annotated[
        str | None,
        Header(description="Bearer 생략 가능(led_id로 소유자 토큰 자동 발급)"),
    ] = None,
) -> LedgerStatisticsResponse:
    settings = get_settings()
    if not settings.supabase_configured():
        raise HTTPException(status_code=503, detail="SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요")

    m = parse_stat_method(method)
    if m is None:
        raise HTTPException(
            status_code=400,
            detail='method는 "sum"/"합" 또는 "avg"/"평균" 중 하나여야 합니다.',
        )

    applied = _trimmed_category_queries(category)

    try:
        require_ledger_actor(led_id, authorization)
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


@router.get(
    "/statistics/reduction/top-categories",
    summary="줄여야 할 소비 카테고리 Top3",
    description=(
        "DB `tb_record` **지출**만 집계합니다. 카테고리별 **평균 줄일 소비 지수**로 순위를 매기고 "
        "상위 N개를 반환합니다(지수 값은 미노출). "
        "**기간 필터**: `period` + `year` 및 종류별 파라미터 — "
        "`year`(연), `half`+`half`(1=상반기·2=하반기), `quarter`+`quarter`(1~4), "
        "`month`+`month`(1~12), `week`+`week`(ISO 주차 1~53). "
        "`period` 생략 시 가계부 전체 기간."
    ),
    response_model=TopReductionCategoriesResponse,
)
async def get_top_reduction_categories(
    led_id: UUID = Query(..., description="tb_ledger.led_id"),
    limit: int = Query(3, ge=1, le=10, description="상위 N개 (기본 3)"),
    period: str | None = Query(
        None,
        description="기간: year|half|quarter|month|week (또는 연·반기·분기·월·주)",
        examples=["month", "quarter"],
    ),
    year: int | None = Query(None, ge=1970, le=2100, description="기준 연도"),
    month: int | None = Query(None, ge=1, le=12, description="period=month 일 때 월(1~12)"),
    half: int | None = Query(None, ge=1, le=2, description="period=half 일 때 1=상반기, 2=하반기"),
    quarter: int | None = Query(None, ge=1, le=4, description="period=quarter 일 때 1~4"),
    week: int | None = Query(None, ge=1, le=53, description="period=week 일 때 ISO 주차"),
    authorization: Annotated[
        str | None,
        Header(description="Bearer 생략 가능(led_id로 소유자 토큰 자동 발급)"),
    ] = None,
) -> TopReductionCategoriesResponse:
    settings = get_settings()
    if not settings.supabase_configured():
        raise HTTPException(status_code=503, detail="SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요")

    resolved: ResolvedPeriod | None = None
    if period is not None and str(period).strip():
        if year is None:
            raise HTTPException(status_code=400, detail="period 사용 시 year가 필요합니다")
        if parse_period_kind(period) is None:
            raise HTTPException(
                status_code=400,
                detail='period는 year|half|quarter|month|week (연·반기·분기·월·주) 중 하나여야 합니다',
            )
        try:
            resolved = resolve_period_range(
                period=period,
                year=year,
                month=month,
                half=half,
                quarter=quarter,
                week=week,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
    elif any(x is not None for x in (year, month, half, quarter, week)):
        raise HTTPException(status_code=400, detail="year·month 등 기간 파라미터는 period와 함께 보내야 합니다")

    try:
        require_ledger_actor(led_id, authorization)
        rows = fetch_tb_record_rows_for_ledger(led_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"조회 실패: {e!s}") from e

    result = compute_top_reduction_categories(
        rows,
        top_n=limit,
        period_start=resolved.start if resolved else None,
        period_end=resolved.end if resolved else None,
    )
    if not result["items"]:
        raise HTTPException(
            status_code=422,
            detail="해당 기간에 지출·카테고리 집계 가능한 내역이 없습니다",
        )

    return TopReductionCategoriesResponse(
        led_id=led_id,
        period=resolved.kind if resolved else None,
        period_start=resolved.start.isoformat() if resolved else None,
        period_end=resolved.end.isoformat() if resolved else None,
        expense_record_count=int(result.get("expense_record_count", 0)),
        total_expense_amount=result["total_expense_amount"],
        items=[TopReductionCategoryItem(**x) for x in result["items"]],
    )


class DynamicReductionBody(BaseModel):
    budgets: dict[str, float] = Field(
        default_factory=dict,
        description="카테고리별 월 목표 소비 금액. 예: {\"식비\": 300000, \"쇼핑\": 100000}",
    )
    alpha: float = Field(
        DEFAULT_ALPHA,
        ge=0.0,
        le=5.0,
        description="불만족 비율 → 카테고리 가중치 민감도 (기본 1.0, 중립=1.0)",
    )
    budget_max_points: float = Field(
        DEFAULT_BUDGET_MAX_POINTS,
        ge=0.0,
        le=100.0,
        description="버짓 초과 시 지수에 더할 수 있는 최대 점수(기본 30)",
    )


@router.post(
    "/statistics/reduction/dynamic-index",
    summary="카테고리×월 가중치·버짓 보너스 미리보기",
    description=(
        "recompute에 쓰이는 **카테고리×월 가중치·버짓 보너스**만 조회합니다. "
        "실제 거래별 `reduction_index`는 `POST /statistics/reduction/recompute`로 계산·저장합니다."
    ),
)
async def get_dynamic_reduction_index(
    led_id: UUID = Query(..., description="tb_ledger.led_id"),
    payload: DynamicReductionBody = Body(default_factory=DynamicReductionBody),
    authorization: Annotated[
        str | None,
        Header(description="Bearer 생략 가능(led_id로 소유자 토큰 자동 발급)"),
    ] = None,
) -> dict[str, Any]:
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

    result = compute_dynamic_reduction(
        rows,
        budgets=payload.budgets or None,
        alpha=payload.alpha,
        budget_max_points=payload.budget_max_points,
    )
    if not result["categories"]:
        raise HTTPException(status_code=422, detail="날짜·금액이 있는 지출 내역이 없습니다")

    return {"led_id": str(led_id), **result}


class ConsumptionAnalysisBody(BaseModel):
    budgets: dict[str, float] = Field(
        default_factory=dict,
        description='카테고리별 월 예산. 예: {"식사": 300000, "간식": 50000}',
    )
    alpha: float = Field(
        DEFAULT_ALPHA,
        ge=0.0,
        le=5.0,
        description="후회율→카테고리 가중치 민감도 (기본 1.0)",
    )
    month: str | None = Field(
        default=None,
        description='분석 대상 월 "YYYY-MM". 미지정 시 전체 기간',
        examples=["2026-06"],
    )


@router.post(
    "/statistics/consumption-analysis",
    summary="가계부 소비지수 분석",
    description=(
        "거래별 **소비지수(score)** 와 카테고리×월 **금액 가중 지수**를 계산합니다. "
        "score = amountScore × regretScore × categoryWeight × budgetPressure. "
        "후회(regret)는 `data.need_type` **불만족**으로 판단합니다. "
        "미분류·수입은 제외."
    ),
)
async def post_consumption_analysis(
    led_id: UUID = Query(..., description="tb_ledger.led_id"),
    payload: ConsumptionAnalysisBody = Body(default_factory=ConsumptionAnalysisBody),
    authorization: Annotated[
        str | None,
        Header(description="Bearer 생략 가능(led_id로 소유자 토큰 자동 발급)"),
    ] = None,
) -> dict[str, Any]:
    settings = get_settings()
    if not settings.supabase_configured():
        raise HTTPException(status_code=503, detail="SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요")

    month = payload.month.strip() if payload.month else None
    if month and len(month) != 7:
        raise HTTPException(status_code=400, detail='month는 "YYYY-MM" 형식이어야 합니다')

    try:
        require_ledger_actor(led_id, authorization)
        rows = fetch_tb_record_rows_for_ledger(led_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"조회 실패: {e!s}") from e

    result = analyze_consumption(
        rows,
        budgets=payload.budgets or None,
        alpha=payload.alpha,
        month_filter=month,
    )
    if not result["transactions"]:
        raise HTTPException(status_code=422, detail="분석 가능한 지출 내역이 없습니다")

    return {"led_id": str(led_id), **result}
