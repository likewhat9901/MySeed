"""상호명 카테고리 분류 API (사전 조회 → LLM → 사전 자동 학습)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.deps.supabase_user import require_ledger_actor, require_supabase_user_id
from app.services.category_resolution import (
    CategoryEnrichStats,
    enrich_tb_rows_with_categories,
    resolve_category_for_merchant,
)
from app.services.supabase_data import (
    fetch_merchant_category_dict,
    fetch_tb_record_rows_for_ledger,
    update_tb_record_data_fields,
)

router = APIRouter(tags=["category-resolution"])


class CategoryResolveRequest(BaseModel):
    merchant_name: str = Field(..., min_length=1, description="상호명 (예: 스타벅스 강남점)")
    amount: float | None = Field(default=None, description="금액 힌트 (LLM용)")
    use_llm: bool = Field(default=True, description="사전 미매칭 시 LLM 호출 여부")


class CategoryResolveResponse(BaseModel):
    merchant_name: str
    category: str
    source: str = Field(description="dictionary | llm | unresolved")
    matched_keyword: str | None = None
    dict_learned: bool = Field(
        default=False,
        description="LLM 분류 후 사전에 새로 저장했는지",
    )


class CategoryEnrichStatsResponse(BaseModel):
    total_candidates: int = 0
    from_dictionary: int = 0
    from_llm: int = 0
    from_heuristic: int = 0
    from_fallback: int = 0
    dict_learned: int = 0
    no_merchant: int = 0
    unresolved: int = 0
    skipped: int = 0
    updated: int = 0


class CategoryEnrichResponse(BaseModel):
    stats: CategoryEnrichStatsResponse
    warnings: list[str] = Field(default_factory=list)


def _stats_to_response(stats: CategoryEnrichStats, updated: int = 0) -> CategoryEnrichStatsResponse:
    return CategoryEnrichStatsResponse(
        total_candidates=stats.total_candidates,
        from_dictionary=stats.from_dictionary,
        from_llm=stats.from_llm,
        from_heuristic=stats.from_heuristic,
        from_fallback=stats.from_fallback,
        dict_learned=stats.dict_learned,
        no_merchant=stats.no_merchant,
        unresolved=stats.unresolved,
        skipped=stats.skipped,
        updated=updated,
    )


@router.post(
    "/categories/resolve",
    summary="상호명 카테고리 분류 (사전 → LLM → 사전 자동 저장)",
    response_model=CategoryResolveResponse,
)
async def resolve_merchant_category(
    body: CategoryResolveRequest,
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> CategoryResolveResponse:
    settings = get_settings()
    if not settings.supabase_configured():
        raise HTTPException(status_code=503, detail="SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요")

    mem_id = require_supabase_user_id(authorization)
    dict_entries = fetch_merchant_category_dict(mem_id=mem_id)
    before_count = len(dict_entries)

    match = await resolve_category_for_merchant(
        body.merchant_name,
        dict_entries,
        mem_id=mem_id,
        use_llm=body.use_llm,
        amount=body.amount,
        learn_to_dict=True,
    )

    dict_learned = match.source == "llm" and len(dict_entries) > before_count

    return CategoryResolveResponse(
        merchant_name=body.merchant_name.strip(),
        category=match.category,
        source=match.source,
        matched_keyword=match.matched_keyword,
        dict_learned=dict_learned,
    )


@router.post(
    "/categories/enrich",
    summary="ledger 내 미분류 거래 카테고리 일괄 보강",
    response_model=CategoryEnrichResponse,
)
async def enrich_ledger_categories(
    ledger_id: UUID = Query(..., description="tb_ledger UUID"),
    use_llm: bool = Query(default=True, description="사전 미매칭 시 LLM 사용"),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> CategoryEnrichResponse:
    settings = get_settings()
    if not settings.supabase_configured():
        raise HTTPException(status_code=503, detail="SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요")

    mem_id = require_ledger_actor(ledger_id, authorization)
    dict_entries = fetch_merchant_category_dict(mem_id=mem_id)

    rows = fetch_tb_record_rows_for_ledger(ledger_id)
    tb_rows = [
        {"rec_id": r["rec_id"], "data_type": r.get("data_type"), "data": r.get("data") or {}}
        for r in rows
    ]

    enriched, stats, warns = await enrich_tb_rows_with_categories(
        tb_rows,
        dict_entries,
        mem_id=mem_id,
        use_llm=use_llm,
        learn_to_dict=True,
    )

    patches: list[dict] = []
    for orig, new in zip(rows, enriched):
        orig_data = orig.get("data") or {}
        new_data = new.get("data") or {}
        if new_data.get("category") and new_data.get("category") != orig_data.get("category"):
            patches.append({"rec_id": str(orig["rec_id"]), "data": new_data})

    updated = 0
    if patches:
        try:
            updated = update_tb_record_data_fields(ledger_id, patches)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"갱신 실패: {e}") from e

    return CategoryEnrichResponse(stats=_stats_to_response(stats, updated=updated), warnings=warns)
