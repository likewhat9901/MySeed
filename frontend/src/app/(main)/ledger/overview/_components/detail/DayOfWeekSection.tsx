// 현황 — 모드별 지출 패턴 카드 (Week: 요일별, Month: 주차별, Year: 월별)
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

type Props = {
  records: LedgerRecord[]
  viewMode: 'week' | 'month' | 'year'
  activeWeekStart?: string
  activeMonth?: string
  activeYear?: string
}

export default function DayOfWeekSection({ records, viewMode, activeWeekStart, activeMonth, activeYear }: Props) {
  const { data, title, subtitle } = useMemo(() => {
    if (viewMode === 'week') {
      const sumMap = new Array(7).fill(0)
      const daySet = Array.from({ length: 7 }, () => new Set<string>())
      for (const r of records) {
        if (r.type !== '지출') continue
        const dow = (new Date(r.date).getDay() + 6) % 7
        sumMap[dow] += r.amount
        daySet[dow].add(r.date)
      }
      return {
        title: '요일별 지출 패턴',
        subtitle: '날짜별 평균 지출',
        data: DAY_LABELS.map((label, i) => ({
          label,
          value: daySet[i].size > 0 ? Math.round(sumMap[i] / daySet[i].size) : 0,
          total: sumMap[i],
          isHighlight: i >= 5, // 주말
        })),
      }
    }

    if (viewMode === 'month') {
      // 주차별 집계 — 해당 월 기준 ISO 주차
      const weekMap = new Map<number, number>()
      for (const r of records) {
        if (r.type !== '지출') continue
        const d = new Date(r.date)
        const dayOfMonth = d.getDate()
        const weekNum = Math.ceil(dayOfMonth / 7)
        weekMap.set(weekNum, (weekMap.get(weekNum) ?? 0) + r.amount)
      }
      const maxWeek = activeMonth
        ? Math.ceil(new Date(Number(activeMonth.slice(0, 4)), Number(activeMonth.slice(5, 7)), 0).getDate() / 7)
        : 5
      return {
        title: '주차별 지출 패턴',
        subtitle: '주차별 총 지출',
        data: Array.from({ length: maxWeek }, (_, i) => ({
          label: `${i + 1}주`,
          value: weekMap.get(i + 1) ?? 0,
          total: weekMap.get(i + 1) ?? 0,
          isHighlight: false,
        })),
      }
    }

    // year: 월별 집계
    const monthMap = new Map<number, number>()
    for (const r of records) {
      if (r.type !== '지출') continue
      const m = Number(r.date.slice(5, 7))
      monthMap.set(m, (monthMap.get(m) ?? 0) + r.amount)
    }
    const now = new Date()
    const currentYear = Number(activeYear ?? now.getFullYear())
    const maxMonth = currentYear < now.getFullYear() ? 12 : now.getMonth() + 1
    return {
      title: '월별 지출 패턴',
      subtitle: '월별 총 지출',
      data: MONTH_LABELS.slice(0, maxMonth).map((label, i) => ({
        label,
        value: monthMap.get(i + 1) ?? 0,
        total: monthMap.get(i + 1) ?? 0,
        isHighlight: false,
      })),
    }
  }, [records, viewMode, activeWeekStart, activeMonth, activeYear])

  const maxValue = Math.max(...data.map(d => d.value), 1)
  const hasData = data.some(d => d.value > 0)
  const peakIndex = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0)

  // 하단 미니 인사이트 그래프용: 상위 3개 항목
  const topItems = [...data]
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)

  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400 tracking-wider mb-4">{title}</p>
      {!hasData ? (
        <p className="text-xs text-gray-300">지출 내역이 없어요.</p>
      ) : (
        <>
          <div className="flex items-end gap-1.5 h-20">
            {data.map((d, i) => {
              const heightPct = (d.value / maxValue) * 100
              const isPeak = i === peakIndex && d.value > 0
              return (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end" style={{ height: '48px' }}>
                    <div
                      className={`w-full rounded-t transition-all ${
                        isPeak
                          ? 'bg-orange-400'
                          : d.isHighlight
                          ? 'bg-orange-200'
                          : 'bg-blue-200'
                      }`}
                      style={{ height: `${Math.max(heightPct, d.value > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                  <span className={`text-[10px] ${isPeak ? 'text-orange-500 font-semibold' : d.isHighlight ? 'text-orange-400 font-medium' : 'text-gray-400'}`}>
                    {d.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* 하단 인사이트 — 상위 3개 비교 미니 그래프 */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 mb-2">
              {subtitle} 상위
            </p>
            <div className="flex flex-col gap-1.5">
              {topItems.map((item, rank) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className={`text-[10px] w-6 text-right font-medium ${rank === 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                    {item.label}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${rank === 0 ? 'bg-orange-400' : rank === 1 ? 'bg-blue-300' : 'bg-gray-300'}`}
                      style={{ width: `${(item.value / topItems[0].value) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 w-14 text-right">
                    {item.value.toLocaleString()}원
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
