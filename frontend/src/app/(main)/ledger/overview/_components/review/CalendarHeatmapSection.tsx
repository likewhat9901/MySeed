// 현황 — 모드별 지출 히트맵 카드 (Month: 일별, Week: 이번 주 일별, Year: 월별)
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'

type Props = {
  records: LedgerRecord[]
  refMonth: string
  viewMode?: 'week' | 'month' | 'year'
  activeWeekStart?: string
  activeYear?: string
}

const DOW_LABELS = ['월', '화', '수', '목', '금', '토', '일']
const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

function intensity(amount: number, max: number) {
  if (max === 0 || amount === 0) return 'bg-gray-100'
  const ratio = amount / max
  if (ratio > 0.75) return 'bg-red-400'
  if (ratio > 0.5) return 'bg-red-300'
  if (ratio > 0.25) return 'bg-orange-200'
  return 'bg-yellow-100'
}

export default function CalendarHeatmapSection({ records, refMonth, viewMode = 'month', activeWeekStart, activeYear }: Props) {
  const spendByDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of records) {
      if (r.type !== '지출') continue
      map.set(r.date, (map.get(r.date) ?? 0) + r.amount)
    }
    return map
  }, [records])

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  const weekCells = useMemo(() => {
    const base = activeWeekStart ?? todayStr
    const cells = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base)
      d.setDate(d.getDate() + i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      return {
        label: String(d.getDate()),
        dow: DOW_LABELS[i],
        amount: spendByDate.get(dateStr) ?? 0,
        isFuture: dateStr > todayStr,
        isToday: dateStr === todayStr,
      }
    })
    const max = Math.max(...cells.map(c => c.amount), 1)
    return { cells, max }
  }, [spendByDate, activeWeekStart, todayStr])

  const yearCells = useMemo(() => {
    const currentYear = Number(activeYear ?? now.getFullYear())
    const maxMonth = currentYear < now.getFullYear() ? 12 : now.getMonth() + 1
    const monthMap = new Map<number, number>()
    for (const [date, amt] of spendByDate) {
      if (date.startsWith(String(currentYear))) {
        const m = Number(date.slice(5, 7))
        monthMap.set(m, (monthMap.get(m) ?? 0) + amt)
      }
    }
    const cells = Array.from({ length: maxMonth }, (_, i) => ({
      label: MONTH_LABELS[i],
      amount: monthMap.get(i + 1) ?? 0,
      isCurrentMonth: now.getFullYear() === currentYear && now.getMonth() + 1 === i + 1,
    }))
    const max = Math.max(...cells.map(c => c.amount), 1)
    return { cells, max }
  }, [spendByDate, activeYear])

  const monthData = useMemo(() => {
    if (!refMonth) return { cells: [], max: 1 }
    const [y, m] = refMonth.split('-').map(Number)
    const totalDays = new Date(y, m, 0).getDate()
    const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m

    let max = 0
    const cells = Array.from({ length: firstDow }, () => null as null | { day: number; amount: number; isFuture: boolean })
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${refMonth}-${String(d).padStart(2, '0')}`
      const amount = spendByDate.get(dateStr) ?? 0
      if (amount > max) max = amount
      cells.push({ day: d, amount, isFuture: isCurrentMonth && d > now.getDate() })
    }
    return { cells, max }
  }, [spendByDate, refMonth])

  if (viewMode === 'week') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
        <p className="text-[11px] font-semibold text-gray-400 tracking-wider mb-3">이번 주 지출 히트맵</p>
        <div className="grid grid-cols-7 gap-1">
          {weekCells.cells.map(cell => (
            <div key={cell.dow} className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-gray-300">{cell.dow}</span>
              <div
                title={cell.amount > 0 ? `${cell.label}일: ${cell.amount.toLocaleString('ko-KR')}원` : `${cell.label}일`}
                className={`w-full aspect-square rounded-sm ${
                  cell.isFuture ? 'bg-gray-50' :
                  cell.isToday ? 'ring-1 ring-blue-300 ' + intensity(cell.amount, weekCells.max) :
                  intensity(cell.amount, weekCells.max)
                }`}
              />
              <span className="text-[9px] text-gray-400">{cell.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-300 mt-2">색이 진할수록 지출이 많은 날</p>
      </div>
    )
  }

  if (viewMode === 'year') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
        <p className="text-[11px] font-semibold text-gray-400 tracking-wider mb-3">월별 지출 히트맵</p>
        <div className="grid grid-cols-4 gap-1.5">
          {yearCells.cells.map(cell => (
            <div key={cell.label} className="flex flex-col items-center gap-1">
              <div
                title={cell.amount > 0 ? `${cell.label}: ${cell.amount.toLocaleString('ko-KR')}원` : cell.label}
                className={`w-full aspect-square rounded-md ${
                  cell.isCurrentMonth
                    ? 'ring-1 ring-blue-300 ' + intensity(cell.amount, yearCells.max)
                    : intensity(cell.amount, yearCells.max)
                }`}
              />
              <span className="text-[9px] text-gray-400">{cell.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-300 mt-2">색이 진할수록 지출이 많은 달</p>
      </div>
    )
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
        {monthData.cells.map((cell, i) => {
          if (cell === null) return <div key={`empty-${i}`} />
          return (
            <div
              key={cell.day}
              title={cell.amount > 0 ? `${cell.day}일: ${cell.amount.toLocaleString('ko-KR')}원` : `${cell.day}일`}
              className={`aspect-square rounded-sm ${cell.isFuture ? 'bg-gray-50' : intensity(cell.amount, monthData.max)}`}
            />
          )
        })}
      </div>
      <p className="text-[10px] text-gray-300 mt-2">색이 진할수록 지출이 많은 날</p>
    </div>
  )
}
