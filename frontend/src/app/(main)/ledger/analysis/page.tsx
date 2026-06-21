// /ledger/analysis — 후회 소비 패턴 분석 탭
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLedgerContext } from '../_context/LedgerContext'
import { getRecord } from '@/features/ledger/record/rpc'
import { usePeriodNav } from './_hooks/usePeriodNav'
import { useRegretAnalysis } from './_hooks/useRegretAnalysis'
import { SectionLabel } from './_components/SectionLabel'
import { PeriodNavBar } from './_components/PeriodNavBar'
import { RegretSummaryCard } from './_components/RegretSummaryCard'
import { InsightCard } from './_components/InsightCard'
import { PatternCard } from './_components/PatternCard'
import { CategorySection } from './_components/CategorySection'
import { TrendSection } from './_components/TrendSection'
import { MoreModal } from './_components/MoreModal'

export default function AnalysisPage() {
  const {
    records: rawRecords, ledgerName,
    currentRecName, setCurrentRecName, currentRecId, setCurrentRecId,
    setRecords, refMonth, setRefMonth,
  } = useLedgerContext()
  const searchParams = useSearchParams()
  const recIdFromUrl = searchParams.get('rec')
  const records = rawRecords ?? []

  const [moreModal, setMoreModal] = useState<'items' | 'categories' | null>(null)

  const nav = usePeriodNav({ records, refMonth, setRefMonth })
  const a = useRegretAnalysis({
    records,
    viewMode: nav.viewMode,
    activeMonth: nav.activeMonth,
    activeYear: nav.activeYear,
  })

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
    <div className="flex flex-col flex-1 overflow-hidden">
      <PeriodNavBar
        ledgerName={ledgerName}
        currentRecName={currentRecName}
        viewMode={nav.viewMode}
        setViewMode={nav.setViewMode}
        navLabel={nav.navLabel}
        canPrev={nav.canPrev}
        canNext={nav.canNext}
        shiftNav={nav.shiftNav}
        activeMonth={nav.activeMonth}
        availableMonths={nav.availableMonths}
        formatMonthLabel={nav.formatMonthLabel}
        setRefMonth={setRefMonth}
        dropdownOpen={nav.dropdownOpen}
        setDropdown={nav.setDropdown}
        dropdownRef={nav.dropdownRef}
      />

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-5 py-5">
        <div className="max-w-5xl mx-auto flex flex-col gap-5">

          {/* ── REGRET SUMMARY ── */}
          <div>
            <SectionLabel label="Regret Summary — 후회 소비" />
            {a.regretCount === 0 ? (
              <div className="bg-white border border-gray-300 px-5 py-4 text-xs text-gray-400">
                후회로 표시된 지출이 없습니다. 내역에서 😞를 체크하면 여기서 분석됩니다.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {/* 요약 카드 — 2열 차지, 좌(핵심 수치) / 우(인사이트) */}
                <div className="col-span-2 bg-white border border-gray-300 flex">
                  <RegretSummaryCard
                    viewMode={nav.viewMode}
                    regretTotal={a.regretTotal}
                    regretCount={a.regretCount}
                    regretPct={a.regretPct}
                    expense={a.expense}
                    expenseCount={a.expenseCount}
                    prevRegret={a.prevRegret}
                    vsRegret={a.vsRegret}
                    cleanDays={a.cleanDays}
                    totalDays={a.totalDays}
                  />
                  <InsightCard
                    viewMode={nav.viewMode}
                    regretTotal={a.regretTotal}
                    vsRegret={a.vsRegret}
                    categoryStats={a.categoryStats}
                    timeStats={a.timeStats}
                    paymentStats={a.paymentStats}
                  />
                </div>

                {/* 패턴 카드 — 1열 */}
                <PatternCard
                  heatmap={a.heatmap}
                  heatMaxCount={a.heatMaxCount}
                  weekdayTotal={a.weekdayTotal}
                  weekendTotal={a.weekendTotal}
                  paymentStats={a.paymentStats}
                />
              </div>
            )}
          </div>

          {/* ── REGRET BY CATEGORY ── */}
          {a.regretCount > 0 && (
            <CategorySection
              categoryStats={a.categoryStats}
              regretItems={a.regretItems}
              onMore={setMoreModal}
            />
          )}

          {/* ── REGRET TREND ── */}
          {a.regretTrend.some(t => t.regret > 0) && (
            <TrendSection
              viewMode={nav.viewMode}
              regretTrend={a.regretTrend}
              vsRegret={a.vsRegret}
              prevRegret={a.prevRegret}
            />
          )}

        </div>
      </div>

      {/* 더보기 모달 */}
      {moreModal && (
        <MoreModal
          kind={moreModal}
          regretCount={a.regretCount}
          regretItems={a.regretItems}
          categoryStats={a.categoryStats}
          onClose={() => setMoreModal(null)}
        />
      )}
    </div>
  )
}
