"""상호명 기반 카테고리 해석: 사전 DB 매칭 → LLM 폴백 → 사전 자동 학습."""

from __future__ import annotations

import logging
import unicodedata
from dataclasses import dataclass, field
from typing import Any, Literal
from uuid import UUID

from app.services.bs_reduction_import import SKIP_INDEX_CATEGORY
from app.services.llm_category_classification import MerchantClassification, classify_merchants_with_llm
from app.services.supabase_data import save_learned_merchant_category

logger = logging.getLogger(__name__)

CategorySource = Literal["dictionary", "llm", "skipped", "unresolved"]


def _norm_merchant(v: Any) -> str:
    if v is None:
        return ""
    s = unicodedata.normalize("NFKC", str(v)).replace("\u00a0", " ").replace("\u3000", " ")
    return " ".join(s.split()).strip()


def merchant_name_from_data(data: dict[str, Any]) -> str:
    """거래 data에서 상호명 후보 추출 (title → merchant → memo)."""
    for key in ("title", "merchant", "memo"):
        v = data.get(key)
        if v not in (None, ""):
            return _norm_merchant(v)
    return ""


def needs_category_resolution(category: Any) -> bool:
    """비어 있거나 '미분류'이면 해석 대상."""
    if category is None:
        return True
    s = str(category).strip()
    if not s:
        return True
    return s == SKIP_INDEX_CATEGORY


@dataclass
class CategoryMatch:
    category: str
    source: CategorySource
    matched_keyword: str | None = None


@dataclass
class CategoryEnrichStats:
    total_candidates: int = 0
    from_dictionary: int = 0
    from_llm: int = 0
    dict_learned: int = 0
    unresolved: int = 0
    skipped: int = 0
    llm_merchants: list[str] = field(default_factory=list)


def _dict_entry_sort_key(entry: dict[str, Any], mem_id: UUID | None) -> tuple[int, int, str]:
    """회원 전용 우선, 키워드 길이 내림차순."""
    kw = _norm_merchant(entry.get("keyword"))
    is_member = 1 if entry.get("mem_id") and mem_id and str(entry["mem_id"]) == str(mem_id) else 0
    is_global = 1 if not entry.get("mem_id") else 0
    scope = 2 if is_member else (1 if is_global else 0)
    return (scope, len(kw), kw)


def find_dictionary_match(
    merchant: str,
    dict_entries: list[dict[str, Any]],
    *,
    mem_id: UUID | None = None,
) -> CategoryMatch | None:
    """
    상호명에 keyword가 포함되면 매칭 (대소문자·유니코드 정규화).
    동률 시 회원 사전 > 전역 사전, 더 긴 keyword 우선.
    """
    norm = _norm_merchant(merchant).lower()
    if not norm or not dict_entries:
        return None

    sorted_entries = sorted(
        dict_entries,
        key=lambda e: _dict_entry_sort_key(e, mem_id),
        reverse=True,
    )

    for entry in sorted_entries:
        kw = _norm_merchant(entry.get("keyword"))
        if not kw:
            continue
        entry_mem = entry.get("mem_id")
        if entry_mem is not None and mem_id is not None and str(entry_mem) != str(mem_id):
            continue
        if entry_mem is not None and mem_id is None:
            continue
        if kw.lower() in norm:
            cat = str(entry.get("category", "")).strip()
            if cat:
                return CategoryMatch(category=cat, source="dictionary", matched_keyword=kw)
    return None


def _persist_llm_classifications(
    llm_results: dict[str, MerchantClassification],
    *,
    dict_entries: list[dict[str, Any]],
) -> int:
    """LLM 분류 결과를 전역 사전에 저장하고, 메모리 내 dict_entries에도 반영."""
    learned = 0
    for cls in llm_results.values():
        kw = cls.keyword.strip()
        cat = cls.category.strip()
        if not kw or not cat:
            continue
        try:
            if save_learned_merchant_category(keyword=kw, category=cat):
                learned += 1
                dict_entries.append(
                    {"dict_id": None, "mem_id": None, "keyword": kw, "category": cat}
                )
        except Exception as e:
            logger.warning("사전 자동 학습 저장 실패 keyword=%r: %s", kw, e)
    return learned


