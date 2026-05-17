// 현황 — 이번달 일별 지출 강도 히트맵 카드
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'
export default function CalendarHeatmapSection({ records, refMonth }: { records: LedgerRecord[]; refMonth: string }) {
  const { cells, max } = useMemo(() => {
    const [y, m] = refMonth.split('-').map(Number)
    const totalDays = new Date(y, m, 0).getDate()
    const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7
    const now = new Date()
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m

    const spendByDate = new Map<string, number>()
    for (const r of records) {
      if (r.type !== '지출') continue
      spendByDate.set(r.date, (spendByDate.get(r.date) ?? 0) + r.amount)
    }

    let max = 0
    const cells = Array.from({ length: firstDow }, () => null as null | { day: number; amount: number; isFuture: boolean })
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${refMonth}-${String(d).padStart(2, '0')}`
      const amount = spendByDate.get(dateStr) ?? 0
      if (amount > max) max = amount
      cells.push({ day: d, amount, isFuture: isCurrentMonth && d > now.getDate() })
    }

    return { cells, max }
  }, [records, refMonth])

  const DOW_LABELS = ['월', '화', '수', '목', '금', '토', '일']

  function intensity(amount: number) {
    if (max === 0 || amount === 0) return 'bg-gray-100'
    const ratio = amount / max
    if (ratio > 0.75) return 'bg-red-400'
    if (ratio > 0.5) return 'bg-red-300'
    if (ratio > 0.25) return 'bg-orange-200'
    return 'bg-yellow-100'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <p className="text-[11px] font-semibold text-gray-400 tracking-wider mb-3">이번달 지출 달력</p>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DOW_LABELS.map(d => (
          <div key={d} className="text-center text-[9px] text-gray-300">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, i) => {
          if (cell === null) return <div key={`empty-${i}`} />
          return (
            <div
              key={cell.day}
              title={cell.amount > 0 ? `${cell.day}일: ${cell.amount.toLocaleString('ko-KR')}원` : `${cell.day}일`}
              className={`aspect-square rounded-sm ${cell.isFuture ? 'bg-gray-50' : intensity(cell.amount)}`}
            />
          )
        })}
      </div>
      <p className="text-[10px] text-gray-300 mt-2">색이 진할수록 지출이 많은 날</p>
    </div>
  )
}
