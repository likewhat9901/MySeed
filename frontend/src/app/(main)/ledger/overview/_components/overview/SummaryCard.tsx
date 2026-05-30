// 현황 요약 카드 — 지출/수입/이체 + 순수지 + 건수 + AVG/DAY + 페이스 예측
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'

type ViewMode = 'week' | 'month' | 'year'

interface Props {
  records: LedgerRecord[]
  expense: number
  income: number
  transfer: number
  prevMonthExpense: number
  prevMonthIncome: number
  refMonth: string
  viewMode: ViewMode
  activeWeekStart?: string
  activeYear?: string
}

function fmtLarge(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `₩${Math.round(n / 10_000).toLocaleString()}만`
  return `₩${n.toLocaleString()}`
}

function pctBadge(curr: number, prev: number) {
  if (prev <= 0) return null
  return Math.round(((curr - prev) / prev) * 100)
}

export default function SummaryCard({ records, expense, income, transfer, prevMonthExpense, prevMonthIncome, refMonth, viewMode, activeWeekStart, activeYear }: Props) {
  const { periodLabel, avgLabel, avgValue, elapsedLabel, projected, projectedLabel } = useMemo(() => {
    const now = new Date()

    if (viewMode === 'week') {
      const base = activeWeekStart ?? now.toISOString().slice(0, 10)
      const start = new Date(base)
      const end = new Date(base)
      end.setDate(start.getDate() + 6)
      const todayStr = now.toISOString().slice(0, 10)
      const baseStr = base
      // 오늘이 이 주 안에 있으면 경과일 = 오늘까지, 아니면 7일
      const elapsedDays = todayStr >= baseStr && todayStr <= `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`
        ? Math.min(Math.floor((now.getTime() - start.getTime()) / 86400000) + 1, 7)
        : 7
      const avg = elapsedDays > 0 ? Math.round(expense / elapsedDays) : 0
      const sm = String(start.getMonth()+1), sd = String(start.getDate())
      const em = String(end.getMonth()+1), ed = String(end.getDate())
      return {
        periodLabel: `${sm}/${sd} ~ ${em}/${ed}`,
        avgLabel: '일평균 지출',
        avgValue: avg,
        elapsedLabel: `${elapsedDays}일 경과`,
        projected: null,
        projectedLabel: null,
      }
    }

    if (viewMode === 'year') {
      const year = Number(activeYear ?? now.getFullYear())
      const isCurrentYear = year === now.getFullYear()
      const elapsedMonths = isCurrentYear ? now.getMonth() + 1 : 12
      const avg = elapsedMonths > 0 ? Math.round(expense / elapsedMonths) : 0
      const projectedVal = isCurrentYear && avg > 0 ? avg * 12 : null
      return {
        periodLabel: `${year}년`,
        avgLabel: '월평균 지출',
        avgValue: avg,
        elapsedLabel: `${elapsedMonths}개월 경과`,
        projected: projectedVal,
        projectedLabel: projectedVal ? '연말 예측' : null,
      }
    }

    // month
    if (!refMonth) return { periodLabel: '', avgLabel: '일평균 지출', avgValue: 0, elapsedLabel: '', projected: null, projectedLabel: null }
    const [y, m] = refMonth.split('-').map(Number)
    const totalDays = new Date(y, m, 0).getDate()
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m
    const elapsedDays = isCurrentMonth ? now.getDate() : totalDays
    const daysLeft = totalDays - elapsedDays
    const avg = elapsedDays > 0 ? Math.round(expense / elapsedDays) : 0
    const projectedVal = isCurrentMonth && avg > 0 ? avg * totalDays : null
    return {
      periodLabel: `${y}년 ${m}월`,
      avgLabel: '일평균 지출',
      avgValue: avg,
      elapsedLabel: `${elapsedDays}일 경과`,
      projected: projectedVal,
      projectedLabel: projectedVal ? `월말 예측 · ${daysLeft}일 남음` : null,
    }
  }, [expense, refMonth, viewMode, activeWeekStart, activeYear])

  const netFlow = income - expense
  const vsExpense = viewMode === 'month' ? pctBadge(expense, prevMonthExpense) : null
  const vsIncome  = viewMode === 'month' ? pctBadge(income,  prevMonthIncome)  : null

  const expenseCount  = records.filter(r => r.type === '지출').length
  const incomeCount   = records.filter(r => r.type === '수입').length
  const transferCount = records.filter(r => r.type === '이체').length

  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5">
      <p className="text-[10px] font-semibold text-gray-400 tracking-widest mb-4">{periodLabel}</p>

      {/* 상단: 지출 / 수입 / 이체 */}
      <div className="flex items-start gap-6 mb-4">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 tracking-widest mb-1.5">지출</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-extrabold text-gray-900 tracking-tight leading-none">{fmtLarge(expense)}</p>
            {vsExpense !== null && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${vsExpense <= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {vsExpense <= 0 ? '↓' : '↑'}{Math.abs(vsExpense)}%
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-1 tabular-nums">{expenseCount}건</p>
        </div>
        <div className="w-px self-stretch bg-gray-100" />
        <div>
          <p className="text-[10px] font-semibold text-gray-400 tracking-widest mb-1.5">수입</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-extrabold text-green-500 tracking-tight leading-none">{fmtLarge(income)}</p>
            {vsIncome !== null && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${vsIncome >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {vsIncome >= 0 ? '↑' : '↓'}{Math.abs(vsIncome)}%
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-1 tabular-nums">{incomeCount}건</p>
        </div>
        <div className="w-px self-stretch bg-gray-100" />
        <div>
          <p className="text-[10px] font-semibold text-gray-400 tracking-widest mb-1.5">이체</p>
          <p className="text-2xl font-extrabold text-blue-400 tracking-tight leading-none">{fmtLarge(transfer)}</p>
          <p className="text-[10px] text-gray-400 mt-1 tabular-nums">{transferCount}건</p>
        </div>
      </div>

      {/* 하단: 순수입 + 평균 + 예측 */}
      <div className="border-t border-gray-100 pt-3 flex items-center gap-4">
        <div className="flex-1">
          <p className="text-[10px] font-semibold text-gray-400 tracking-widest mb-1">순수입</p>
          <p className={`text-base font-bold tabular-nums ${netFlow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {fmtLarge(netFlow)}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">수입 − 지출</p>
        </div>
        <div className="w-px self-stretch bg-gray-100" />
        <div className="flex-1">
          <p className="text-[10px] font-semibold text-gray-400 tracking-widest mb-1">{avgLabel}</p>
          <p className="text-base font-bold text-gray-800 tabular-nums">{fmtLarge(avgValue)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{elapsedLabel}</p>
        </div>
        <div className="w-px self-stretch bg-gray-100" />
        <div className="flex-1">
          <p className="text-[10px] font-semibold text-gray-400 tracking-widest mb-1">
            {viewMode === 'year' ? '연말 예측' : '월말 예측'}
          </p>
          {projected !== null ? (
            <>
              <p className="text-base font-bold text-orange-500 tabular-nums">{fmtLarge(projected)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{projectedLabel}</p>
            </>
          ) : (
            <p className="text-base font-bold text-gray-300">—</p>
          )}
        </div>
      </div>
    </div>
  )
}
