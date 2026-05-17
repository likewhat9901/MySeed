// 현황 — 이번달 후회 소비 내역 카드
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'
export default function RegretSection({ records }: { records: LedgerRecord[] }) {
  const { items, total, expense } = useMemo(() => {
    let expense = 0
    const items: LedgerRecord[] = []
    for (const r of records) {
      if (r.type !== '지출') continue
      expense += r.amount
      if (r.review === 'bad') items.push(r)
    }
    items.sort((a, b) => b.amount - a.amount)
    const total = items.reduce((s, r) => s + r.amount, 0)
    return { items, total, expense }
  }, [records])

  const ratio = expense > 0 ? Math.round((total / expense) * 100) : 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <div className="flex justify-between items-center mb-3">
        <p className="text-[11px] font-semibold text-gray-400 tracking-wider">후회 소비</p>
        {total > 0 && (
          <span className="text-xs font-semibold text-red-400">{total.toLocaleString('ko-KR')}원 ({ratio}%)</span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-300">후회 소비로 표시한 내역이 없어요.</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-50">
          {items.slice(0, 5).map((r, i) => (
            <div key={r.id ?? i} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-xs text-gray-700 truncate">{r.memo ?? r.category ?? '(메모 없음)'}</p>
                <p className="text-[10px] text-gray-400">{r.date} · {r.category ?? '기타'}</p>
              </div>
              <span className="text-xs font-medium text-red-400 tabular-nums shrink-0 ml-2">
                {r.amount.toLocaleString('ko-KR')}원
              </span>
            </div>
          ))}
          {items.length > 5 && (
            <p className="text-[10px] text-gray-400 pt-1.5">외 {items.length - 5}건 더</p>
          )}
        </div>
      )}
    </div>
  )
}
