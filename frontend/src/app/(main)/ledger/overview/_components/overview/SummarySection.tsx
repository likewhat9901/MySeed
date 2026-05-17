// 현황 — 이번달 수입/지출/잔액/만족·후회소비 요약 한 줄 카드
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'
function fmt(n: number) {
  return Math.round(n).toLocaleString('ko-KR') + '원'
}

export default function SummarySection({ records }: { records: LedgerRecord[] }) {
  const { income, expense, good, regret } = useMemo(() => {
    return records
      .reduce(
        (acc, r) => {
          if (r.type === '수입') {
            acc.income += r.amount
          } else {
            acc.expense += r.amount
            if (r.review === 'good') acc.good += r.amount
            if (r.review === 'bad') acc.regret += r.amount
          }
          return acc
        },
        { income: 0, expense: 0, good: 0, regret: 0 },
      )
  }, [records])

  const balance = income - expense
  const goodRatio = expense > 0 ? Math.round((good / expense) * 100) : 0
  const regretRatio = expense > 0 ? Math.round((regret / expense) * 100) : 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-5 py-3 flex items-center divide-x divide-gray-100">
      <Item label="수입" value={fmt(income)} valueClass="text-green-600" />
      <Item label="지출" value={fmt(expense)} valueClass="text-gray-800" />
      <Item label="잔액" value={(balance < 0 ? '-' : '') + fmt(Math.abs(balance))} valueClass={balance >= 0 ? 'text-gray-800' : 'text-red-500'} />
      <Item label="만족 소비" value={fmt(good)} sub={good > 0 ? `지출의 ${goodRatio}%` : undefined} valueClass="text-blue-500" />
      <Item label="후회 소비" value={fmt(regret)} sub={regret > 0 ? `지출의 ${regretRatio}%` : undefined} valueClass="text-red-400" />
    </div>
  )
}

function Item({ label, value, sub, valueClass }: {
  label: string; value: string; sub?: string; valueClass?: string
}) {
  return (
    <div className="flex-1 px-5 first:pl-0 last:pr-0">
      <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${valueClass ?? 'text-gray-800'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
