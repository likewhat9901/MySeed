// 현황 — 전월 대비 이번달 총 지출 비교 카드
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'

export default function MonthCompareSection({ records, refMonth }: { records: LedgerRecord[]; refMonth: string }) {
  const { thisTotal, lastTotal, diff, diffPct } = useMemo(() => {
    const [y, m] = refMonth.split('-').map(Number)
    const thisPrefix = refMonth
    const lastDate = new Date(y, m - 2, 1)
    const lastPrefix = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`

    let thisTotal = 0
    let lastTotal = 0
    for (const r of records) {
      if (r.type !== '지출') continue
      if (r.date.startsWith(thisPrefix)) thisTotal += r.amount
      else if (r.date.startsWith(lastPrefix)) lastTotal += r.amount
    }

    const diff = thisTotal - lastTotal
    const diffPct = lastTotal > 0 ? Math.round((diff / lastTotal) * 100) : null

    return { thisTotal, lastTotal, diff, diffPct }
  }, [records])

  const [y, m] = refMonth.split('-').map(Number)
  const thisMonthLabel = `${m}월`
  const lastDate = new Date(y, m - 2, 1)
  const lastMonthLabel = `${lastDate.getMonth() + 1}월`

  const increased = diff > 0
  const barThis = Math.max(thisTotal, lastTotal) > 0 ? (thisTotal / Math.max(thisTotal, lastTotal)) * 100 : 0
  const barLast = Math.max(thisTotal, lastTotal) > 0 ? (lastTotal / Math.max(thisTotal, lastTotal)) * 100 : 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <div className="flex justify-between items-start mb-3">
        <p className="text-[11px] font-semibold text-gray-400 tracking-wider">전월 대비</p>
        {diffPct !== null && (
          <span className={`text-xs font-semibold ${increased ? 'text-red-400' : 'text-green-500'}`}>
            {increased ? '+' : ''}{diffPct}%
          </span>
        )}
      </div>
      {lastTotal === 0 && thisTotal === 0 ? (
        <p className="text-xs text-gray-300">지출 내역이 없어요.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {[
            { label: thisMonthLabel, amount: thisTotal, bar: barThis, isCurrent: true },
            { label: lastMonthLabel, amount: lastTotal, bar: barLast, isCurrent: false },
          ].map(row => (
            <div key={row.label}>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs ${row.isCurrent ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                  {row.label}
                </span>
                <span className="text-[11px] text-gray-500 tabular-nums">
                  {Math.round(row.amount).toLocaleString('ko-KR')}원
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${row.isCurrent ? (increased ? 'bg-red-300' : 'bg-green-300') : 'bg-gray-300'}`}
                  style={{ width: `${row.bar}%` }}
                />
              </div>
            </div>
          ))}
          {diffPct !== null && (
            <p className="text-[10px] text-gray-400 mt-1">
              전월보다 {Math.abs(Math.round(diff)).toLocaleString('ko-KR')}원 {increased ? '더 썼어요' : '아꼈어요'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
