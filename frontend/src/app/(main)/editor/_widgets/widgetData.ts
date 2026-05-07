// ─── 위젯 더미 데이터 모음 ─────────────────────────────────────────────────────
// 실제 API 연결 전까지 각 위젯의 초기값으로 사용.

export const FLOW_ANALYSIS_DATA = {
  income:   { label: '월 수입', amount: '₩8,450,000', value: 8450000, color: '#1a5c2e' },
  expenses: { label: '총 지출', amount: '₩5,120,000', value: 5120000, color: '#3b5fa0' },
}

export interface ExpenseRow {
  category: string
  amount: string
  date: string
  status: '완료' | '대기'
}

export const MONTHLY_EXPENSES_DATA: ExpenseRow[] = [
  { category: '주거비',   amount: '₩1,200,000', date: '2026.10.15', status: '완료' },
  { category: '구독 서비스', amount: '₩14,900',   date: '2026.10.20', status: '대기' },
  { category: '식료품',   amount: '₩400,000',   date: '2026.10.22', status: '완료' },
]

export const PORTFOLIO_HEALTH_DATA = {
  netWorth:    245890000,
  assets:      312000000,
  liabilities:  66000000,
  growthPct:   12,
}

export const SAVINGS_GOAL_DATA = {
  percent: 70,
  current: '₩3,500,000',
  target:  '₩5,000,000',
  label:   '여행 적금 2026',
}

export const QUOTE_DATA = {
  text:   '"저축한 1원이 번 1원이다."',
  author: '벤저민 프랭클린',
}

export const EXPENSE_MEMO_DATA = {
  memo:     '식물원 비스트로에서 점심. 신선한 샐러드와 허브차. 정원 클라이언트 미팅 비용으로 청구할 것.',
  date:     '2026.10.24',
  category: { label: '외식', emoji: '🍽' },
}

export const POST_IT_NOTE_DATA = {
  lines: [
    '분기 세금 납부 잊지 말 것! 💰',
    '이번 주 금요일 13일까지.',
  ],
}
