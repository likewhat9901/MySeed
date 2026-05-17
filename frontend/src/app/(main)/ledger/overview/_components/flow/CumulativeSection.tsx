// 현황 — 이번달 일별 누적 지출 추이 카드
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'
export default function CumulativeSection({ records, refMonth }: { records: LedgerRecord[]; refMonth: string }) {
  const { points, total, elapsedDays } = useMemo(() => {
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

    let cumulative = 0
    const points: number[] = []
    for (let d = 1; d <= elapsedDays; d++) {
      const dateStr = `${refMonth}-${String(d).padStart(2, '0')}`
      cumulative += spendByDate.get(dateStr) ?? 0
      points.push(cumulative)
    }

    return { points, total: cumulative, elapsedDays }
  }, [records, refMonth])

  const max = Math.max(...points, 1)
  const hasData = total > 0

  const width = 280
  const height = 56
  const padX = 4

  const svgPoints = points.map((v, i) => {
    const x = padX + (i / Math.max(points.length - 1, 1)) * (width - padX * 2)
    const y = height - (v / max) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <div className="flex justify-between items-center mb-3">
        <p className="text-[11px] font-semibold text-gray-400 tracking-wider">누적 지출 추이</p>
        {hasData && (
          <span className="text-xs text-gray-500 tabular-nums">{total.toLocaleString('ko-KR')}원</span>
        )}
      </div>
      {!hasData ? (
        <p className="text-xs text-gray-300">이번달 지출 내역이 없어요.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: '56px' }}>
            <polyline
              points={svgPoints}
              fill="none"
              stroke="#93c5fd"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.length > 0 && (
              <circle
                cx={padX + ((points.length - 1) / Math.max(points.length - 1, 1)) * (width - padX * 2)}
                cy={height - (points[points.length - 1] / max) * height}
                r="3"
                fill="#3b82f6"
              />
            )}
          </svg>
          <p className="text-[10px] text-gray-300 mt-1">{elapsedDays}일 경과 기준 누적</p>
        </>
      )}
    </div>
  )
}
