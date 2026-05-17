// /ledger/overview 라우트 — 상하 레이아웃 현황 대시보드
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLedgerContext } from '../_context/LedgerContext'
import { getRecord } from '@/features/ledger/record/rpc'
import SummarySection from './_components/overview/SummarySection'
import MonthCompareSection from './_components/overview/MonthCompareSection'
import DailyAvgSection from './_components/overview/DailyAvgSection'
import ReviewNudge from './_components/overview/ReviewNudge'
import IncomeSection from './_components/flow/IncomeSection'
import CategorySection from './_components/flow/CategorySection'
import CumulativeSection from './_components/flow/CumulativeSection'
import MonthlyTrendSection from './_components/flow/MonthlyTrendSection'
import BigExpenseSection from './_components/detail/BigExpenseSection'
import KeywordSection from './_components/detail/KeywordSection'
import MaxVsAvgSection from './_components/detail/MaxVsAvgSection'
import DayOfWeekSection from './_components/detail/DayOfWeekSection'
import RegretSection from './_components/review/RegretSection'
import CalendarHeatmapSection from './_components/review/CalendarHeatmapSection'

function GroupLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-[11px] font-semibold text-gray-400 tracking-wider shrink-0">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

export default function OverviewPage() {
  const { records: rawRecords, ledgerName, canvasId, currentRecName, setCurrentRecName, currentRecId, setCurrentRecId, setRecords, refMonth, setRefMonth } = useLedgerContext()
  const searchParams = useSearchParams()
  const recIdFromUrl = searchParams.get('rec')
  const records = rawRecords ?? []

  // 데이터에 존재하는 월 목록 (정렬)
  const availableMonths = useMemo(() => {
    const set = new Set(records.map(r => r.date.slice(0, 7)))
    return Array.from(set).sort()
  }, [records])

  // refMonth가 없으면 첫 번째 달로 초기화
  const activeMonth = refMonth ?? availableMonths[0] ?? null

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  function shiftMonth(dir: 1 | -1) {
    if (!activeMonth) return
    const idx = availableMonths.indexOf(activeMonth)
    const next = availableMonths[idx + dir]
    if (next) setRefMonth(next)
  }

  // 선택된 달 기준으로 필터링된 records
  const filteredRecords = useMemo(() => {
    if (!activeMonth) return records
    return records.filter(r => r.date.startsWith(activeMonth))
  }, [records, activeMonth])

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

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 px-5 py-4">
      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm font-semibold text-gray-800">{ledgerName ?? '현황'}</h1>
            {currentRecName && (
              <span className="text-[11px] text-gray-400">{currentRecName}</span>
            )}
          </div>
          {/* 월 선택 */}
          {availableMonths.length > 0 && activeMonth && (
            <div className="relative flex items-center gap-1" ref={dropdownRef}>
              <button
                onClick={() => shiftMonth(-1)}
                disabled={availableMonths.indexOf(activeMonth) === 0}
                className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="text-xs font-medium text-gray-700 w-24 text-center px-2 py-1 rounded hover:bg-gray-200 transition-colors"
              >
                {activeMonth.replace('-', '년 ') + '월'}
              </button>
              <button
                onClick={() => shiftMonth(1)}
                disabled={availableMonths.indexOf(activeMonth) === availableMonths.length - 1}
                className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-md py-1 min-w-[100px]">
                  {availableMonths.map(m => (
                    <button
                      key={m}
                      onClick={() => { setRefMonth(m); setDropdownOpen(false) }}
                      className={`w-full px-4 py-1.5 text-left text-xs transition-colors ${
                        m === activeMonth
                          ? 'text-brand font-semibold bg-brand/5'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {m.replace('-', '년 ') + '월'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ① 이번달 현황 */}
        <GroupLabel label={activeMonth ? `${activeMonth.replace('-', '년 ')}월 현황` : '현황'} />
        <SummarySection records={filteredRecords} />
        <div className="grid grid-cols-2 gap-4">
          <MonthCompareSection records={records} refMonth={activeMonth ?? ''} />
          <DailyAvgSection records={filteredRecords} refMonth={activeMonth ?? ''} />
        </div>

        {/* ② 수입/지출 흐름 */}
        <GroupLabel label="수입 / 지출 흐름" />
        <div className="grid grid-cols-2 gap-4">
          <IncomeSection records={filteredRecords} />
          <CategorySection records={filteredRecords} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <CumulativeSection records={filteredRecords} refMonth={activeMonth ?? ''} />
          <MonthlyTrendSection records={records} refMonth={activeMonth ?? ''} />
        </div>

        {/* ③ 지출 상세 */}
        <GroupLabel label="지출 상세" />
        <div className="grid grid-cols-2 gap-4">
          <BigExpenseSection records={filteredRecords} />
          <KeywordSection records={filteredRecords} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <MaxVsAvgSection records={filteredRecords} />
          <DayOfWeekSection records={filteredRecords} />
        </div>

        {/* ④ 소비 돌아보기 */}
        <GroupLabel label="소비 돌아보기" />
        <ReviewNudge records={filteredRecords} canvasId={canvasId} />
        <div className="grid grid-cols-2 gap-4">
          <RegretSection records={filteredRecords} />
          <CalendarHeatmapSection records={filteredRecords} refMonth={activeMonth ?? ''} />
        </div>
      </div>
    </div>
  )
}
