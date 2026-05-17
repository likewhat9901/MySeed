// 내역 카테고리 고정 목록 — AI 매핑 및 가계부 카드 집계 기준

export const CATEGORIES = [
  '식비',
  '카페·간식',
  '교통',
  '쇼핑',
  '문화·여가',
  '의료·건강',
  '구독·통신',
  '주거·관리비',
  '수입',
  '기타',
] as const

export type Category = typeof CATEGORIES[number]

export type TransactionType = '지출' | '수입' | '이체' | '투자'
