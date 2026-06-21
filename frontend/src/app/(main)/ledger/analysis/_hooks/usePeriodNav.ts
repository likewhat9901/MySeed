// 분석 탭 — 월/연 기간 모드와 좌우 네비게이션·드롭다운 상태 관리
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'

export type ViewMode = 'month' | 'year'

interface Params {
  records:    LedgerRecord[]
  refMonth:   string | null
  setRefMonth: (m: string) => void
}

export function usePeriodNav({ records, refMonth, setRefMonth }: Params) {
  const [viewMode, setViewMode]     = useState<ViewMode>('month')
  const [dropdownOpen, setDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const availableMonths = useMemo(() => {
    const s = new Set(records.map(r => r.date.slice(0, 7)))
    return Array.from(s).sort()
  }, [records])
  const activeMonth = refMonth ?? availableMonths[availableMonths.length - 1] ?? null

  const availableYears = useMemo(() => {
    const s = new Set(records.map(r => r.date.slice(0, 4)))
    return Array.from(s).sort()
  }, [records])
  const [activeYear, setActiveYear] = useState(() => String(new Date().getFullYear()))

  function shiftNav(dir: 1 | -1) {
    if (viewMode === 'month') {
      const idx = availableMonths.indexOf(activeMonth ?? '')
      const next = availableMonths[idx + dir]
      if (next) setRefMonth(next)
    } else {
      const idx = availableYears.indexOf(activeYear)
      const next = availableYears[idx + dir]
      if (next) setActiveYear(next)
    }
  }
  const canPrev = viewMode === 'month'
    ? availableMonths.indexOf(activeMonth ?? '') > 0
    : availableYears.indexOf(activeYear) > 0
  const canNext = viewMode === 'month'
    ? availableMonths.indexOf(activeMonth ?? '') < availableMonths.length - 1
    : availableYears.indexOf(activeYear) < availableYears.length - 1

  function formatMonthLabel(month: string): string {
    const [y, m] = month.split('-')
    return `${y}년 ${Number(m)}월`
  }

  const navLabel = useMemo(() => {
    if (viewMode === 'month') {
      if (!activeMonth) return ''
      return formatMonthLabel(activeMonth)
    }
    return `${activeYear}년`
  }, [viewMode, activeMonth, activeYear])

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  return {
    viewMode, setViewMode,
    activeMonth, activeYear,
    availableMonths,
    shiftNav, canPrev, canNext, navLabel, formatMonthLabel,
    dropdownOpen, setDropdown, dropdownRef,
  }
}
