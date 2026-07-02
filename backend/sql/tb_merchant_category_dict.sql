-- 상호명 키워드 → 카테고리 사전 (Supabase SQL Editor에서 실행)
-- 예: keyword='스타벅스', category='카페/간식' → '스타벅스 강남점' 매칭

CREATE TABLE IF NOT EXISTS public.tb_merchant_category_dict (
    dict_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mem_id     uuid REFERENCES public.tb_member (mem_id) ON DELETE CASCADE,
    keyword    text NOT NULL,
    category   text NOT NULL,
    regist_dt  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT tb_merchant_category_dict_keyword_nonempty CHECK (char_length(trim(keyword)) > 0),
    CONSTRAINT tb_merchant_category_dict_category_nonempty CHECK (char_length(trim(category)) > 0)
);

COMMENT ON TABLE public.tb_merchant_category_dict IS '상호명 키워드→카테고리 사전. LLM 분류 시 자동 적재(mem_id NULL=전역).';
COMMENT ON COLUMN public.tb_merchant_category_dict.keyword IS '상호명에 포함되면 매칭 (예: 스타벅스)';
COMMENT ON COLUMN public.tb_merchant_category_dict.category IS '적용할 카테고리 라벨 (예: 카페/간식)';

-- 전역 사전: mem_id IS NULL 일 때 keyword 유일
CREATE UNIQUE INDEX IF NOT EXISTS uq_merchant_dict_global_keyword
    ON public.tb_merchant_category_dict (lower(trim(keyword)))
    WHERE mem_id IS NULL;

-- 회원 사전: (mem_id, keyword) 유일
CREATE UNIQUE INDEX IF NOT EXISTS uq_merchant_dict_member_keyword
    ON public.tb_merchant_category_dict (mem_id, lower(trim(keyword)))
    WHERE mem_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_merchant_dict_mem_id ON public.tb_merchant_category_dict (mem_id);
