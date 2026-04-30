// ─── 위젯 더미 데이터 모음 ─────────────────────────────────────────────────────
// 실제 API 연결 전까지 각 위젯의 초기값으로 사용.

export const FLOW_ANALYSIS_DATA = {
  income:   { label: 'MONTHLY INCOME', amount: '$8,450.00', value: 8450, color: '#1a5c2e' },
  expenses: { label: 'TOTAL EXPENSES', amount: '$5,120.00', value: 5120, color: '#3b5fa0' },
}

export interface ExpenseRow {
  category: string
  amount: string
  date: string
  status: 'Pending' | 'Paid'
}

export const MONTHLY_EXPENSES_DATA: ExpenseRow[] = [
  { category: 'Housing',      amount: '$1,200.00', date: 'Oct 15, 2026', status: 'Paid'    },
  { category: 'Subscription', amount: '$14.99',    date: 'Oct 20, 2026', status: 'Pending' },
  { category: 'Groceries',    amount: '$400.00',   date: 'Oct 22, 2026', status: 'Paid'    },
]

export const PORTFOLIO_HEALTH_DATA = {
  netWorth:    245890,
  assets:      312000,
  liabilities:  66000,
  growthPct:   12,
}

export const SAVINGS_GOAL_DATA = {
  percent: 70,
  current: '$3,500',
  target:  '$5,000',
  label:   'New York City, 2026',
}

export const QUOTE_DATA = {
  text:   '"A penny saved is a penny earned."',
  author: 'BENJAMIN FRANKLIN',
}

export const EXPENSE_MEMO_DATA = {
  memo:     'Lunch at the Botanical Bistro. Fresh salads and herbal tea. Remember to claim for the gardening client meeting.',
  date:     'Oct 24, 2023',
  category: { label: 'Dining Out', emoji: '🍽' },
}

export const POST_IT_NOTE_DATA = {
  lines: [
    "Don't forget the quarterly tax deposit! 💰",
    'Due Friday the 13th.',
  ],
}
