// 현황 — 하루 평균 지출 + 절약일 카운트 카드
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'
function fmt(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

export default function DailyAvgSection({ records, refMonth }: { records: LedgerRecord[]; refMonth: string }) {
  const { dailyAvg, zerodays, elapsedDays, totalDays } = useMemo(() => {
    const [y, m] = refMonth.split('-').map(Number)
    const totalDays = new Date(y, m, 0).getDate()
    const now = new Date()
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m
    const elapsedDays = isCurrentMonth ? now.getDate() : totalDays

    const spendByDate = new Map<string, number>()
    for (const r of records) {
      if (r.type !== '지출') continue
      spendByDate.set(r.date, (spendByDate.get(r.date) ?? 0) + r.amount)
    }

    const total = Array.from(spendByDate.values()).reduce((s, v) => s + v, 0)
    const dailyAvg = elapsedDays > 0 ? Math.round(total / elapsedDays) : 0

    let zerodays = 0
    for (let d = 1; d <= elapsedDays; d++) {
      const dateStr = `${refMonth}-${String(d).padStart(2, '0')}`
      if (!spendByDate.has(dateStr)) zerodays++
    }

    return { dailyAvg, zerodays, elapsedDays, totalDays }
  }, [records, refMonth])

  const zeroPct = elapsedDays > 0 ? Math.round((zerodays / elapsedDays) * 100) : 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <p className="text-[11px] font-semibold text-gray-400 tracking-wider mb-3">이번달 소비 페이스</p>
      <div className="flex gap-4">
        <div className="flex-1">
          <p className="text-[10px] text-gray-400 mb-1">하루 평균 지출</p>
          <p className="text-base font-bold text-gray-800">{fmt(dailyAvg)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{elapsedDays}일 경과 / {totalDays}일</p>
        </div>
        <div className="w-px bg-gray-100 shrink-0" />
        <div className="flex-1">
          <p className="text-[10px] text-gray-400 mb-1">지출 없는 날</p>
          <p className="text-base font-bold text-green-500">{zerodays}일</p>
          <p className="text-[10px] text-gray-400 mt-0.5">경과일의 {zeroPct}%</p>
        </div>
      </div>
    </div>
  )
}
