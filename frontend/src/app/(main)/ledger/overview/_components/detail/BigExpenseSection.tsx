// 현황 — 이번달 고액 지출 상위 5건 카드
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'
export default function BigExpenseSection({ records }: { records: LedgerRecord[] }) {
  const items = useMemo(() => {
    return records
      .filter(r => r.type === '지출')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [records])

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <p className="text-[11px] font-semibold text-gray-400 tracking-wider mb-3">이번달 큰 지출 TOP 5</p>
      {items.length === 0 ? (
        <p className="text-xs text-gray-300">이번달 지출 내역이 없어요.</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-50">
          {items.map((r, i) => (
            <div key={r.id ?? i} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-gray-300 w-3 shrink-0">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-xs text-gray-700 truncate">{r.memo ?? r.category ?? '(메모 없음)'}</p>
                  <p className="text-[10px] text-gray-400">{r.date}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-gray-800 tabular-nums shrink-0 ml-2">
                {r.amount.toLocaleString('ko-KR')}원
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
