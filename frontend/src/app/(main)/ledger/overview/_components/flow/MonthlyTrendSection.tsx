// 현황 — 최근 6개월 월별 지출 트렌드 카드
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'

export default function MonthlyTrendSection({ records, refMonth }: { records: LedgerRecord[]; refMonth: string }) {
  const months = useMemo(() => {
    const [ry, rm] = refMonth.split('-').map(Number)
    return Array.from({ length: 6 }, (_, i) => {
      const offset = -(5 - i)
      const d = new Date(ry, rm - 1 + offset, 1)
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${d.getMonth() + 1}월`
      const total = records
        .filter(r => r.type === '지출' && r.date.startsWith(prefix))
        .reduce((s, r) => s + r.amount, 0)
      return { label, total, prefix }
    })
  }, [records, refMonth])

  const max = Math.max(...months.map(m => m.total), 1)
  const hasData = months.some(m => m.total > 0)
  const currentPrefix = refMonth

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <p className="text-[11px] font-semibold text-gray-400 tracking-wider mb-4">월별 지출 추이</p>
      {!hasData ? (
        <p className="text-xs text-gray-300">지출 내역이 없어요.</p>
      ) : (
        <div className="flex items-end gap-1.5 h-20">
          {months.map(m => {
            const heightPct = (m.total / max) * 100
            const isCurrent = m.prefix === currentPrefix
            return (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end" style={{ height: '48px' }}>
                  <div
                    className={`w-full rounded-t transition-all ${isCurrent ? 'bg-blue-400' : 'bg-blue-200'}`}
                    style={{ height: `${Math.max(heightPct, m.total > 0 ? 6 : 0)}%` }}
                  />
                </div>
                <span className={`text-[10px] ${isCurrent ? 'text-blue-500 font-semibold' : 'text-gray-400'}`}>
                  {m.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
      <p className="text-[10px] text-gray-300 mt-2">최근 6개월 총 지출</p>
    </div>
  )
}
