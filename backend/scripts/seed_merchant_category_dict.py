"""tb_merchant_category_dict 전역 시드 동기화 (키워드 유니크, 기존 행 카테고리 갱신)."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.supabase_data import _client, fetch_merchant_category_dict

# keyword는 유니크(대소문자 무시). 동일 브랜드 중복 키워드 없음.
SEED: list[tuple[str, str]] = [
    # 카페/간식
    ("스타벅스", "카페/간식"),
    ("이디야", "카페/간식"),
    ("투썸플레이스", "카페/간식"),
    ("투썸", "카페/간식"),
    ("메가커피", "카페/간식"),
    ("컴포즈커피", "카페/간식"),
    ("빽다방", "카페/간식"),
    ("할리스", "카페/간식"),
    ("파스쿠찌", "카페/간식"),
    ("블루보틀", "카페/간식"),
    ("던킨", "카페/간식"),
    ("파리바게뜨", "카페/간식"),
    ("뚜레쥬르", "카페/간식"),
    ("베스킨라빈스", "카페/간식"),
    ("요거트아이스크림의정석", "카페/간식"),
    ("공차", "카페/간식"),
    # 편의점
    ("GS25", "편의점"),
    ("CU", "편의점"),
    ("세븐일레븐", "편의점"),
    ("7-ELEVEN", "편의점"),
    ("이마트24", "편의점"),
    ("미니스톱", "편의점"),
    # 마트·식품
    ("이마트", "식비"),
    ("롯데마트", "식비"),
    ("홈플러스", "식비"),
    ("코스트코", "식비"),
    ("노브랜드", "식비"),
    ("트레이더스", "식비"),
    ("마켓컬리", "식비"),
    # 배달
    ("배달의민족", "배달"),
    ("배민", "배달"),
    ("요기요", "배달"),
    ("쿠팡이츠", "배달"),
    # 외식
    ("맥도날드", "식비"),
    ("버거킹", "식비"),
    ("롯데리아", "식비"),
    ("KFC", "식비"),
    ("맘스터치", "식비"),
    ("서브웨이", "식비"),
    ("도미노피자", "식비"),
    ("피자헛", "식비"),
    ("파파존스", "식비"),
    ("교촌치킨", "식비"),
    ("BHC", "식비"),
    ("BBQ", "식비"),
    ("네네치킨", "식비"),
    ("굽네치킨", "식비"),
    ("처갓집", "식비"),
    ("본죽", "식비"),
    ("김밥천국", "식비"),
    ("한솥도시락", "식비"),
    ("죠스떡볶이", "식비"),
    ("역전우동", "식비"),
    ("새마을식당", "식비"),
    # 홈쇼핑·온라인몰
    ("쿠팡", "홈쇼핑"),
    ("11번가", "홈쇼핑"),
    ("G마켓", "홈쇼핑"),
    ("지마켓", "홈쇼핑"),
    ("옥션", "홈쇼핑"),
    ("SSG", "홈쇼핑"),
    ("알리익스프레스", "홈쇼핑"),
    ("테무", "홈쇼핑"),
    # 오프라인 쇼핑
    ("신세계", "쇼핑"),
    ("롯데백화점", "쇼핑"),
    ("현대백화점", "쇼핑"),
    ("다이소", "쇼핑"),
    ("무인양품", "쇼핑"),
    # 미용/패션
    ("올리브영", "미용/패션"),
    ("롭스", "미용/패션"),
    ("시코르", "미용/패션"),
    ("유니클로", "미용/패션"),
    ("자라", "미용/패션"),
    ("H&M", "미용/패션"),
    ("무신사", "미용/패션"),
    ("에이블리", "미용/패션"),
    ("지그재그", "미용/패션"),
    ("나이키", "미용/패션"),
    ("아디다스", "미용/패션"),
    # 교통
    ("카카오T", "교통"),
    ("카카오택시", "교통"),
    ("타다", "교통"),
    ("쏘카", "교통"),
    ("그린카", "교통"),
    ("SK주유소", "교통"),
    ("SK에너지", "교통"),
    ("GS칼텍스", "교통"),
    ("S-OIL", "교통"),
    ("현대오일뱅크", "교통"),
    ("한국도로공사", "교통"),
    ("티머니", "교통"),
    ("후불하이패스", "교통"),
    ("KTX", "교통"),
    ("코레일", "교통"),
    ("SRT", "교통"),
    # 통신
    ("SKT", "통신"),
    ("KT", "통신"),
    ("LG유플러스", "통신"),
    ("LGU+", "통신"),
    ("SK텔레콤", "통신"),
    # 의료/건강
    ("약국", "의료/건강"),
    ("온누리약국", "의료/건강"),
    ("병원", "의료/건강"),
    ("의원", "의료/건강"),
    ("치과", "의료/건강"),
    ("한의원", "의료/건강"),
    ("헬스장", "의료/건강"),
    ("스포애니", "의료/건강"),
    ("골프존", "의료/건강"),
    # 문화/여가
    ("넷플릭스", "문화/여가"),
    ("왓챠", "문화/여가"),
    ("티빙", "문화/여가"),
    ("웨이브", "문화/여가"),
    ("쿠팡플레이", "문화/여가"),
    ("디즈니플러스", "문화/여가"),
    ("CGV", "문화/여가"),
    ("롯데시네마", "문화/여가"),
    ("메가박스", "문화/여가"),
    ("멜론", "문화/여가"),
    ("스팀", "문화/여가"),
    ("PC방", "문화/여가"),
    ("노래방", "문화/여가"),
    ("코인노래방", "문화/여가"),
    # 교육
    ("학원", "교육"),
    ("교보문고", "교육"),
    ("영풍문고", "교육"),
    ("알라딘", "교육"),
    ("예스24", "교육"),
    ("리디북스", "교육"),
    ("클래스101", "교육"),
    ("패스트캠퍼스", "교육"),
    ("인프런", "교육"),
    # 주거/공과금
    ("관리비", "주거/공과금"),
    ("월세", "주거/공과금"),
    ("한국전력", "주거/공과금"),
    ("도시가스", "주거/공과금"),
    ("수자원공사", "주거/공과금"),
    # 페이
    ("카카오페이", "페이"),
    ("네이버페이", "페이"),
    ("토스", "페이"),
    ("삼성페이", "페이"),
    ("페이코", "페이"),
    ("애플페이", "페이"),
    # 금융/보험
    ("삼성카드", "금융/보험"),
    ("현대카드", "금융/보험"),
    ("신한카드", "금융/보험"),
    ("KB국민카드", "금융/보험"),
    ("우리카드", "금융/보험"),
    ("롯데카드", "금융/보험"),
    ("하나카드", "금융/보험"),
    ("NH카드", "금융/보험"),
    ("BC카드", "금융/보험"),
    ("이체", "이체"),
    ("보험", "금융/보험"),
    # 수입
    ("급여", "수입"),
    ("월급", "수입"),
    ("보너스", "수입"),
    ("환급", "수입"),
]


def _dedupe_seed() -> list[tuple[str, str]]:
    seen: set[str] = set()
    out: list[tuple[str, str]] = []
    for kw, cat in SEED:
        key = kw.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append((kw.strip(), cat))
    return out


def _index_existing(rows: list[dict]) -> dict[str, dict]:
    by_key: dict[str, dict] = {}
    for row in rows:
        key = str(row.get("keyword", "")).strip().lower()
        if key and key not in by_key:
            by_key[key] = row
    return by_key


def main() -> None:
    seed = _dedupe_seed()
    existing_rows = fetch_merchant_category_dict(mem_id=None)
    by_key = _index_existing(existing_rows)
    client = _client()

    inserted: list[tuple[str, str]] = []
    updated: list[tuple[str, str, str]] = []
    unchanged = 0

    for kw, cat in seed:
        key = kw.lower()
        row = by_key.get(key)
        if row is None:
            try:
                res = (
                    client.table("tb_merchant_category_dict")
                    .insert({"keyword": kw, "category": cat})
                    .select("keyword,category")
                    .execute()
                )
                r = (res.data or [{}])[0]
                inserted.append((str(r.get("keyword", kw)), str(r.get("category", cat))))
                by_key[key] = r
            except Exception as e:
                if "23505" in str(e) or "duplicate" in str(e).lower():
                    unchanged += 1
                else:
                    raise
            continue

        old_cat = str(row.get("category", "")).strip()
        if old_cat == cat:
            unchanged += 1
            continue

        dict_id = row.get("dict_id")
        client.table("tb_merchant_category_dict").update({"category": cat}).eq(
            "dict_id", str(dict_id)
        ).execute()
        updated.append((kw, old_cat, cat))

    print(f"INSERTED={len(inserted)} UPDATED={len(updated)} UNCHANGED={unchanged}")
    for kw, cat in inserted:
        print(f"+ {kw}\t{cat}")
    for kw, old, new in updated:
        print(f"~ {kw}\t{old} → {new}")


if __name__ == "__main__":
    main()
