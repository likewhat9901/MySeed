// 현황 — 이번달 카테고리별 최대 지출 vs 평균 지출 비교 카드
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'
export default function MaxVsAvgSection({ records }: { records: LedgerRecord[] }) {
  const items = useMemo(() => {
    const map = new Map<string, number[]>()
    for (const r of records) {
      if (r.type !== '지출') continue
      const key = r.category ?? '기타'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r.amount)
    }
    return Array.from(map.entries())
      .map(([label, amounts]) => {
        const max = Math.max(...amounts)
        const avg = Math.round(amounts.reduce((s, v) => s + v, 0) / amounts.length)
        return { label, max, avg, count: amounts.length }
      })
      .filter(i => i.count >= 2)
      .sort((a, b) => b.max - a.max)
      .slice(0, 5)
  }, [records])

  if (items.length === 0) return null

  const absMax = Math.max(...items.flatMap(i => [i.max, i.avg]), 1)

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <p className="text-[11px] font-semibold text-gray-400 tracking-wider mb-3">최대 vs 평균 지출</p>
      <div className="flex flex-col gap-3">
        {items.map(item => (
          <div key={item.label}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-700">{item.label}</span>
              <span className="text-[10px] text-gray-400 tabular-nums">
                최대 {item.max.toLocaleString('ko-KR')} / 평균 {item.avg.toLocaleString('ko-KR')}원
              </span>
            </div>
            <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-blue-200 rounded-full"
                style={{ width: `${(item.avg / absMax) * 100}%` }}
              />
              <div
                className="absolute left-0 top-0 h-full bg-red-200 rounded-full opacity-60"
                style={{ width: `${(item.max / absMax) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-300 mt-2">파랑: 평균 / 빨강: 최대 (2회 이상 지출 항목)</p>
    </div>
  )
}
