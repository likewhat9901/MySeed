"""상호명 → 카테고리 LLM 분류 (사전 매칭 실패 시 폴백)."""

from __future__ import annotations

import asyncio
import json
import logging
import re
import unicodedata
from dataclasses import dataclass
from typing import Any

from openai import AsyncOpenAI
from pydantic import BaseModel, Field, ValidationError

from app.services.bs_reduction_import import CATEGORY_RULES
from app.services.llm_client import (
    GEMINI_BATCH_SIZE,
    build_async_openai_client,
    is_llm_quota_error,
    resolve_llm_client_config,
)

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
MAX_LLM_RETRIES = 3


@dataclass(frozen=True)
class MerchantClassification:
    category: str
    keyword: str


class _LLMCategoryRow(BaseModel):
    merchant: str
    category: str
    keyword: str = Field(default="")
    confidence: float = Field(default=0.7, ge=0.0, le=1.0)


class _LLMCategoryPayload(BaseModel):
    results: list[_LLMCategoryRow]


def _norm_merchant_key(value: str) -> str:
    s = unicodedata.normalize("NFKC", value).replace("\u00a0", " ").replace("\u3000", " ")
    return " ".join(s.split()).strip().casefold()


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
        "(예: merchant='스타벅스 강남점' → keyword='스타벅스').\n"
        "편의점(GS25·CU·세븐일레븐 등)은 '편의점', "
        "배달앱(배민·요기요·쿠팡이츠 등)은 '배달', "
        "온라인몰(쿠팡·11번가·G마켓 등)은 '홈쇼핑' 카테고리를 사용하세요.\n"
        "응답은 JSON만: "
        '{"results":[{"merchant":"<입력과 동일>","keyword":"...","category":"...","confidence":0.0-1.0}]}\n'
        "입력 merchant 목록마다 results에 정확히 한 항목씩. "
        "merchant 필드는 입력 문자열을 그대로 복사하세요."
    )


def _match_row_to_input(batch: list[str], row_merchant: str) -> str | None:
    row_key = _norm_merchant_key(row_merchant)
    if not row_key:
        return None
    by_key = {_norm_merchant_key(m): m for m in batch}
    if row_key in by_key:
        return by_key[row_key]
    for key, original in by_key.items():
        if row_key in key or key in row_key:
            return original
    return None


def _extract_json_object(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        return text[start : end + 1]
    return text


def _parse_llm_batch(batch: list[str], raw: str) -> dict[str, MerchantClassification]:
    parsed = _LLMCategoryPayload.model_validate_json(_extract_json_object(raw))
    out: dict[str, MerchantClassification] = {}
    for row in parsed.results:
        category = row.category.strip()
        if not category:
            continue
        original = _match_row_to_input(batch, row.merchant)
        if not original:
            continue
        keyword = (row.keyword or original).strip()
        out[original] = MerchantClassification(category=category, keyword=keyword)
    return out


def _retry_delay_seconds(exc: BaseException, attempt: int) -> float:
    if is_llm_quota_error(exc):
        m = re.search(r"retry in ([0-9.]+)s", str(exc), re.I)
        if m:
            return min(float(m.group(1)) + 1.0, 90.0)
        return min(10.0 * (attempt + 1), 60.0)
    return min(2.0 * (attempt + 1), 8.0)


async def _classify_batch(
    client: AsyncOpenAI,
    model: str,
    batch: list[str],
    *,
    amount_hints: dict[str, float | None],
    use_json_mode: bool,
) -> dict[str, MerchantClassification]:
    payload_items = [{"merchant": m, "amount": amount_hints.get(m)} for m in batch]
    user = json.dumps({"merchants": payload_items}, ensure_ascii=False)
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": _build_system_prompt()},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
    }
    if use_json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    last_err: Exception | None = None
    for attempt in range(MAX_LLM_RETRIES):
        try:
            completion = await client.chat.completions.create(**kwargs)
            raw = completion.choices[0].message.content or "{}"
            return _parse_llm_batch(batch, raw)
        except Exception as e:
            last_err = e
            if attempt >= MAX_LLM_RETRIES - 1:
                break
            await asyncio.sleep(_retry_delay_seconds(e, attempt))
    assert last_err is not None
    raise last_err


async def classify_merchants_with_llm(
    merchants: list[str],
    *,
    amount_hints: dict[str, float | None] | None = None,
) -> tuple[dict[str, MerchantClassification], list[str]]:
    """
    상호명 목록을 LLM으로 분류.
    반환: ({merchant: MerchantClassification}, warnings).
    """
    unique = [m.strip() for m in merchants if m and m.strip()]
    if not unique:
        return {}, []

    cfg = resolve_llm_client_config()
    warnings: list[str] = []
    if not cfg.api_key:
        warnings.append(
            "LLM API 키 없음(OPENAI_API_KEY 또는 GOOGLE_API_KEY) — 카테고리 LLM 분류를 건너뜁니다."
        )
        return {}, warnings

    client = build_async_openai_client(cfg)
    if client is None:
        warnings.append("LLM 클라이언트를 만들 수 없습니다.")
        return {}, warnings

    hints = amount_hints or {}
    out: dict[str, MerchantClassification] = {}
    batch_errors = 0
    quota_hit = False
    batch_size = GEMINI_BATCH_SIZE if cfg.provider == "gemini" else MAX_BATCH_SIZE
    use_json_mode = cfg.provider != "gemini"

    for i in range(0, len(unique), batch_size):
        batch = unique[i : i + batch_size]
        try:
            batch_out = await _classify_batch(
                client,
                cfg.model,
                batch,
                amount_hints=hints,
                use_json_mode=use_json_mode,
            )
            out.update(batch_out)
        except (ValidationError, json.JSONDecodeError, IndexError) as e:
            batch_errors += 1
            logger.warning("LLM category parse failed for batch: %s", e)
        except Exception as e:
            batch_errors += 1
            if is_llm_quota_error(e):
                quota_hit = True
            logger.warning("LLM category request failed (%s): %s", cfg.provider, e)

    missing = [m for m in unique if m not in out]
    if missing and not quota_hit:
        for merchant in missing:
            try:
                single = await _classify_batch(
                    client,
                    cfg.model,
                    [merchant],
                    amount_hints=hints,
                    use_json_mode=use_json_mode,
                )
                out.update(single)
            except Exception as e:
                if is_llm_quota_error(e):
                    quota_hit = True
                logger.warning("LLM single retry failed for %r: %s", merchant, e)

    still_missing = [m for m in unique if m not in out]
    if quota_hit:
        warnings.append(
            "Gemini API 할당량 초과(429). Google AI Studio 결제·할당량을 확인하거나 "
            "OpenAI 키(sk-…)를 OPENAI_API_KEY에 설정하세요."
        )
    if still_missing:
        warnings.append(
            f"LLM 분류 실패 {len(still_missing)}개 상호명 "
            f"({len(still_missing)}건 거래에 영향, provider={cfg.provider}, model={cfg.model}"
            + (f", batch_errors={batch_errors}" if batch_errors else "")
            + ")"
        )
    elif cfg.provider == "gemini" and out:
        warnings.append(f"LLM 분류: Gemini 사용 ({cfg.model}), {len(out)}개 상호명")

    return out, warnings
