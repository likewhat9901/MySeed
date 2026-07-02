"""상호명 → 카테고리 LLM 분류 (사전 매칭 실패 시 폴백)."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any

from openai import AsyncOpenAI
from pydantic import BaseModel, Field, ValidationError

from app.core.config import get_settings
from app.services.bs_reduction_import import CATEGORY_RULES

logger = logging.getLogger(__name__)

SUGGESTED_CATEGORIES = list(CATEGORY_RULES.keys()) + [
    "카페/간식",
    "편의점",
    "배달",
    "홈쇼핑",
    "페이",
    "이체",
    "금융/보험",
    "미용/패션",
    "기타",
]

MAX_BATCH_SIZE = 40


@dataclass(frozen=True)
class MerchantClassification:
    category: str
    keyword: str


class _LLMCategoryRow(BaseModel):
    merchant: str
    category: str
    keyword: str = Field(
        default="",
        description="사전 등록용 짧은 브랜드/상호 키워드 (예: 스타벅스 강남점 → 스타벅스)",
    )
    confidence: float = Field(default=0.7, ge=0.0, le=1.0)


class _LLMCategoryPayload(BaseModel):
    results: list[_LLMCategoryRow]


def _build_system_prompt() -> str:
    cats = ", ".join(SUGGESTED_CATEGORIES)
    return (
        "당신은 한국 가계부 지출의 상호명(가맹점명)을 카테고리로 분류합니다.\n"
        f"가능하면 다음 카테고리 중 하나를 사용하세요: {cats}\n"
        "없으면 짧은 한국어 카테고리명을 새로 제안해도 됩니다 (예: 카페/간식).\n"
        "수입·급여 등은 '수입' 카테고리를 사용하세요.\n"
        "간편결제·페이 앱(카카오페이·네이버페이·토스·삼성페이 등)은 '페이', "
        "계좌 이체는 '이체' 카테고리를 사용하세요.\n"
        "keyword는 이후 유사 가맹점 매칭용 짧은 브랜드명입니다 "
        "(예: merchant='스타벅스 강남점' → keyword='스타벅스', "
        "merchant='GS25강남역점' → keyword='GS25', "
        "merchant='배달의민족' → keyword='배달의민족').\n"
        "편의점(GS25·CU·세븐일레븐 등)은 '편의점', "
        "배달앱(배민·요기요·쿠팡이츠 등)은 '배달', "
        "온라인몰(쿠팡·11번가·G마켓 등)은 '홈쇼핑' 카테고리를 사용하세요.\n"
        "응답은 JSON만: "
        '{"results":[{"merchant":"<입력과 동일>","keyword":"...","category":"...","confidence":0.0-1.0}]}\n'
        "입력 merchant 목록마다 results에 정확히 한 항목씩, merchant 문자열은 입력과 동일하게."
    )


async def classify_merchants_with_llm(
    merchants: list[str],
    *,
    amount_hints: dict[str, float | None] | None = None,
) -> dict[str, MerchantClassification]:
    """
    상호명 목록을 LLM으로 분류.
    반환: {merchant: MerchantClassification(category, keyword)}.
    API 키 없거나 실패 시 빈 dict.
    """
    unique = [m.strip() for m in merchants if m and m.strip()]
    if not unique:
        return {}

    settings = get_settings()
    if not settings.openai_api_key:
        logger.info("OPENAI_API_KEY 없음 — LLM 카테고리 분류 생략")
        return {}

    out: dict[str, MerchantClassification] = {}
    hints = amount_hints or {}

    for i in range(0, len(unique), MAX_BATCH_SIZE):
        batch = unique[i : i + MAX_BATCH_SIZE]
        payload_items = [
            {"merchant": m, "amount": hints.get(m)} for m in batch
        ]
        user = json.dumps({"merchants": payload_items}, ensure_ascii=False)

        try:
            client_kwargs: dict[str, Any] = {"api_key": settings.openai_api_key}
            if settings.openai_base_url:
                client_kwargs["base_url"] = settings.openai_base_url
            client = AsyncOpenAI(**client_kwargs)
            completion = await client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system", "content": _build_system_prompt()},
                    {"role": "user", "content": user},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
            )
            raw = completion.choices[0].message.content or "{}"
            parsed = _LLMCategoryPayload.model_validate_json(raw)
        except (ValidationError, json.JSONDecodeError, IndexError) as e:
            logger.warning("LLM category parse failed for batch: %s", e)
            continue
        except Exception as e:
            logger.warning("LLM category request failed: %s", e)
            continue

        for row in parsed.results:
            merchant = row.merchant.strip()
            category = row.category.strip()
            keyword = (row.keyword or merchant).strip()
            if merchant and category:
                out[merchant] = MerchantClassification(category=category, keyword=keyword)

    return out
