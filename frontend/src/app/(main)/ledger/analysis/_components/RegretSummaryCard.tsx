// 분석 탭 — 후회 요약 좌측 패널 (총액·건수 / 비중 바 + 후회 없는 날 / 전월 대비)

import { fmtW } from '../_utils/format'
import type { ViewMode } from '../_hooks/usePeriodNav'

interface Props {
  viewMode:     ViewMode
  regretTotal:  number
  regretCount:  number
  regretPct:    number
  expense:      number
  expenseCount: number
  prevRegret:   number
  vsRegret:     number | null
  cleanDays:    number
  totalDays:    number
}

export function RegretSummaryCard({
  viewMode, regretTotal, regretCount, regretPct, expense, expenseCount,
  prevRegret, vsRegret, cleanDays, totalDays,
}: Props) {
  return (
    <div className="w-1/2 min-w-0 flex flex-col divide-y divide-gray-100 border-r border-gray-200">
      {/* 총액 / 건수 가로 */}
      <div className="px-4 py-3 flex gap-4 flex-1 items-center">
        <div className="flex-1">
          <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400 mb-1">후회 총액</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-extrabold text-red-500 leading-none tabular-nums">{fmtW(regretTotal)}</p>
            {vsRegret != null && (
              <span className={`text-[10px] font-bold tabular-nums ${vsRegret <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {vsRegret <= 0 ? '▼' : '▲'}{Math.abs(vsRegret)}%
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-1 tabular-nums">건당 평균 {fmtW(Math.round(regretTotal / regretCount))}</p>
        </div>
        <div className="flex-1 border-l border-gray-100 pl-4">
          <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400 mb-1">건수</p>
          <p className="text-2xl font-extrabold text-gray-800 leading-none tabular-nums">{regretCount}건</p>
          <p className="text-[10px] text-gray-400 mt-1 tabular-nums">😞 {regretCount}/{expenseCount}건</p>
        </div>
      </div>
      {/* 비중 바 */}
      <div className="px-4 py-3 flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400">전체 지출 중 후회</span>
          <span className="text-[10px] font-bold text-gray-700 tabular-nums">{regretPct}%</span>
        </div>
        <div className="h-2 bg-gray-100">
          <div className="h-full bg-red-400 transition-all" style={{ width: `${Math.min(regretPct, 100)}%` }} />
        </div>
        <p className="text-[9px] text-gray-400 mt-1 tabular-nums">{fmtW(regretTotal)} / 전체 {fmtW(expense)}</p>
        {viewMode === 'month' && totalDays > 0 && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400">후회 없는 날</span>
            <span className="text-[10px] tabular-nums">
              <span className="font-semibold text-gray-700">{cleanDays}일</span>
              <span className="text-gray-300 mx-1">/</span>
              <span className="text-gray-400">{totalDays}일</span>
            </span>
          </div>
        )}
      </div>
      {/* 전월 한 줄 */}
      {viewMode === 'month' && (
        <div className="px-4 py-2.5 flex items-center justify-between">
          <span className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400">전월 대비</span>
          <span className="text-[11px] tabular-nums">
            <span className="text-gray-400">{prevRegret > 0 ? fmtW(prevRegret) : '₩0'}</span>
            <span className="text-gray-300 mx-1">→</span>
            <span className="font-semibold text-gray-800">{fmtW(regretTotal)}</span>
          </span>
        </div>
      )}
    </div>
  )
}
