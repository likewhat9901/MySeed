// /ledger/goals — 목표 탭 (모으기 목표 + 이번달 다짐 + 월말 회고)
'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useLedgerContext } from '../_context/LedgerContext'
import SavingsGoalSection from '../overview/_components/goal/SavingsGoalSection'
import ResolutionSection from './_components/ResolutionSection'
import RetrospectiveSection from './_components/RetrospectiveSection'

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function GoalsPage() {
  const { ledgerName, currentRecName, records: rawRecords, refMonth, canvasId } = useLedgerContext()
  const records = rawRecords ?? []

  // 현황 탭에서 정한 기준월을 따르고, 없으면 가장 최근 데이터 월로
  const activeMonth = useMemo(() => {
    if (refMonth) return refMonth
    const months = Array.from(new Set(records.map(r => r.date.slice(0, 7)))).sort()
    return months[months.length - 1] ?? new Date().toISOString().slice(0, 7)
  }, [refMonth, records])

  const nextMonth = useMemo(() => shiftMonth(activeMonth, 1), [activeMonth])
  const recordsHref = canvasId ? `/ledger/records?led=${canvasId}` : '/ledger/records'

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* 페이지 타이틀 줄 */}
      <div className="flex items-center justify-between px-5 h-12 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-gray-800">{ledgerName ?? '목표'}</h1>
          {currentRecName && <p className="text-[11px] text-gray-400">{currentRecName}</p>}
        </div>
      </div>

      <div className="px-5 py-4 max-w-5xl mx-auto flex flex-col gap-4">
        <SavingsGoalSection refMonth={activeMonth} ledId={canvasId} />
        <ResolutionSection ledId={canvasId} month={activeMonth} />
        <RetrospectiveSection ledId={canvasId} month={activeMonth} nextMonth={nextMonth} />

        {/* 하단 — 내역 탭으로 */}
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
