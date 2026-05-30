// /ledger/overview 라우트 — 상하 레이아웃 현황 대시보드
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLedgerContext } from '../_context/LedgerContext'
import { getRecord } from '@/features/ledger/record/rpc'
import ReviewNudge from './_components/overview/ReviewNudge'
import KeywordAndMaxSection from './_components/detail/KeywordAndMaxSection'
import DayOfWeekSection from './_components/detail/DayOfWeekSection'
import RegretSection from './_components/review/RegretSection'
import CalendarHeatmapSection from './_components/review/CalendarHeatmapSection'
import SummaryCard from './_components/overview/SummaryCard'
import BudgetCard from './_components/overview/BudgetCard'
import AiInsightCard from './_components/overview/AiInsightCard'
import EntryListSection from './_components/overview/EntryListSection'
import CategoryDonutSection from './_components/overview/CategoryDonutSection'
import TrendBarSection from './_components/overview/TrendBarSection'

type ViewMode = 'week' | 'month' | 'year'

const CATEGORY_COLORS = [
  '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899',
  '#14b8a6', '#f43f5e', '#64748b', '#84cc16',
]


export default function OverviewPage() {
  const { records: rawRecords, ledgerName, canvasId, currentRecName, setCurrentRecName, currentRecId, setCurrentRecId, setRecords, refMonth, setRefMonth } = useLedgerContext()
  const searchParams = useSearchParams()
  const recIdFromUrl = searchParams.get('rec')
  const records = rawRecords ?? []

  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Week 네비: 기준 주의 월요일 날짜 문자열 (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }, [])
  const [activeWeekStart, setActiveWeekStart] = useState<string>(() => {
    const now = new Date()
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1 // 월요일 기준
    const mon = new Date(now)
    mon.setDate(now.getDate() - day)
    return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`
  })

  // Year 네비
  const availableYears = useMemo(() => {
    const set = new Set(records.map(r => r.date.slice(0, 4)))
    return Array.from(set).sort()
  }, [records])
  const [activeYear, setActiveYear] = useState<string>(() => String(new Date().getFullYear()))

  // Month 네비
  const availableMonths = useMemo(() => {
    const set = new Set(records.map(r => r.date.slice(0, 7)))
    return Array.from(set).sort()
  }, [records])
  const activeMonth = refMonth ?? availableMonths[0] ?? null

  function shiftMonth(dir: 1 | -1) {
    if (!activeMonth) return
    const idx = availableMonths.indexOf(activeMonth)
    const next = availableMonths[idx + dir]
    if (next) setRefMonth(next)
  }

  function shiftWeek(dir: 1 | -1) {
    const d = new Date(activeWeekStart)
    d.setDate(d.getDate() + dir * 7)
    setActiveWeekStart(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }

  function shiftYear(dir: 1 | -1) {
    const idx = availableYears.indexOf(activeYear)
    const next = availableYears[idx + dir]
    if (next) setActiveYear(next)
  }

  // 네비게이션 레이블
  const navLabel = useMemo(() => {
    if (viewMode === 'month') {
      if (!activeMonth) return ''
      const [y, m] = activeMonth.split('-')
      return `${y}년 ${Number(m)}월`
    }
    if (viewMode === 'year') return `${activeYear}년`
    // week
    const start = new Date(activeWeekStart)
    const end = new Date(activeWeekStart)
    end.setDate(start.getDate() + 6)
    const sm = String(start.getMonth() + 1).padStart(2, '0')
    const sd = String(start.getDate()).padStart(2, '0')
    const em = String(end.getMonth() + 1).padStart(2, '0')
    const ed = String(end.getDate()).padStart(2, '0')
    if (sm === em) return `${start.getFullYear()}년 ${Number(sm)}월 ${Number(sd)}~${Number(ed)}일`
    return `${Number(sm)}/${Number(sd)} ~ ${Number(em)}/${Number(ed)}`
  }, [viewMode, activeMonth, activeYear, activeWeekStart])

  // 이전/다음 비활성화 여부
  const canPrev = useMemo(() => {
    if (viewMode === 'month') return availableMonths.indexOf(activeMonth ?? '') > 0
    if (viewMode === 'year') return availableYears.indexOf(activeYear) > 0
    return true // week는 항상 이동 가능
  }, [viewMode, activeMonth, activeYear, availableMonths, availableYears])

  const canNext = useMemo(() => {
    if (viewMode === 'month') return availableMonths.indexOf(activeMonth ?? '') < availableMonths.length - 1
    if (viewMode === 'year') return availableYears.indexOf(activeYear) < availableYears.length - 1
    // week: 현재 주 이후로는 막기
    return activeWeekStart < todayStr
  }, [viewMode, activeMonth, activeYear, activeWeekStart, todayStr, availableMonths, availableYears])

  function shiftNav(dir: 1 | -1) {
    if (viewMode === 'month') shiftMonth(dir)
    else if (viewMode === 'year') shiftYear(dir)
    else shiftWeek(dir)
  }

  useEffect(() => {
    if (!dropdownOpen) return
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  useEffect(() => {
    if (!recIdFromUrl || (recIdFromUrl === currentRecId && currentRecName !== null)) return
    getRecord(recIdFromUrl).then(rec => {
      if (!rec) return
      setRecords(rec.data)
      setCurrentRecId(rec.rec_id)
      setCurrentRecName(rec.rec_name)
      const firstDate = rec.data[0]?.date
      if (firstDate) setRefMonth(firstDate.slice(0, 7))
    })
  }, [recIdFromUrl, currentRecId])

  // 선택 기간에 맞게 필터링
  const filteredRecords = useMemo(() => {
    if (viewMode === 'month') {
      if (!activeMonth) return records
      return records.filter(r => r.date.startsWith(activeMonth))
    }
    if (viewMode === 'week') {
      const end = new Date(activeWeekStart)
      end.setDate(end.getDate() + 6)
      const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
      return records.filter(r => r.date >= activeWeekStart && r.date <= endStr)
    }
    // year
    return records.filter(r => r.date.startsWith(activeYear))
  }, [records, viewMode, activeMonth, activeWeekStart, activeYear])

  const { expense, income, transfer, categoryItems } = useMemo(() => {
    let expense = 0, income = 0, transfer = 0
    const catMap = new Map<string, number>()
    for (const r of filteredRecords) {
      if (r.type === '지출') {
        // 음수 금액은 집계에서 제외 (데이터 오류 방어)
        if (r.amount <= 0) continue
        expense += r.amount
        const key = r.category ?? '기타'
        catMap.set(key, (catMap.get(key) ?? 0) + r.amount)
      } else if (r.type === '수입') {
        if (r.amount > 0) income += r.amount
      } else if (r.type === '이체') {
        if (r.amount > 0) transfer += r.amount
      }
    }
    const categoryItems = Array.from(catMap.entries())
      .map(([label, amount], i) => ({ label, amount, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
      .sort((a, b) => b.amount - a.amount)
    return { expense, income, transfer, categoryItems }
  }, [filteredRecords])

  // 전월 지출/수입 (month 모드에서만 의미 있음)
  const { prevMonthExpense, prevMonthIncome } = useMemo(() => {
    if (viewMode !== 'month' || !activeMonth) return { prevMonthExpense: 0, prevMonthIncome: 0 }
    const [y, m] = activeMonth.split('-').map(Number)
    const prev = new Date(y, m - 2, 1)
    const prevPrefix = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
    const prevRecords = records.filter(r => r.date.startsWith(prevPrefix))
    return {
      prevMonthExpense: prevRecords.filter(r => r.type === '지출').reduce((s, r) => s + r.amount, 0),
      prevMonthIncome: prevRecords.filter(r => r.type === '수입').reduce((s, r) => s + r.amount, 0),
    }
  }, [records, activeMonth, viewMode])

  // 남은 일수 (BudgetCard용)
  const daysLeft = useMemo(() => {
    if (!activeMonth) return 0
    const [y, m] = activeMonth.split('-').map(Number)
    const totalDays = new Date(y, m, 0).getDate()
    const now = new Date()
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m
    return isCurrentMonth ? totalDays - now.getDate() : 0
  }, [activeMonth])

  // 일별 지출 (TrendBarSection용 — 모드별 분기)
  const dailyExpense = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of filteredRecords) {
      if (r.type !== '지출') continue
      map.set(r.date, (map.get(r.date) ?? 0) + r.amount)
    }

    if (viewMode === 'week') {
      // 월요일~일요일 7일
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(activeWeekStart)
        d.setDate(d.getDate() + i)
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
        const now = new Date()
        const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
        return { day: d.getDate(), amount: map.get(dateStr) ?? 0, isToday: dateStr === todayStr }
      })
    }

    if (viewMode === 'year') {
      // 월별 집계를 일 단위처럼 표현 (1~12월)
      const monthMap = new Map<string, number>()
      for (const [date, amt] of map) {
        const ym = date.slice(0, 7)
        monthMap.set(ym, (monthMap.get(ym) ?? 0) + amt)
      }
      const now = new Date()
      return Array.from({ length: 12 }, (_, i) => {
        const m = i + 1
        const ym = `${activeYear}-${String(m).padStart(2, '0')}`
        const isToday = now.getFullYear() === Number(activeYear) && now.getMonth() + 1 === m
        return { day: m, amount: monthMap.get(ym) ?? 0, isToday }
      }).filter(d => {
        // 현재 연도면 현재 월까지만
        const now = new Date()
        if (Number(activeYear) < now.getFullYear()) return true
        return d.day <= now.getMonth() + 1
      })
    }

    // month 모드
    if (!activeMonth) return []
    const [y, m] = activeMonth.split('-').map(Number)
    const totalDays = new Date(y, m, 0).getDate()
    const now = new Date()
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m
    const elapsedDays = isCurrentMonth ? now.getDate() : totalDays
    return Array.from({ length: elapsedDays }, (_, i) => {
      const d = i + 1
      const dateStr = `${activeMonth}-${String(d).padStart(2, '0')}`
      return { day: d, amount: map.get(dateStr) ?? 0, isToday: isCurrentMonth && d === now.getDate() }
    })
  }, [filteredRecords, viewMode, activeMonth, activeWeekStart, activeYear])

  // 월 레이블

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 px-5 py-4">
      <div className="max-w-5xl mx-auto flex flex-col gap-4">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 제목 */}
            <div>
              <h1 className="text-sm font-semibold text-gray-800">{ledgerName ?? '현황'}</h1>
              {currentRecName && <p className="text-[11px] text-gray-400">{currentRecName}</p>}
            </div>
            {/* Week/Month/Year 토글 */}
            <div className="flex items-center bg-gray-200 rounded-full p-0.5 gap-0.5">
              {(['week', 'month', 'year'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    viewMode === mode
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {mode === 'week' ? 'Week' : mode === 'month' ? 'Month' : 'Year'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 기간 네비게이션 — viewMode에 따라 레이블/동작 변경 */}
            <div className="relative flex items-center gap-1" ref={dropdownRef}>
              <button
                onClick={() => shiftNav(-1)}
                disabled={!canPrev}
                className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => viewMode === 'month' ? setDropdownOpen(v => !v) : undefined}
                className={`text-xs font-medium text-gray-700 text-center px-2 py-1 rounded transition-colors ${
                  viewMode === 'month' ? 'hover:bg-gray-200 min-w-[96px]' : 'cursor-default min-w-[130px]'
                }`}
              >
                {navLabel}
              </button>
              <button
                onClick={() => shiftNav(1)}
                disabled={!canNext}
                className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
              {/* month 드롭다운 */}
              {dropdownOpen && viewMode === 'month' && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-md py-1 min-w-[100px]">
                  {availableMonths.map(m => (
                    <button
                      key={m}
                      onClick={() => { setRefMonth(m); setDropdownOpen(false) }}
                      className={`w-full px-4 py-1.5 text-left text-xs transition-colors ${
                        m === activeMonth ? 'text-brand font-semibold bg-brand/5' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {m.replace('-', '년 ') + '월'}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 리뷰 넛지 */}
        <ReviewNudge records={filteredRecords} canvasId={canvasId} />

        {/* 요약/예산 카드 + AI 인사이트 (AI가 두 행 span) */}
        <div className="grid grid-cols-[2fr_1fr] gap-4">
          <div className="flex flex-col gap-4">
            <SummaryCard
              records={filteredRecords}
              expense={expense}
              income={income}
              transfer={transfer}
              prevMonthExpense={prevMonthExpense}
              prevMonthIncome={prevMonthIncome}
              refMonth={activeMonth ?? ''}
              viewMode={viewMode}
              activeWeekStart={activeWeekStart}
              activeYear={activeYear}
            />
            <BudgetCard
              expense={expense}
              categoryItems={categoryItems}
              daysLeft={daysLeft}
              viewMode={viewMode}
            />
          </div>
          <AiInsightCard records={filteredRecords} />
        </div>

        {/* 하단 3열 그리드 */}
        <div className="grid grid-cols-3 gap-4">
          <EntryListSection records={filteredRecords} />
          <CategoryDonutSection expense={expense} categoryItems={categoryItems} />
          <TrendBarSection dailyExpense={dailyExpense} refMonth={activeMonth ?? ''} />
        </div>

        {/* 키워드+최대vs평균 (1칸) + 후회소비 (2칸) */}
        <div className="grid grid-cols-3 gap-4">
          <KeywordAndMaxSection records={filteredRecords} />
          <div className="col-span-2">
            <RegretSection records={filteredRecords} />
          </div>
        </div>

        {/* 패턴 카드들 */}
        {viewMode === 'month' ? (
          <div className="grid grid-cols-2 gap-4">
            <DayOfWeekSection
              records={filteredRecords}
              viewMode={viewMode}
              activeMonth={activeMonth ?? ''}
            />
            <CalendarHeatmapSection records={filteredRecords} refMonth={activeMonth ?? ''} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <DayOfWeekSection
              records={filteredRecords}
              viewMode={viewMode}
              activeWeekStart={viewMode === 'week' ? activeWeekStart : undefined}
              activeYear={viewMode === 'year' ? activeYear : undefined}
            />
            <CalendarHeatmapSection
              records={filteredRecords}
              refMonth={activeMonth ?? ''}
              viewMode={viewMode}
              activeWeekStart={viewMode === 'week' ? activeWeekStart : undefined}
              activeYear={viewMode === 'year' ? activeYear : undefined}
            />
          </div>
        )}

      </div>
    </div>
  )
}
