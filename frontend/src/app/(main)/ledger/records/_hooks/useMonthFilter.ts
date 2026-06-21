// 내역 탭 — 월별 필터링 및 월 네비게이션 상태 관리
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'

interface Params {
  records:     LedgerRecord[]
  refMonth:    string | null
  setRefMonth: (m: string) => void
  setRecords:  (updater: (prev: LedgerRecord[]) => LedgerRecord[]) => void
}

export function useMonthFilter({ records, refMonth, setRefMonth, setRecords }: Params) {
  const availableMonths = useMemo(() => {
    const s = new Set(records.map(r => r.date.slice(0, 7)))
    return Array.from(s).sort()
  }, [records])

  // 월별 건수 — 드롭다운에 표시
  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of records) {
      const m = r.date.slice(0, 7)
      counts[m] = (counts[m] ?? 0) + 1
    }
    return counts
  }, [records])

  // 월별 수입/지출/이체 합계 — 월 관리 모달에 표시
  const monthSummary = useMemo(() => {
    const summary: Record<string, { income: number; expense: number; transfer: number }> = {}
    for (const r of records) {
      const m = r.date.slice(0, 7)
      if (!summary[m]) summary[m] = { income: 0, expense: 0, transfer: 0 }
      if (r.type === '수입') summary[m].income += r.amount
      else if (r.type === '이체') summary[m].transfer += r.amount
      else summary[m].expense += r.amount
    }
    return summary
  }, [records])

  // refMonth 가 없거나 데이터에 없으면 가장 최근 달로
  const activeMonth = useMemo(() => {
    if (refMonth && availableMonths.includes(refMonth)) return refMonth
    return availableMonths[availableMonths.length - 1] ?? null
  }, [refMonth, availableMonths])

  const filteredRecords = useMemo(() =>
    activeMonth ? records.filter(r => r.date.startsWith(activeMonth)) : records,
    [records, activeMonth],
  )

  function shiftMonth(dir: 1 | -1) {
    if (!activeMonth) return
    const idx = availableMonths.indexOf(activeMonth)
    const next = availableMonths[idx + dir]
    if (next) setRefMonth(next)
  }

  // 선택한 월들의 내역을 한번에 삭제 — 활성 월이 삭제되면 가장 최근 달로 자동 이동(activeMonth useMemo가 처리)
  function deleteMonths(months: string[]) {
    setRecords(prev => prev.filter(r => !months.includes(r.date.slice(0, 7))))
  }

  const canPrev = activeMonth ? availableMonths.indexOf(activeMonth) > 0 : false
  const canNext = activeMonth ? availableMonths.indexOf(activeMonth) < availableMonths.length - 1 : false

  function formatMonthLabel(month: string): string {
    return `${month.slice(0, 4)}년 ${Number(month.slice(5, 7))}월`
  }

  const monthLabel = activeMonth ? formatMonthLabel(activeMonth) : ''

  return {
    availableMonths, activeMonth, filteredRecords, monthCounts, monthSummary,
    shiftMonth, deleteMonths, setRefMonth,
    canPrev, canNext, monthLabel, formatMonthLabel,
  }
}
