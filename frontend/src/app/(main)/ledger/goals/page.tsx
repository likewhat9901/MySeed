// /ledger/goals — 목표 탭 (모으기 목표 + 이번달 다짐 + 월말 회고)
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLedgerContext } from '../_context/LedgerContext'
import SavingsGoalSection from './_components/SavingsGoalSection'
import ResolutionSection from './_components/ResolutionSection'
import RetrospectiveSection from './_components/RetrospectiveSection'

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-')
  return `${y}년 ${Number(m)}월`
}

// 카테고리 → 이모지 (다짐 칩·아이콘용)
const CATEGORY_EMOJI: Record<string, string> = {
  '카페·간식': '☕', '카페': '☕', '식비': '🍚', '배달': '🍔', '술/유흥': '🍻',
  '문화/여가': '🎮', '쇼핑': '🛍️', '교통': '🚌', '의료/건강': '💊',
  '이체': '💸', '주거·관리비': '🏠', '통신': '📱',
}

export default function Goals2Page() {
  const { ledgerName, currentRecName, records: rawRecords, refMonth, setRefMonth, canvasId } = useLedgerContext()
  const records = rawRecords ?? []

  const availableMonths = useMemo(() => {
    const s = new Set(records.map(r => r.date.slice(0, 7)))
    return Array.from(s).sort()
  }, [records])

  const activeMonth = useMemo(() => {
    if (refMonth) return refMonth
    return availableMonths[availableMonths.length - 1] ?? new Date().toISOString().slice(0, 7)
  }, [refMonth, availableMonths])

  const canPrev = availableMonths.indexOf(activeMonth) > 0
  const canNext = availableMonths.indexOf(activeMonth) < availableMonths.length - 1

  function shiftNav(dir: 1 | -1) {
    const idx = availableMonths.indexOf(activeMonth)
    const next = availableMonths[idx + dir]
    if (next) setRefMonth(next)
  }

  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false)
  const monthDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!monthDropdownOpen) return
    function handler(e: MouseEvent) {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target as Node)) setMonthDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [monthDropdownOpen])

  const prevMonth = useMemo(() => shiftMonth(activeMonth, -1), [activeMonth])
  const recordsHref = canvasId ? `/ledger/records?led=${canvasId}` : '/ledger/records'

  // 이번달 순수입 (적립 요약용) = 수입 - 지출
  const netIncome = useMemo(() => {
    let income = 0, expense = 0
    for (const r of records) {
      if (!r.date.startsWith(activeMonth) || r.amount <= 0) continue
      if (r.type === '수입') income += r.amount
      else if (r.type === '지출') expense += r.amount
    }
    return income - expense
  }, [records, activeMonth])

  // 후회 카테고리 TOP (분석에서 가져오기 칩) — 이번달 review==='bad' 카테고리별 합계
  const regretCategories = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of records) {
      if (r.type !== '지출' || r.amount <= 0 || r.review !== 'bad' || !r.date.startsWith(activeMonth)) continue
      const k = r.category || '기타'
      m.set(k, (m.get(k) ?? 0) + r.amount)
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([category, amount]) => ({ category, amount, emoji: CATEGORY_EMOJI[category] }))
  }, [records, activeMonth])

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* 타이틀 줄 */}
      <div className="flex items-center justify-between px-5 h-12 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-gray-800">{ledgerName ?? '목표'}</h1>
          {currentRecName && <p className="text-[11px] text-gray-400">{currentRecName}</p>}
          {availableMonths.length > 0 && (
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <button onClick={() => shiftNav(-1)} disabled={!canPrev}
                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
                <ChevronLeft size={14} />
              </button>
              <div className="relative" ref={monthDropdownRef}>
                <button
                  onClick={() => setMonthDropdownOpen(o => !o)}
                  className="text-xs font-semibold text-gray-700 min-w-[88px] text-center px-2 py-1 border border-gray-200 hover:border-gray-400 transition-colors"
                >
                  {formatMonthLabel(activeMonth)}
                </button>
                {monthDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-300 shadow-md py-0.5 w-[88px]">
                    {[...availableMonths].reverse().map(m => (
                      <button key={m}
                        onClick={() => { setRefMonth(m); setMonthDropdownOpen(false) }}
                        className={`w-full px-2 py-1.5 text-left text-xs transition-colors ${
                          m === activeMonth ? 'bg-gray-800 text-white' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {formatMonthLabel(m)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => shiftNav(1)} disabled={!canNext}
                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-5 max-w-5xl mx-auto flex flex-col gap-5">

        {/* 모으기 목표 */}
        <div>
          <SavingsGoalSection refMonth={activeMonth} ledId={canvasId} netIncome={netIncome} />
        </div>

        {/* 다짐 (2열) + 회고 (1열) */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-500 shrink-0">Resolutions &amp; Retrospective — 다짐과 회고</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>
          <div className="grid grid-cols-3 gap-4 items-stretch">
            <div className="col-span-2">
              <ResolutionSection
                ledId={canvasId}
                month={activeMonth}
                prevMonth={prevMonth}
                records={records}
                regretCategories={regretCategories}
              />
            </div>
            <RetrospectiveSection ledId={canvasId} month={activeMonth} prevMonth={prevMonth} />
          </div>
        </div>

        {/* 하단 링크 */}
        <div className="flex justify-end">
          <Link
            href={recordsHref}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand transition-colors"
          >
            이번달 내역 기록하러 가기 <ArrowRight size={14} />
          </Link>
        </div>

      </div>
    </div>
  )
}
