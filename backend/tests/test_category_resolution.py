"""상호명→카테고리 사전 매칭·보강 로직 테스트."""

from __future__ import annotations

import asyncio
from uuid import uuid4

from app.services import category_resolution as cr
from app.services.llm_category_classification import MerchantClassification


def _entry(keyword: str, category: str, mem_id=None) -> dict:
    return {"dict_id": str(uuid4()), "keyword": keyword, "category": category, "mem_id": mem_id}


def test_needs_category_resolution() -> None:
    assert cr.needs_category_resolution(None) is True
    assert cr.needs_category_resolution("") is True
    assert cr.needs_category_resolution("미분류") is True
    assert cr.needs_category_resolution("식비") is False


def test_find_dictionary_match_substring() -> None:
    entries = [_entry("스타벅스", "카페/간식")]
    hit = cr.find_dictionary_match("스타벅스 강남점", entries)
    assert hit is not None
    assert hit.category == "카페/간식"
    assert hit.matched_keyword == "스타벅스"
    assert hit.source == "dictionary"


def test_find_dictionary_match_longer_keyword_wins() -> None:
    entries = [
        _entry("스타", "쇼핑"),
        _entry("스타벅스", "카페/간식"),
    ]
    hit = cr.find_dictionary_match("스타벅스 역삼", entries)
    assert hit is not None
    assert hit.category == "카페/간식"


def test_member_dict_over_global() -> None:
    mem = uuid4()
    entries = [
        _entry("GS25", "식비", mem_id=None),
        _entry("GS25", "교통", mem_id=str(mem)),
    ]
    hit = cr.find_dictionary_match("GS25 강남", entries, mem_id=mem)
    assert hit is not None
    assert hit.category == "교통"


def test_enrich_rows_dictionary_and_llm(monkeypatch) -> None:
    saved: list[tuple[str, str]] = []

    async def fake_llm(merchants, **kwargs):
        return {
            m: MerchantClassification(category="LLM카테", keyword="알수없는")
            for m in merchants
        }

    def fake_save(*, keyword: str, category: str) -> bool:
        saved.append((keyword, category))
        return True

    monkeypatch.setattr(cr, "classify_merchants_with_llm", fake_llm)
    monkeypatch.setattr(cr, "save_learned_merchant_category", fake_save)

    rows = [
        {
            "led_id": str(uuid4()),
            "data_type": "expense",
            "data": {"title": "스타벅스 역삼", "amount": 5000, "category": "미분류"},
        },
        {
            "led_id": str(uuid4()),
            "data_type": "expense",
            "data": {"title": "알수없는가게", "amount": 3000},
        },
        {
            "led_id": str(uuid4()),
            "data_type": "expense",
            "data": {"title": "이미분류됨", "amount": 1000, "category": "식비"},
        },
    ]
    entries = [_entry("스타벅스", "카페/간식")]

    async def run():
        return await cr.enrich_tb_rows_with_categories(rows, entries, use_llm=True)

    enriched, stats, _ = asyncio.run(run())

    assert enriched[0]["data"]["category"] == "카페/간식"
    assert enriched[0]["data"]["category_source"] == "dictionary"
    assert enriched[1]["data"]["category"] == "LLM카테"
    assert enriched[1]["data"]["category_source"] == "llm"
    assert enriched[2]["data"]["category"] == "식비"
    assert stats.from_dictionary == 1
    assert stats.from_llm == 1
    assert stats.dict_learned == 1
    assert saved == [("알수없는", "LLM카테")]
