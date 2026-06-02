// /ledger/overview — 현황 대시보드 (한눈에 / 후회요약 / 지출쪼개기 / 카테고리 / 후회상세 / 추이)
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLedgerContext } from '../_context/LedgerContext'
import { getRecord } from '@/features/ledger/record/rpc'
import SummaryCard from './_components/overview/SummaryCard'
import RegretSummaryCard from './_components/review/RegretSummaryCard'
import ExpenseSplitSection from './_components/overview/ExpenseSplitSection'
import CategoryDonutSection from './_components/overview/CategoryDonutSection'
import RegretSection from './_components/review/RegretSection'
import TrendLineSection from './_components/overview/TrendLineSection'

type ViewMode = 'month' | 'year'

const CATEGORY_COLORS = [
  '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899',
  '#14b8a6', '#f43f5e', '#64748b', '#84cc16',
]

export default function OverviewPage() {
  const {
    records: rawRecords, ledgerName, canvasId,
    currentRecName, setCurrentRecName, currentRecId, setCurrentRecId,
    setRecords, refMonth, setRefMonth,
  } = useLedgerContext()
  const searchParams = useSearchParams()
  const recIdFromUrl = searchParams.get('rec')
  const records = rawRecords ?? []

  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const regretRef = useRef<HTMLDivElement>(null)

  // 기간 네비
  const availableMonths = useMemo(() => {
    const set = new Set(records.map(r => r.date.slice(0, 7)))
    return Array.from(set).sort()
  }, [records])
  const activeMonth = refMonth ?? availableMonths[availableMonths.length - 1] ?? null

  const availableYears = useMemo(() => {
    const set = new Set(records.map(r => r.date.slice(0, 4)))
    return Array.from(set).sort()
  }, [records])
  const [activeYear, setActiveYear] = useState<string>(() => String(new Date().getFullYear()))

  function shiftMonth(dir: 1 | -1) {
    if (!activeMonth) return
    const idx = availableMonths.indexOf(activeMonth)
    const next = availableMonths[idx + dir]
    if (next) setRefMonth(next)
  }
  function shiftYear(dir: 1 | -1) {
    const idx = availableYears.indexOf(activeYear)
    const next = availableYears[idx + dir]
    if (next) setActiveYear(next)
  }

  const navLabel = useMemo(() => {
    if (viewMode === 'month') {
      if (!activeMonth) return ''
      const [y, m] = activeMonth.split('-')
      return `${y}년 ${Number(m)}월`
    }
    return `${activeYear}년`
  }, [viewMode, activeMonth, activeYear])

  const canPrev = useMemo(() => {
    if (viewMode === 'month') return availableMonths.indexOf(activeMonth ?? '') > 0
    return availableYears.indexOf(activeYear) > 0
  }, [viewMode, activeMonth, activeYear, availableMonths, availableYears])

  const canNext = useMemo(() => {
    if (viewMode === 'month') return availableMonths.indexOf(activeMonth ?? '') < availableMonths.length - 1
    return availableYears.indexOf(activeYear) < availableYears.length - 1
  }, [viewMode, activeMonth, activeYear, availableMonths, availableYears])

  function shiftNav(dir: 1 | -1) {
    if (viewMode === 'month') shiftMonth(dir)
    else shiftYear(dir)
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

  // 기간 필터링
  const filteredRecords = useMemo(() => {
    if (viewMode === 'month') {
      if (!activeMonth) return records
      return records.filter(r => r.date.startsWith(activeMonth))
    }
    return records.filter(r => r.date.startsWith(activeYear))
  }, [records, viewMode, activeMonth, activeYear])

  const { expense, income, categoryItems } = useMemo(() => {
    let expense = 0, income = 0
    const catMap = new Map<string, number>()
    for (const r of filteredRecords) {
      if (r.type === '지출') {
        if (r.amount <= 0) continue
        expense += r.amount
        const key = r.category ?? '기타'
        catMap.set(key, (catMap.get(key) ?? 0) + r.amount)
      } else if (r.type === '수입') {
        if (r.amount > 0) income += r.amount
      }
    }
    const categoryItems = Array.from(catMap.entries())
      .map(([label, amount], i) => ({ label, amount, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
      .sort((a, b) => b.amount - a.amount)
    return { expense, income, categoryItems }
  }, [filteredRecords])

  const { prevMonthExpense, prevMonthIncome } = useMemo(() => {
    if (viewMode !== 'month' || !activeMonth) return { prevMonthExpense: 0, prevMonthIncome: 0 }
    const [y, m] = activeMonth.split('-').map(Number)
    const prev = new Date(y, m - 2, 1)
    const prevPrefix = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
    const prevRecords = records.filter(r => r.date.startsWith(prevPrefix))
    return {
      prevMonthExpense: prevRecords.filter(r => r.type === '지출').reduce((s, r) => s + r.amount, 0),
      prevMonthIncome:  prevRecords.filter(r => r.type === '수입').reduce((s, r) => s + r.amount, 0),
    }
  }, [records, activeMonth, viewMode])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* 페이지 타이틀 줄 */}
      <div className="flex items-center justify-between px-5 h-12 border-b border-gray-200 bg-white shrink-0">
        {/* 좌: 제목 + Month/Year 토글 + 기간 네비 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-gray-800">{ledgerName ?? '현황'}</h1>
            {currentRecName && <p className="text-[11px] text-gray-400">{currentRecName}</p>}
          </div>
          <div className="flex items-center bg-gray-200 rounded-full p-0.5 gap-0.5">
            {(['month', 'year'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  viewMode === mode ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {mode === 'month' ? 'Month' : 'Year'}
              </button>
            ))}
          </div>
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
                viewMode === 'month' ? 'hover:bg-gray-200 min-w-[96px]' : 'cursor-default min-w-[80px]'
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
            {dropdownOpen && viewMode === 'month' && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-md py-1 min-w-[100px]">
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

      <div className="flex-1 overflow-y-auto bg-gray-50 px-5 py-4">
      <div className="max-w-5xl mx-auto flex flex-col gap-4">

        {/* SECTION 1 — 이번달 한눈에 + 후회 요약 */}
        <div className="grid grid-cols-[2fr_1fr] gap-4">
          <SummaryCard
            records={filteredRecords}
            expense={expense}
            income={income}
            prevMonthExpense={prevMonthExpense}
            prevMonthIncome={prevMonthIncome}
            refMonth={activeMonth ?? ''}
            viewMode={viewMode === 'month' ? 'month' : 'year'}
            activeYear={activeYear}
          />
          <RegretSummaryCard
            records={filteredRecords}
            allRecords={records}
            refMonth={activeMonth ?? ''}
            onDetailClick={() => regretRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
        </div>

        {/* SECTION 2 — 지출 쪼개기 + 카테고리 분석 */}
        <div className="grid grid-cols-[2fr_1fr] gap-4">
          <ExpenseSplitSection records={filteredRecords} expense={expense} />
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <CategoryDonutSection expense={expense} categoryItems={categoryItems} />
          </div>
        </div>

        {/* SECTION 3 — 후회 소비 (상세) */}
        <div ref={regretRef} className="scroll-mt-4">
          <RegretSection
            records={filteredRecords}
            allRecords={records}
            refMonth={activeMonth ?? ''}
            ledId={canvasId}
          />
        </div>

        {/* SECTION 4 — 추이 */}
        <TrendLineSection
          records={filteredRecords}
          refMonth={activeMonth ?? ''}
          viewMode={viewMode}
          activeYear={activeYear}
        />

        {/* 하단 — 목표 탭으로 */}
        <div className="flex justify-end">
          <Link
            href={canvasId ? `/ledger/goals?led=${canvasId}` : '/ledger/goals'}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand transition-colors"
          >
            다음달 목표 세우러 가기 <ArrowRight size={14} />
          </Link>
        </div>

      </div>
      </div>
    </div>
  )
}
