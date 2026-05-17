// 현황 — 이번달 수입 항목별 내역 카드
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'
export default function IncomeSection({ records }: { records: LedgerRecord[] }) {
  const items = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of records) {
      if (r.type !== '수입') continue
      const key = r.category ?? '기타'
      map.set(key, (map.get(key) ?? 0) + r.amount)
    }
    return Array.from(map.entries())
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [records])

  const total = items.reduce((s, i) => s + i.amount, 0)
  const max = Math.max(...items.map(i => i.amount), 1)

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <div className="flex justify-between items-center mb-3">
        <p className="text-[11px] font-semibold text-gray-400 tracking-wider">수입 내역</p>
        <span className="text-xs font-semibold text-green-600">{total.toLocaleString('ko-KR')}원</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-300">이번달 수입 내역이 없어요.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(item => (
            <div key={item.label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-700">{item.label}</span>
                <span className="text-[11px] text-gray-500 tabular-nums">{item.amount.toLocaleString('ko-KR')}원</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-300 rounded-full transition-all"
                  style={{ width: `${(item.amount / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
