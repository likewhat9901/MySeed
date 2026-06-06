// /ledger/goals — 목표 탭 (모으기 목표 + 이번달 다짐 + 월말 회고)
'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useLedgerContext } from '../_context/LedgerContext'
import SavingsGoalSection from './_components/SavingsGoalSection'
import ResolutionSection from './_components/ResolutionSection'
import RetrospectiveSection from './_components/RetrospectiveSection'

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/* 현황2 와 동일한 섹션 구분선 패턴 */
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 h-px bg-gray-300" />
    </div>
  )
}

/* 기존 컴포넌트의 카드 스타일(rounded-2xl, rounded-lg, border-gray-200)을
   사무적 스타일로 덮어씌우는 래퍼 */
function CorporateWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="
      [&_div.rounded-2xl]:rounded-none
      [&_div.rounded-xl]:rounded-none
      [&_div.rounded-lg]:rounded-none
      [&_div.rounded-md]:rounded
      [&_div.border-gray-200]:border-gray-300
      [&_div.bg-white]:bg-white
      [&_div.bg-gray-50]:bg-gray-50
      [&_button.rounded-2xl]:rounded-none
      [&_button.rounded-xl]:rounded-none
      [&_button.rounded-lg]:rounded
      [&_button.rounded-md]:rounded
    ">
      {children}
    </div>
  )
}

export default function Goals2Page() {
  const { ledgerName, currentRecName, records: rawRecords, refMonth, canvasId } = useLedgerContext()
  const records = rawRecords ?? []

  const activeMonth = useMemo(() => {
    if (refMonth) return refMonth
    const months = Array.from(new Set(records.map(r => r.date.slice(0, 7)))).sort()
    return months[months.length - 1] ?? new Date().toISOString().slice(0, 7)
  }, [refMonth, records])

  const nextMonth = useMemo(() => shiftMonth(activeMonth, 1), [activeMonth])
  const recordsHref = canvasId ? `/ledger/records?led=${canvasId}` : '/ledger/records'

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* 타이틀 줄 */}
      <div className="flex items-center justify-between px-5 h-12 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-gray-800">{ledgerName ?? '목표'}</h1>
          {currentRecName && <p className="text-[11px] text-gray-400">{currentRecName}</p>}
        </div>
      </div>

      <div className="px-5 py-5 max-w-5xl mx-auto flex flex-col gap-5">

        {/* 모으기 목표 */}
        <div>
          <SectionLabel label="Savings Goals — 모으기 목표" />
          <CorporateWrap>
            <SavingsGoalSection refMonth={activeMonth} ledId={canvasId} />
          </CorporateWrap>
        </div>

        {/* 이번달 다짐 */}
        <div>
          <SectionLabel label="Resolutions — 이번달 다짐" />
          <div className="bg-white border border-gray-300">
            <CorporateWrap>
              <div className="[&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none">
                <ResolutionSection ledId={canvasId} month={activeMonth} />
              </div>
            </CorporateWrap>
          </div>
        </div>

        {/* 월말 회고 */}
        <div>
          <SectionLabel label="Retrospective — 월말 회고" />
          <div className="bg-white border border-gray-300">
            <CorporateWrap>
              <div className="[&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none">
                <RetrospectiveSection ledId={canvasId} month={activeMonth} nextMonth={nextMonth} />
              </div>
            </CorporateWrap>
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