async def resolve_category_for_merchant(
    merchant: str,
    dict_entries: list[dict[str, Any]],
    *,
    mem_id: UUID | None = None,
    use_llm: bool = True,
    amount: float | None = None,
    learn_to_dict: bool = True,
) -> CategoryMatch:
    """단일 상호명 카테고리 해석."""
    norm = _norm_merchant(merchant)
    if not norm:
        return CategoryMatch(category=SKIP_INDEX_CATEGORY, source="unresolved")

    hit = find_dictionary_match(norm, dict_entries, mem_id=mem_id)
    if hit:
        return hit

    if not use_llm:
        return CategoryMatch(category=SKIP_INDEX_CATEGORY, source="unresolved")

    hints = {norm: amount} if amount is not None else None
    llm_map, _ = await classify_merchants_with_llm([norm], amount_hints=hints)
    cls = llm_map.get(norm)
    if not cls:
        return CategoryMatch(category=SKIP_INDEX_CATEGORY, source="unresolved")

    if learn_to_dict:
        _persist_llm_classifications({norm: cls}, dict_entries=dict_entries)

    return CategoryMatch(category=cls.category, source="llm", matched_keyword=cls.keyword)


async def enrich_tb_rows_with_categories(
    rows: list[dict[str, Any]],
    dict_entries: list[dict[str, Any]],
    *,
    mem_id: UUID | None = None,
    use_llm: bool = True,
    learn_to_dict: bool = True,
) -> tuple[list[dict[str, Any]], CategoryEnrichStats, list[str]]:
    """
    insert 직전 tb_record 행 목록의 `data.category`를 채웁니다.
    - category가 비어 있거나 '미분류'인 행만 대상
    - 수입(income) 행은 건너뜀
    - LLM 분류 성공 시 전역 사전에 keyword→category 자동 저장
    """
    warnings: list[str] = []
    stats = CategoryEnrichStats()
    # enrich 중 학습된 항목 반영용 (호출자 list를 mutate)
    working_dict = list(dict_entries)

    pending_indices: list[int] = []
    merchant_by_index: dict[int, str] = {}

    for i, row in enumerate(rows):
        data = row.get("data")
        if not isinstance(data, dict):
            continue
        dt = str(row.get("data_type") or "").lower()
        if dt == "income":
            stats.skipped += 1
            continue
        cat = data.get("category")
        if not needs_category_resolution(cat):
            continue
        merchant = merchant_name_from_data(data)
        if not merchant:
            stats.unresolved += 1
            continue
        pending_indices.append(i)
        merchant_by_index[i] = merchant

    stats.total_candidates = len(pending_indices)
    if not pending_indices:
        return rows, stats, warnings

    dict_resolved: dict[int, CategoryMatch] = {}
    llm_needed: list[int] = []

    for i in pending_indices:
        merchant = merchant_by_index[i]
        hit = find_dictionary_match(merchant, working_dict, mem_id=mem_id)
        if hit:
            dict_resolved[i] = hit
            stats.from_dictionary += 1
        elif use_llm:
            llm_needed.append(i)
        else:
            stats.unresolved += 1

    llm_map: dict[str, MerchantClassification] = {}
    if llm_needed:
        unique_merchants = list({merchant_by_index[i] for i in llm_needed})
        amount_hints: dict[str, float | None] = {}
        for i in llm_needed:
            m = merchant_by_index[i]
            if m not in amount_hints:
                data = rows[i].get("data") or {}
                amt = data.get("amount")
                try:
                    amount_hints[m] = float(amt) if amt is not None else None
                except (TypeError, ValueError):
                    amount_hints[m] = None
        llm_map, llm_warns = await classify_merchants_with_llm(unique_merchants, amount_hints=amount_hints)
        stats.llm_merchants = list(llm_map.keys())
        warnings.extend(llm_warns)

        if learn_to_dict and llm_map:
            stats.dict_learned = _persist_llm_classifications(llm_map, dict_entries=working_dict)

    out = [dict(r) for r in rows]
    for i in pending_indices:
        row = dict(out[i])
        data = dict(row.get("data") or {})
        merchant = merchant_by_index[i]

        if i in dict_resolved:
            match = dict_resolved[i]
            data["category"] = match.category
            data["category_source"] = match.source
            if match.matched_keyword:
                data["category_matched_keyword"] = match.matched_keyword
        elif merchant in llm_map:
            cls = llm_map[merchant]
            data["category"] = cls.category
            data["category_source"] = "llm"
            data["category_matched_keyword"] = cls.keyword
            stats.from_llm += 1
        else:
            stats.unresolved += 1
            continue

        row["data"] = data
        out[i] = row

    if stats.from_dictionary or stats.from_llm:
        warnings.append(
            f"카테고리 자동 분류: 사전 {stats.from_dictionary}건, LLM {stats.from_llm}건"
        )
    if stats.dict_learned:
        warnings.append(f"사전 자동 학습: {stats.dict_learned}건 저장")
    if stats.unresolved:
        no_merchant = stats.unresolved  # includes LLM misses; message below is aggregate
        warnings.append(
            f"카테고리 미해결(미분류 유지): {no_merchant}건 "
            "(상호명 없음 또는 LLM 분류 실패 — warnings 상단 LLM 메시지 확인)"
        )

    return out, stats, warnings
