// 현황 요약 카드 — 좌(지출 큰 숫자) / 우(수입·순수입 + 기간·지출 프로그레스 바 + 예측)
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'

type ViewMode = 'week' | 'month' | 'year'

interface Props {
  records: LedgerRecord[]
  expense: number
  income: number
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

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-gray-400 tabular-nums w-7 text-right">{pct}%</span>
    </div>
  )
}

export default function SummaryCard({ records, expense, income, prevMonthExpense, prevMonthIncome, refMonth, viewMode, activeWeekStart, activeYear }: Props) {
  const { periodLabel, avgValue, elapsedDays, totalDays, daysLeft, projected, isCurrentMonth } = useMemo(() => {
    const now = new Date()

    if (viewMode === 'week') {
      const base = activeWeekStart ?? now.toISOString().slice(0, 10)
      const start = new Date(base)
      const end = new Date(base)
      end.setDate(start.getDate() + 6)
      const todayStr = now.toISOString().slice(0, 10)
      const baseStr = base
      const endStr = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`
      const elapsed = todayStr >= baseStr && todayStr <= endStr
        ? Math.min(Math.floor((now.getTime() - start.getTime()) / 86400000) + 1, 7)
        : 7
      const sm = String(start.getMonth()+1), sd = String(start.getDate())
      const em = String(end.getMonth()+1), ed = String(end.getDate())
      return {
        periodLabel: `${sm}/${sd} ~ ${em}/${ed}`,
        avgValue: elapsed > 0 ? Math.round(expense / elapsed) : 0,
        elapsedDays: elapsed,
        totalDays: 7,
        daysLeft: 7 - elapsed,
        projected: null,
        isCurrentMonth: false,
      }
    }

    if (viewMode === 'year') {
      const year = Number(activeYear ?? now.getFullYear())
      const isCurrentYear = year === now.getFullYear()
      const elapsed = isCurrentYear ? now.getMonth() + 1 : 12
      const avg = elapsed > 0 ? Math.round(expense / elapsed) : 0
      return {
        periodLabel: `${year}년`,
        avgValue: avg,
        elapsedDays: elapsed,
        totalDays: 12,
        daysLeft: 12 - elapsed,
        projected: isCurrentYear && avg > 0 ? avg * 12 : null,
        isCurrentMonth: false,
      }
    }

    // month
    if (!refMonth) return { periodLabel: '', avgValue: 0, elapsedDays: 0, totalDays: 30, daysLeft: 0, projected: null, isCurrentMonth: false }
    const [y, m] = refMonth.split('-').map(Number)
    const total = new Date(y, m, 0).getDate()
    const isCurrent = now.getFullYear() === y && now.getMonth() + 1 === m
    const elapsed = isCurrent ? now.getDate() : total
    const avg = elapsed > 0 ? Math.round(expense / elapsed) : 0
    return {
      periodLabel: `${y}년 ${m}월`,
      avgValue: avg,
      elapsedDays: elapsed,
      totalDays: total,
      daysLeft: total - elapsed,
      projected: isCurrent && avg > 0 ? avg * total : null,
      isCurrentMonth: isCurrent,
    }
  }, [expense, refMonth, viewMode, activeWeekStart, activeYear])

  const vsExpense = viewMode === 'month' ? pctBadge(expense, prevMonthExpense) : null
  const vsIncome  = viewMode === 'month' ? pctBadge(income, prevMonthIncome) : null
  const net = income - expense
  const expenseCount = records.filter(r => r.type === '지출').length
  const savingAmt = prevMonthExpense > 0 ? prevMonthExpense - expense : null

  const periodPct = totalDays > 0 ? Math.round((elapsedDays / totalDays) * 100) : 0
  const budgetPct = income > 0 ? Math.round((expense / income) * 100) : 0

  const cardTitle = viewMode === 'year' ? '올해 한눈에' : viewMode === 'week' ? '이번 주 한눈에' : '이번달 지출'
  const periodUnit = viewMode === 'year' ? '개월' : '일'
  const projLabel  = viewMode === 'year' ? '연말 예측' : '월말 예측'

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex divide-x divide-gray-100">

        {/* 좌측 — 지출 큰 숫자 */}
        <div className="flex-1 px-5 py-5 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 tracking-widest mb-2">{cardTitle}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">{fmtLarge(expense)}</p>
              {vsExpense !== null && (
                <span className={`text-[11px] font-semibold ${vsExpense <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {vsExpense <= 0 ? '▼' : '▲'}{Math.abs(vsExpense)}%
                </span>
              )}
            </div>
            {savingAmt !== null && viewMode === 'month' && (
              <p className={`text-[11px] mt-1 font-medium ${savingAmt >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                {savingAmt >= 0 ? `전월보다 ${fmtLarge(savingAmt)} 절약` : `전월보다 ${fmtLarge(-savingAmt)} 초과`}
              </p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-400">건수</span>
              <span className="font-semibold text-gray-700 tabular-nums">{expenseCount}건</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-400">일평균</span>
              <span className="font-semibold text-gray-700 tabular-nums">{fmtLarge(avgValue)}</span>
            </div>
          </div>
        </div>

        {/* 우측 — 수입/순수입 + 프로그레스 바 + 예측 */}
        <div className="w-44 flex flex-col divide-y divide-gray-100">

          {/* 수입 / 순수입 */}
          <div className="px-4 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">수입</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-bold text-green-500 tabular-nums">{fmtLarge(income)}</span>
                {vsIncome !== null && (
                  <span className={`text-[9px] font-semibold ${vsIncome >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                    {vsIncome >= 0 ? '▲' : '▼'}{Math.abs(vsIncome)}%
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">순수입</span>
              <span className={`text-[12px] font-bold tabular-nums ${net < 0 ? 'text-red-500' : 'text-gray-800'}`}>
                {net < 0 ? `-${fmtLarge(-net)}` : fmtLarge(net)}
              </span>
            </div>
          </div>

          {/* 기간 / 지출 프로그레스 바 */}
          <div className="px-4 py-4 space-y-2.5">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-gray-400">기간</span>
                <span className="text-[10px] text-gray-400 tabular-nums">{elapsedDays}/{totalDays}{periodUnit}</span>
              </div>
              <ProgressBar value={elapsedDays} max={totalDays} color="bg-blue-300" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-gray-400">지출</span>
                <span className="text-[10px] text-gray-400 tabular-nums">{budgetPct}%</span>
              </div>
              <ProgressBar value={expense} max={income} color={budgetPct > periodPct ? 'bg-red-400' : 'bg-emerald-400'} />
            </div>
          </div>

          {/* 예측 */}
          <div className="px-4 py-4">
            <p className="text-[10px] text-gray-400 mb-1">
              {projLabel}{isCurrentMonth && daysLeft > 0 ? ` · ${daysLeft}일 남음` : ''}
            </p>
            {projected !== null ? (
              <p className={`text-[13px] font-bold tabular-nums ${projected > income ? 'text-red-500' : 'text-gray-800'}`}>
                {fmtLarge(projected)}
              </p>
            ) : (
              <p className="text-[13px] font-bold text-gray-300">—</p>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
