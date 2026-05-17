// 현황 — 이번달 요일별 평균 지출 패턴 카드
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

export default function DayOfWeekSection({ records }: { records: LedgerRecord[] }) {
  const data = useMemo(() => {
    const sumMap = new Array(7).fill(0)
    const daySet = Array.from({ length: 7 }, () => new Set<string>())

    for (const r of records) {
      if (r.type !== '지출') continue
      const dow = (new Date(r.date).getDay() + 6) % 7 // 0=월 ... 6=일
      sumMap[dow] += r.amount
      daySet[dow].add(r.date)
    }

    return DAY_LABELS.map((label, i) => ({
      label,
      avg: daySet[i].size > 0 ? Math.round(sumMap[i] / daySet[i].size) : 0,
      isWeekend: i >= 5,
    }))
  }, [records])

  const max = Math.max(...data.map(d => d.avg), 1)
  const hasData = data.some(d => d.avg > 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <p className="text-[11px] font-semibold text-gray-400 tracking-wider mb-4">요일별 지출 패턴</p>
      {!hasData ? (
        <p className="text-xs text-gray-300">이번달 지출 내역이 없어요.</p>
      ) : (
        <div className="flex items-end gap-1.5 h-20">
          {data.map(d => {
            const heightPct = (d.avg / max) * 100
            return (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end" style={{ height: '48px' }}>
                  <div
                    className={`w-full rounded-t transition-all ${d.isWeekend ? 'bg-orange-300' : 'bg-blue-200'}`}
                    style={{ height: `${Math.max(heightPct, d.avg > 0 ? 6 : 0)}%` }}
                  />
                </div>
                <span className={`text-[10px] ${d.isWeekend ? 'text-orange-400 font-medium' : 'text-gray-400'}`}>
                  {d.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
      <p className="text-[10px] text-gray-300 mt-2">날짜별 평균 지출 (파랑: 평일 / 주황: 주말)</p>
    </div>
  )
}
